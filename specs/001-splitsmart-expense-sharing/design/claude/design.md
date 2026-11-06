# SplitSmart — Detailed Design (Claude independent proposal)

**Status**: Draft proposal, AI-generated. Requires human review (Constitution IX).
Labels **[FACT] / [ASSUMPTION] / [PROPOSAL] / [DECISION NEEDED]** are defined in
[architecture.md §0](architecture.md#0-statement-labels). When a section
carries no label, its content is **[PROPOSAL]**.

## 1. Domain model overview

The full field list and constraints are in [data-model.md](data-model.md). The
class diagram is [diagrams/domain-class.puml](diagrams/domain-class.puml).

### 1.1 Value objects (immutable Java `record`s with validating constructors)

| Value object | Invariants |
|---|---|
| `UserId`, `GroupId`, `ExpenseId`, `PaymentId`, `InvitationId`, `NotificationId`, `CommandId` | Wrap a non-null `UUID`. |
| `EmailAddress` | Non-blank and syntactically valid. Stored in normalised form for uniqueness: trimmed, domain lower-cased. Whether the local part is case-sensitive is OQ-37, and the default is case-insensitive. |
| `CurrencyUnit` | An ISO 4217 code plus `minorUnitDigits ≥ 0`. Whether a code is allowed is decided by the configurable `SupportedCurrencies` port. **No list is chosen here** (OQ-03). |
| `Money` | `BigDecimal amount` and `CurrencyUnit currency`. `amount.scale() == currency.minorUnitDigits` always holds. Factory methods reject excess precision. Arithmetic is allowed only between values of the same currency. `toMinorUnits()` and `ofMinorUnits()` convert exactly. |
| `NonNegativeMoney` | A `Money` with `amount ≥ 0` (expense amounts). |
| `PositiveMoney` | A `Money` with `amount > 0` (payments, see OQ-20). |
| `Percentage` | `BigDecimal` in the range (0, 100], with scale ≤ `Percentage.MAX_SCALE`. The scale value is OQ-21; the default is 2. |
| `DateRange` | `LocalDate start ≤ end`, **inclusive on both ends** [FACT, FR-011]. A range where start > end is rejected as invalid. |
| `ParticipantName` | Display-name snapshot that drives tie ordering. Comparison uses `NameOrdering` (§3.4). |
| `SplitMethod` | enum `EQUAL`, `PERCENTAGE` [FACT, FR-004]. |
| `ExpenseStatus` | enum `PENDING`, `APPROVED`, `REJECTED` [FACT, NFR-004]. |
| `ReviewDecision` | enum `APPROVE`, `REJECT`. |
| `MemberRole` | enum `MANAGER`, `MEMBER`. |
| `InvitationStatus` | enum `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED` [FACT, spec edge cases]. |

### 1.2 Aggregates

| Aggregate root | Owns | Invariants that hold at transaction commit |
|---|---|---|
| `UserAccount` | `MfaEnrollment`, `RecoveryCode[]`, `EmailVerificationToken` | The email is unique system-wide. The status is `ACTIVE` only if the email is verified **and** TOTP is confirmed **and** recovery codes have been issued. Recovery codes are single-use. A TOTP time-step is never accepted twice. |
| `Group` | `Membership[]`, `Invitation[]`, `currency`, optional `standingReviewerId` | There is at least one active `MANAGER`. A user who has been invited has no access until their invitation is `ACCEPTED`, and accepting creates the membership atomically. Each user has at most one active membership, and each invitee email has at most one `PENDING` invitation. `currency` cannot change once the group has any expense (OQ-34). |
| `Expense` | `ExpenseShare[]`, `ReceiptRef?`, `ReviewRecord[]` | amount ≥ 0. There is exactly one payer, at least one participant, and no duplicate participants. The payer and all participants were active group members at submission. Shares sum **exactly** to the amount. `PERCENTAGE` splits have percentages summing to exactly 100. `reviewerId ≠ submitterId`. The status follows the state machine in §4.3. Shares are immutable after submission. |
| `Payment` | none | Immutable after creation. `payerId ≠ recipientId`. Both were active members when the payment was recorded. The amount is > 0 and no more than the pair's outstanding debt from payer to recipient at commit time. |
| `PairBalance` (projection) | none | `net` equals the sum of the pair's ledger entries (§5.2). Rows are keyed by the canonical order `(groupId, lowUserId, highUserId)`. |

`LedgerEntry`, `Notification`, `EmailOutboxMessage`, `Session`, and
`ProcessedCommand` are simple records. Each is written within one
aggregate-mutating transaction.

## 2. Use-case catalogue (application `api`)

Every command takes an authenticated `Principal` (§9.4). Mutating commands
also take a `CommandId` (§8.2). Queries return immutable DTO records whose
money fields are `BigDecimal` with the currency's scale, plus the currency
code.

| Service.operation | Requirement | Precondition and authorization | Effect |
|---|---|---|---|
| `AccountService.register(email, password, displayName)` | FR-001 | Not signed in | Account created as `PENDING_VERIFICATION`; verification email queued |
| `AccountService.verifyEmail(token)` | FR-001 | Token valid and not expired | Status becomes `PENDING_MFA` |
| `AccountService.beginMfaEnrollment` / `confirmMfaEnrollment(code)` | FR-001 | Partial session, email verified | TOTP secret stored encrypted; 10 recovery codes returned **once**; status `ACTIVE` |
| `AccountService.signIn(email, password)` → `signInSecondFactor(totp \| recoveryCode)` | FR-001, NFR-001 | Account active and not locked | Full session issued |
| `AccountService.regenerateRecoveryCodes(totp)` | FR-001 | Full session plus fresh TOTP | Old codes invalidated; new codes shown once |
| `AccountService.signOut` | NFR-001 | Session | Session revoked; user counts as "signed out" for FR-007 |
| `GroupService.createGroup(name, currencyCode)` | FR-002 | Full session; currency supported | Group created; caller becomes `MANAGER` |
| `GroupService.invite(groupId, email)` | FR-002 | Caller is MANAGER | `PENDING` invitation; invitation email queued (OQ-26: invitee with no account) |
| `GroupService.accept(invitationId)` / `decline(...)` | FR-002 | Caller's verified email matches the invitation | Membership created, or invitation declined |
| `GroupService.revokeInvitation` | FR-002 | MANAGER | Invitation `REVOKED` |
| `GroupService.removeMember(groupId, userId)` | FR-002 | MANAGER; constraints in OQ-11 and OQ-25 | Membership ends; access revoked |
| `GroupService.setStandingReviewer(groupId, userId?)` | FR-006 | MANAGER | Default reviewer for new expenses (OQ-12) |
| `ExpenseService.previewSplit(groupId, amount, method, participants, percentages?)` | FR-004 | Member | Returns allocation; writes nothing |
| `ExpenseService.submit(SubmitExpenseCommand)` | FR-003–FR-005, FR-007 | Member | `PENDING` expense + notifications + outbox |
| `ExpenseService.designateReviewer(expenseId, reviewerId)` | FR-006 | MANAGER; reviewer is an active member and not the submitter; expense is `PENDING` | `reviewerId` set |
| `ReviewService.approve(expenseId, expectedVersion)` / `reject(expenseId, expectedVersion, reason?)` | FR-006, FR-008 | Caller **is** the expense's designated reviewer | `APPROVED` + ledger posting, or `REJECTED` |
| `PaymentService.record(RecordPaymentCommand)` | FR-009 | Member; caller is payer or recipient (OQ-19) | Payment + ledger + projection |
| `BalanceQueryService.groupBalances(groupId)` / `myBalances()` | FR-008 | Member, or self | Pairwise nets |
| `ExpenseService.list(groupId, page, filter)` / `get(expenseId)` / `getReceipt(expenseId)` | NFR-004, FR-005 | Member | Expense with status, submitter, reviewer, and review outcome |
| `NotificationService.listMine(page)` / `markRead(id)` | FR-007 | Self | |
| `ReportService.groupSummary(groupId, range?)` / `personalSummary(range?)` / `customReport(ReportCriteria)` | FR-010, FR-011 | Member of every group in scope | Report DTO |

## 3. Money and the exact allocation algorithm (FR-004, NFR-002)

### 3.1 Currency scale

- Each group stores a `CurrencyUnit`. `minorUnitDigits` comes from the
  ISO 4217 minor-unit definition. **[PROPOSAL]** The default lookup is
  `java.util.Currency.getInstance(code).getDefaultFractionDigits()`. Codes
  that return `-1` (no minor unit defined) are rejected. Which codes are
  enabled is configuration owned by a human (OQ-03). The design does not
  assume a list.
- **Input rule [PROPOSAL]**: `Money.parse("12.345", USD-like currency with 2 digits)` throws
  `ExcessPrecisionException`. The UI then shows "Amount can have at most 2
  decimal places". No rounding is applied to user input.
- Values with fewer decimal places are scaled up exactly with
  `setScale(digits)` and no rounding mode. For example, `12.3` becomes
  `12.30`.
- Equality and storage always use the normalised scale, so
  `BigDecimal.equals` and `compareTo` agree.
- Upper bound [PROPOSAL, OQ-22]: an expense amount has at most 15 integer
  digits, so `minorUnits` fits in a `long` with headroom. The algorithm below
  uses `BigInteger` throughout, so the bound exists only to keep storage
  portable.

### 3.2 Unified largest-remainder algorithm

Equal and percentage splits use **one** integer algorithm. Every step is
exact; there is no division with a rounding mode except a floor of
non-negative integers.

```
Input:  M  = amount.toMinorUnits()         // BigInteger, M ≥ 0
        participants p_1..p_n (n ≥ 1), each with ParticipantName
        weight W_i (BigInteger, W_i > 0), D = Σ W_i
          EQUAL:      W_i = 1,                         D = n
          PERCENTAGE: s = max scale of the percentages (≤ MAX_SCALE)
                      W_i = pct_i × 10^s  (exact integer, unscaledValue after setScale(s))
                      require D == 100 × 10^s     // "exactly 100%"
Step 1: for each i: (base_i, rem_i) = (M × W_i).divideAndRemainder(D)   // floor, exact
Step 2: L = M − Σ base_i                      // 0 ≤ L < n is guaranteed
Step 3: order participants by (rem_i DESC, NameOrdering(name_i) ASC)
Step 4: the first L participants in that order receive base_i + 1; the rest receive base_i
Step 5: AMBIGUITY CHECK (§3.4): if the L-cut falls strictly inside a run of participants
        with equal rem_i AND identical names → throw AmbiguousAllocationException
Step 6: share_i = Money.ofMinorUnits(base_i (+1), currency)
Postcondition (asserted): Σ share_i == amount, every share_i ≥ 0, every share_i ≤ amount
```

**Why `L < n`:** each `rem_i/D < 1`, so `L = Σ rem_i / D < n`. And `L` is an
integer because `Σ (M·W_i) = M·D`.

**Percentages "supplied with more precision than the currency can represent"
[FACT, spec edge case]:** a percentage's precision is independent of the
currency scale. This algorithm always reconciles at the minor unit, for any
percentage scale up to `MAX_SCALE`. Percentages with scale greater than
`MAX_SCALE` are rejected (OQ-21).

### 3.3 Worked examples (these become unit-test vectors, §12.1)

All examples use a currency with 2 minor digits.

| # | Amount | Method | Participants (name: weight) | base / rem | L | Result |
|---|---|---|---|---|---|---|
| E1 | 1.00 | EQUAL | Alice, Bob, Carol | 33/1 each | 1 | Alice 0.34, Bob 0.33, Carol 0.33 |
| E2 | 10.00 | % | Ann 33.33, Ben 33.33, Cy 33.34 (s=2, D=10000) | 333/3000, 333/3000, 333/4000 | 1 | Ann 3.33, Ben 3.33, **Cy 3.34** (largest remainder) |
| E3 | 0.05 | % | Zed 50, Amy 50 | 2/50, 2/50 (s=0, D=100) | 1 | **Amy 0.03**, Zed 0.02 (alphabetical tie) |
| E4 | 0.00 | EQUAL | A, B | 0/0 | 0 | 0.00, 0.00 (zero expense) [FACT, FR-003] |
| E5 | 100.00 | % | A 33.333, B 33.333, C 33.334 (s=3) | exact floors | 1 | sums to 100.00 |
| E6 | 0.02 | EQUAL | A, B, C | 0/2 each | 2 | A 0.01, B 0.01, C 0.00 |
| E7 | 1.00 | EQUAL | Alex(u1), Alex(u2), Zoe | 33/1 each | 1 | **AmbiguousAllocationException** (cut inside an identical-name run) |
| E8 | 0.99 | EQUAL | Alex(u1), Alex(u2), Zoe | 33/0 each | 0 | no ambiguity: 0.33 each |
| E9 | 10.00 | % | A 60, B 30 | D ≠ 100 | — | `PercentageTotalException` |

### 3.4 Name ordering and the identical-name rule

- **[FACT]** Ties are broken alphabetically by participant name. Identical
  names have no rule yet.
- **[PROPOSAL]** `NameOrdering` uses `java.text.Collator.getInstance(Locale.ROOT)`
  with `TERTIARY` strength, applied to the participant's display name
  captured when the expense is submitted. Two names are "identical" when
  this collator returns 0. Case and accent sensitivity is OQ-02.
- **[PROPOSAL, fail closed]** The design defines an ambiguity *only* when it
  would change who receives a unit (step 5). In that case submission is
  rejected with `AmbiguousAllocationException`. The UI explains that two
  participants share the same name and the system cannot decide who gets
  the leftover cent.
  - This is **not** a tie-break rule. The human-chosen rule from OQ-01 will
    replace the exception, behind the `TieBreakPolicy` seam.
  - Candidate rules for the humans: require unique display names per group;
    order by stable user ID; order by membership join time; let the
    submitter choose; split the leftover differently.
- Shares are allocated at **submission** and stored (ADR-005). Approval
  never recomputes them. A later display-name change therefore cannot
  change approved shares (NFR-002 reconciliation and audit).

### 3.5 Payer semantics [FACT, FR-003/FR-008]

- The payer may also be a participant. In that case the payer's share is
  computed (so the shares reconcile) but creates **no debt**.
- Each participant other than the payer owes their share to the payer.
  Zero-value shares post nothing.
- If the payer is the only participant, the expense is valid and creates no
  debt.

## 4. Expense, review, and approval

Activity: [diagrams/expense-review-activity.puml](diagrams/expense-review-activity.puml) ·
State: [diagrams/expense-state.puml](diagrams/expense-state.puml) ·
Sequence: [diagrams/expense-review-sequence.puml](diagrams/expense-review-sequence.puml)

### 4.1 Submit (one transaction)

1. Authorize: the caller is an active member of `groupId`.
2. If the `CommandId` has already been processed, return the stored result
   (§8.2).
3. Validate:
   - amount ≥ 0 with scale ≤ the currency's digits;
   - date present (OQ-36 covers time zones);
   - description non-blank, length ≤ 500 (proposal);
   - method present;
   - payer and every participant are active members;
   - participants are non-empty and contain no duplicates;
   - for `PERCENTAGE`, one percentage per participant, each in (0, 100] and
     totalling exactly 100.

   All errors are collected into a `ValidationException(fieldErrors)`.
4. Allocate the shares (§3.2).
5. If there is a receipt reference, it must be a `ReceiptRef` returned
   earlier by `uploadReceipt` in this session. The bytes are already in the
   `ReceiptStore` (§10).
6. Set the reviewer: the group's `standingReviewerId` when it is set and is
   not the submitter; otherwise null, which means "awaiting designation"
   (OQ-12).
7. Persist the `Expense` (`PENDING`, version 0).
8. Create in-app notifications for every other active member, and one
   `EmailOutboxMessage` for each of those members who has **no active full
   session at this moment** (§7).
9. Record the `ProcessedCommand` and commit.

### 4.2 Designate reviewer

- Only a MANAGER can designate the reviewer, and only while the expense is
  `PENDING` and has no decision.
- The reviewer must be an active member and must not be the submitter. The
  manager may designate themselves, provided they are not the submitter.
- **[ASSUMPTION]** Re-designation while the expense is still pending is
  allowed. For example, the reviewer was removed from the group.
- A group with no eligible reviewer, such as a one-member group, keeps the
  expense pending indefinitely. The UI shows "No eligible reviewer"
  (OQ-12).

### 4.3 State machine (MVP)

```
            submit
  (none) ──────────► PENDING ──approve (designated reviewer)──► APPROVED  [terminal]
                        │
                        └──────reject (designated reviewer)───► REJECTED  [terminal]
```

- Sub-state of `PENDING`: `reviewerId == null` means awaiting designation;
  otherwise awaiting decision. The UI always shows "Pending" (NFR-004),
  optionally with a "reviewer: X" or "reviewer not yet designated" detail.
- `APPROVED` and `REJECTED` are terminal [PROPOSAL]. "Edit and resubmit a
  rejected expense" [FACT, spec edge case, outcome unspecified] is designed
  as **submitting a new expense** pre-filled from the rejected one, with
  `supersedesExpenseId` pointing back. Both stay in history (OQ-13).
- Editing or withdrawing a pending expense is not required by the sources
  and is not designed (OQ-14).
- Full product: `PENDING` remains until `ApprovalPolicy.isSatisfied(reviews)`.
  Any rejection at a required level moves the expense to `REJECTED`
  [ASSUMPTION, OQ-31].

### 4.4 Approve or reject (one transaction)

1. Load the expense. If `expectedVersion ≠ version`, raise
   `ConcurrentModificationException`, and the UI asks the user to refresh.
2. Authorize with `ApprovalPolicy.canDecide(principal, expense)`. In the MVP
   this means `principal == expense.reviewerId`, which can never be the
   submitter. Anyone else gets `AuthorizationDeniedException`, and nothing
   changes (US2 AS5).
3. Idempotence:
   - same reviewer, same decision, already applied → return the current
     state and write nothing;
   - a different decision on a terminal expense → `IllegalStateTransitionException`.
4. Append a `ReviewRecord(level=1, reviewerId, decision, decidedAt, reason?)`.
5. On **approve**:
   - set status `APPROVED`;
   - for each share where participant ≠ payer and amount > 0, append
     `LedgerEntry(owedBy=participant, owedTo=payer, amount, source=EXPENSE:id)`;
   - lock and update the affected `PairBalance` rows in canonical key order,
     so concurrent transactions cannot deadlock.

   On **reject**: set status `REJECTED`. No ledger entries are written.
6. Commit.
   - **[CONFLICT, see open-questions.md C-1]** US1 AS2 says members are
     notified when an expense is approved, but FR-007 requires notices only
     on submission.
   - **[PROPOSAL]** Also create in-app decision notices for the submitter
     and the participants, behind a feature flag that defaults to on.
     Approval emails are not sent until OQ-15 is decided.

## 5. Balances (FR-008, NFR-002)

Sequence: [diagrams/payment-balance-sequence.puml](diagrams/payment-balance-sequence.puml)

### 5.1 Scope [PROPOSAL, DECISION NEEDED OQ-04]

- **Balances are tracked per group.** Each group has a single currency, so
  this is the only scope where netting needs no FX.
- `myBalances()` shows, for each counterparty, one line per currency, and
  each line itemises the groups behind it. It never nets across currencies.
- Cross-group netting within the same currency is **not** done. That
  decision is OQ-04.

### 5.2 Ledger semantics

- A `LedgerEntry(owedBy=X, owedTo=Y, amount=a)` means "X owes Y a" within
  the group.
- A payment from A to B of `x` is recorded as
  `LedgerEntry(owedBy=B, owedTo=A, x, source=PAYMENT:id)`, a reverse
  obligation. One summation rule therefore covers both expenses and
  payments.
- `net(A→B) = Σ a over entries (A owes B) − Σ a over entries (B owes A)`.
  When `net(A→B) > 0`, A owes B. When it is `< 0`, B owes A. Zero means the
  pair is settled.
- `PairBalance(groupId, low, high).net` stores `net(low→high)`, where `low`
  is the smaller `UserId` by UUID ordering.
- **Only approved expenses and recorded payments** create entries [FACT,
  FR-008]. Pending and rejected expenses never do.
- `BalanceCalculator.fold(entries)` is a pure domain function. It is the
  reference implementation, and the projection is checked against it by a
  reconciliation test (§12.3) and an optional admin consistency check.

## 6. Payments (FR-009)

Activity: [diagrams/payment-settlement-activity.puml](diagrams/payment-settlement-activity.puml)

`RecordPaymentCommand(commandId, groupId, payerId, recipientId, amount, date, description?)`

One transaction:

1. Authorize:
   - the caller is an active member;
   - **[PROPOSAL, OQ-19]** the caller is either the payer or the recipient;
   - payer and recipient are active members, and `payerId ≠ recipientId`.
2. Idempotency check on the `CommandId`.
3. Validate:
   - the amount uses the group currency and has a valid scale;
   - **amount > 0** [PROPOSAL, OQ-20: the spec lists zero and negative
     payments as edge cases but FR-009 does not say they are rejected];
   - the date is present;
   - the description is optional, ≤ 500 characters.
4. **Lock** the `PairBalance(groupId, payer, recipient)` row: pessimistic
   lock, or optimistic version with up to 3 retries (ADR-008). Compute the
   `outstanding = max(0, net(payer→recipient))`.
5. If `amount > outstanding`, raise `OverpaymentException(outstanding)`.
   Nothing is written, so the balance is unchanged [FACT, US2 AS4].
6. Insert the `Payment`, insert the `LedgerEntry` (reverse obligation),
   update `PairBalance.net -= amount`, record the `ProcessedCommand`, and
   commit.
7. Payments are never updated or deleted, and the history is preserved
   [FACT, FR-009]. Corrections are out of scope (OQ-19).

**Concurrency guarantee:** two concurrent payments of 60 against a debt of
100 serialise on the pair row. The second payment sees an outstanding amount
of 40 and is rejected.

## 7. Notifications (FR-007)

Sequence: [diagrams/notification-sequence.puml](diagrams/notification-sequence.puml)

- **Recipients [FACT]:** the *other* active members of the group (FR-007).
  "Remain available in-app to all group members" is read as: every
  recipient's notice persists. The submitter sees the expense in their own
  list, not in a notice (minor conflict C-2, OQ-16).
- **Content:** group name, expense description, submitter display name, and
  a deep-link reference `expenseId`. **[PROPOSAL, OQ-17]** Email bodies leave
  out the amount and the receipt and say "sign in to view details".
- **Signed-out test [PROPOSAL]:** a member is *signed out* when, at the
  moment the submit transaction runs, they have no `Session` with
  `mfaSatisfied ∧ ¬revoked ∧ expiresAt > now ∧ idleExpiresAt > now`. The
  timeout values are OQ-18. Session state lives on the server, so this check
  is exact relative to the commit.
- **Email delivery (transactional outbox, ADR-010):**
  - `EmailOutboxMessage(PENDING)` is written in the submit transaction.
  - `OutboxDispatcher` polls every N seconds, claims messages with
    `nextAttemptAt ≤ now` using a lease, and calls `EmailGateway.send(message, idempotencyKey=messageId)`.
  - On success the message becomes `SENT`. On a transient failure it
    reschedules with exponential backoff plus jitter (proposal: 1 min,
    5 min, 30 min, 2 h, 12 h; at most 6 attempts). On a permanent failure,
    or when attempts run out, it becomes `FAILED`, and an operator-visible
    log line and metric are emitted (OQ-27).
  - Delivery is at-least-once. The gateway idempotency key lets providers
    that support it deduplicate.
- **In-app delivery:** the Swing client polls `NotificationService.unreadCount()`
  every 30 seconds while signed in (proposal) and when its window regains
  focus. Push is a full-product channel.
- Notices remain after sign-in (US3 AS3) because they are persistent rows
  that only `markRead` changes.

## 8. Concurrency, idempotency, duplicate posting (ADR-008)

### 8.1 Optimistic versioning

- `Group`, `Expense`, and `UserAccount` carry `version`. Updates use
  `WHERE id=? AND version=?`, and zero rows updated raises
  `ConcurrentModificationException`.
- Commands that a user decides on, such as review decisions, carry
  `expectedVersion`, so a reviewer never acts on stale data.

### 8.2 Idempotent commands

- The client generates a `CommandId` (UUID v4) **once per user intent**, for
  example when the submit dialog opens, and reuses it on retry.
- `ProcessedCommand(commandId PK, userId, type, resultRef, createdAt)` is
  written in the same transaction as the command's effect.
- A replay with the same ID returns the same result. A replay with the same
  ID but a different user or type is rejected.
- Retention of processed commands is OQ-09.

### 8.3 Duplicate posting prevention

- The constraint `UNIQUE(source_type, source_id, owed_by, owed_to)` on
  `ledger_entry` makes a second approval posting fail at the database, even
  if application logic has a bug.
- A payment has exactly one ledger entry, enforced by
  `UNIQUE(source_type, source_id)` for `PAYMENT`.

### 8.4 Lock ordering

- Inside a transaction, `PairBalance` rows are always locked in ascending
  `(groupId, low, high)` order. Approval may touch up to n−1 pairs.

### 8.5 Invitation races

- Accept and revoke both update the `Group` aggregate version. Whichever
  commits second fails and re-reads.

## 9. Authentication, MFA, sessions, authorization (FR-001, NFR-001, ADR-011)

Sequence: [diagrams/auth-mfa-sequence.puml](diagrams/auth-mfa-sequence.puml)

### 9.1 Credentials

- **Password hashing**: PBKDF2WithHmacSHA256 from the JDK (`SecretKeyFactory`),
  with a per-user 16-byte salt from `SecureRandom` and 600,000 iterations
  (proposal, current OWASP guidance; must be reviewed by a security
  reviewer). Hashes are stored in a self-describing format,
  `pbkdf2-sha256$iter$salt$hash`, so the work factor can be raised later.
  Hashes are compared in constant time with `MessageDigest.isEqual`.
- **Password policy**: minimum 12 characters and a check against a local
  list of common passwords (proposal; thresholds are OQ-29).
- **Email verification**: a random token of 32 bytes from `SecureRandom`,
  base64url-encoded. Only its SHA-256 is stored, it expires after 24 hours
  (proposal), and it is single-use. Re-registering an existing email gives
  the same generic response, so the system does not reveal which emails are
  registered [FACT edge case: identity already in use].

### 9.2 TOTP

- RFC 6238: HMAC-SHA1, a 30-second step, and 6 digits, the de-facto
  interoperable profile for authenticator apps. It is built with JDK
  `javax.crypto.Mac`.
- The secret is 20 random bytes, shown as Base32 together with an
  `otpauth://` URI. Showing it as a QR code would need a library or custom
  encoder (OQ-35). The MVP shows the text secret and the URI.
- Verification accepts a ±1 step window. A step is never accepted twice:
  the account stores `lastAcceptedStep` and rejects any step ≤ it.
- The secret is stored encrypted with AES-256-GCM (JDK) under a key
  supplied by the server environment. Key management is OQ-30.

### 9.3 Recovery codes

- Ten codes, each with 10 random Base32 characters, are shown **once**.
  Only salted hashes are stored (PBKDF2 at lower cost, proposal), and each
  code is single-use.
- Using a recovery code completes sign-in and prompts the user to re-enroll
  or regenerate. When fewer than 3 codes remain, the UI warns the user.
- Account recovery after losing both the authenticator and all recovery
  codes is **not designed**. That policy is OQ-09.

### 9.4 Sessions and principal

- A session token is 32 random bytes. Only its SHA-256 is stored server-side.
- States are `PASSWORD_OK` (MFA pending; allows only second-factor
  operations) and `FULL`. There is an idle timeout and an absolute timeout
  (OQ-18).
- `Principal(userId, sessionId)` is resolved by the server boundary and
  passed to the application services. Swing never constructs a `Principal`.
- Failed password or TOTP attempts are throttled per account and per
  client: after 5 failures in 15 minutes, a temporary lockout with
  increasing delay applies (proposal, OQ-29).

### 9.5 Authorization

`AccessPolicy` is a single application component with explicit methods such
as `requireMember(principal, groupId)`, `requireManager(...)`, and
`requireDesignatedReviewer(...)`.

- Every service method calls it before loading anything else.
- A non-member gets `NotFoundException`, not "forbidden", so the existence
  of a group or expense is not revealed (AC-008).
- Every query is scoped by the `groupId`s the principal belongs to, at
  repository level. For example, `findByGroupAndMember`. Queries never load
  everything and filter afterwards.
- A removed member immediately loses access to the group's data. Whether
  they keep read access to history is OQ-10, and the default is no access.

## 10. Receipts (FR-005, ADR-012)

- `ExpenseService.uploadReceipt(groupId, bytes, declaredName)` runs before
  submission.
- **Validation:**
  - size ≤ `ReceiptPolicy.maxBytes` (value is OQ-08);
  - magic-byte sniffing against `ReceiptPolicy.allowedTypes` (value is
    OQ-08; JDK `ImageIO` can decode PNG, JPEG, GIF, and BMP);
  - `ImageIO.read` must decode the image ("unreadable" edge case);
  - pixel dimensions ≤ a policy limit, to guard against decompression
    bombs.

  Rejections are field errors.
- **Storage:** `ReceiptStore.put(bytes) → contentKey (SHA-256)`. This happens
  outside the DB transaction, because the store is not transactional with
  the DB. The expense row stores `ReceiptRef(contentKey, mediaType, size, width, height)`.
  An upload that never gets committed is an orphan and is swept after a
  grace period (value is OQ-09).
- **Privacy [PROPOSAL, OQ-08]:** re-encode the image to strip EXIF and GPS
  metadata before storing it.
- **Access:** `getReceipt(expenseId)` runs `requireMember` and then streams
  the bytes. There are no public or guessable URLs. Swing shows the image
  scaled in a `JLabel` with an `ImageIcon`, loaded in a SwingWorker.
- A receipt is attached only at submission (FR-005 "submitter attach"), so
  the reviewer sees it.

## 11. Reporting (FR-010, FR-011, NFR-003)

`ReportCriteria(DateRange range, Set<GroupId> groups, Optional<UserId> member, Set<ActivityType> types, Set<ExpenseStatus> statuses)`

| Element | Design |
|---|---|
| Date range | Inclusive `[start, end]` [FACT]. Expenses are matched on `expenseDate`, payments on `paymentDate` [PROPOSAL, OQ-23]. |
| Group filter | Must be a subset of the principal's groups. An empty set means all of my groups. |
| Member filter | Matches activity where the member is the submitter, payer, a participant, or the payment payer or recipient [PROPOSAL, OQ-23]. The member must share the group. |
| Activity types | `EXPENSE`, `PAYMENT`. Balance is a state, not an activity, so it is shown as a summary section. |
| Status filter | Default `APPROVED` for totals. Pending and rejected expenses can be listed and are labelled, but **never** count towards balance totals. |
| Summaries | Per currency: count and total of expenses; my share total; total paid and received; **period net change** per counterparty; **current outstanding balance** (labelled "as of now", from `PairBalance`). Semantics of "balance as of end date" are OQ-23. |
| Empty | "No activity matches these filters" with the filters echoed back [FACT, AC-006]. |
| Export | Not designed [FACT, spec Assumptions]. |

**Performance design:**

- Supporting indexes are in data-model.md §5.
- Totals are computed by aggregate queries in the data store, not by
  loading rows into the JVM.
- Activity lists are paginated (proposal: 50 rows per page).
- Balance views read at most 1,225 `PairBalance` rows.
- Reports never load receipt bytes.

## 12. JUnit 5 test strategy (Constitution VI)

All tests are **proposed**. None exist yet, and nothing here claims any test
passes.

| Layer | Tooling | Isolation |
|---|---|---|
| Domain unit tests | JUnit 5 (`@Test`, `@ParameterizedTest`, `@CsvSource`, `@MethodSource`) | Pure Java with no fakes needed |
| Application service tests | JUnit 5 + in-memory adapters + `FakeClock`, `FakeEmailGateway`, `FakeReceiptStore` | No database, no GUI |
| Adapter contract tests | Abstract JUnit 5 test classes, one concrete subclass per adapter (in-memory now, the real DB later) | Same behavioural contract |
| Concurrency tests | JUnit 5 + `ExecutorService`, `CountDownLatch`, and `@RepeatedTest` | Against the in-memory adapter with real locking, and later the real DB |
| Presenter tests | JUnit 5, presenters only, with fake facades. No `JFrame` is shown. | Constitution VI restricts GUI-dependent tests |
| Performance profile | Maven profile `-Pperf`, JUnit 5 `@Tag("perf")`, excluded from the default build | Seeded dataset |

No property-testing or mocking library is proposed. Hand-written fakes and
seeded randomised `@MethodSource` generators are enough (ADR-017).

### 12.1 `ShareAllocatorTest` (FR-004, NFR-002, SC-002)

- Each example E1–E9 from §3.3 is a parameterised case. The test asserts the
  exact `BigDecimal` and scale of every share.
- `sharesAlwaysSumToAmount`: a seeded random generator runs 10,000 cases
  over amounts, participant counts 1–50, and random percentage vectors that
  sum to 100. Each case asserts Σ = amount, every share ≥ 0, and
  determinism (same input gives same output).
- `percentagesNotTotalling100AreRejected`: 99.99, 100.01, and an empty
  list.
- `negativeOrZeroPercentageRejected`, `excessPercentageScaleRejected`.
- `tieGoesToAlphabeticallyEarlierName`, and the input order does not change
  the result (shuffle invariance).
- `identicalNamesThatAffectCutAreRejected` (E7);
  `identicalNamesNotAffectingCutAreAccepted` (E8).
- `zeroAmountYieldsZeroShares` (E4).

### 12.2 `MoneyTest` / `CurrencyUnitTest` (NFR-002)

- Excess scale is rejected; lower scale is normalised.
- Mixing currencies is rejected.
- A currency with no minor unit is rejected.
- Minor-unit round trip.
- Currencies with 0 and 3 minor digits (parameterised by digits only, with
  no currency list assumed).

### 12.3 Balance and ledger (FR-008, SC-003)

- `pendingExpenseDoesNotChangeBalances`, `rejectedExpenseDoesNotChangeBalances`
  (US2 AS1).
- `approvedExpensePostsOnlyNonPayerShares`, `payerAsParticipantOwesNothingToSelf`.
- `zeroExpenseApprovedChangesNothing` (AC-002).
- `projectionEqualsFoldOfLedger`: random sequences of approvals and payments
  are replayed, and `PairBalance` must equal `BalanceCalculator.fold`.
- `doubleApprovalDoesNotDoublePost`. The ledger unique constraint is tested
  in adapter contract tests.

### 12.4 Review and approval (FR-006, NFR-004)

- `submitterCannotBeDesignatedReviewer`.
- `nonDesignatedMemberCannotApproveOrReject` (US2 AS5): status and balances
  are unchanged.
- `managerWhoIsNotSubmitterMayReview`.
- `staleVersionDecisionRejected`.
- `approveIsIdempotentForSameReviewer`.
- `approveAfterRejectFails`.
- `statusSubmitterAndOutcomeVisibleToMembers`.
- Full product: `MultiLevelPolicyTest.remainsPendingUntilAllLevelsApprove`
  (US2 AS2). This is written when that policy is built, not in the MVP.

### 12.5 Payments (FR-009, AC-005)

- `partialPaymentReducesDebtExactly`, `fullPaymentSettles`.
- `overpaymentRejectedBalanceUnchanged` (US2 AS4).
- `paymentWhenNoDebtRejected`, `zeroAndNegativePaymentRejected` (pending
  OQ-20).
- `paymentToSelfRejected`, `nonMemberCannotRecord`.
- `concurrentPaymentsCannotExceedDebt`: two threads each try 60 against a
  debt of 100, and exactly one succeeds.
- `idempotentRetryRecordsOnce`.
- `historyRetainedAndImmutable`.

### 12.6 Security (FR-001, NFR-001, AC-001, AC-008)

- `TotpTest`: RFC 6238 Appendix B SHA-1 test vectors (8 digits), plus the
  6-digit truncation case and the step-replay rejection.
- `PasswordHasherTest`: verify, wrong password, constant-time path, parsing
  of the stored format.
- `RecoveryCodeTest`: single use; regeneration invalidates the old codes.
- `AccountLifecycleTest`: an account cannot reach business operations
  before email verification and MFA enrollment.
- `AccessPolicyTest`:
  - a non-member gets `NotFound` for group, expense, receipt, report, and
    balances;
  - an invitee before accepting has no access;
  - after removal the user has no access;
  - a signed-out user (revoked session) is rejected.
- `NoFloatingPointMoneyTest`: scans the main source tree for
  `double`/`float`/`Double`/`Float` in money packages. This is a cheap
  guard for Constitution V; human review is still required.

### 12.7 Notifications, reports, performance

- `NotificationServiceTest`:
  - other members get in-app notices;
  - signed-out members get exactly one outbox message each;
  - signed-in members get none;
  - notices persist after sign-in (US3 AS1, AS3).
- `OutboxDispatcherTest`: retry schedule with a fake clock, `FAILED` after
  the maximum attempts, no duplicate sends after a lease expiry race.
- `ReportServiceTest`:
  - inclusive boundaries (activity on start and end dates is included; the
    day before and the day after are excluded);
  - member, group, and type filters;
  - pending expenses are excluded from totals;
  - an empty result;
  - start > end is rejected;
  - a non-member group in the criteria returns `NotFound`.
- `PerformanceProfileTest` (`@Tag("perf")`): seed 50 members, 10,000
  expenses, and payments; run 100 views mixed across group, balance, and
  report; assert that at least 95 complete within 2 s. Time is measured at
  the client facade, so it includes the remote hop in topology B. The
  environment definition is OQ-33.

## 13. Swing presentation design (ADR-015)

- **Passive view + presenter.**
  - A `*View` (a `JPanel` subclass) exposes setters and listener
    registration only.
  - A `*Presenter` holds a facade from `application.api` and turns user
    events into commands. It does no formatting beyond calling
    `MoneyFormat.format(amountDto)`.
  - Presenters have no Swing imports except `SwingWorker` dispatching
    through a `UiExecutor` interface, so tests can run synchronously.
- **Threading:**
  - all facade calls run in a `SwingWorker`;
  - results are applied on the EDT;
  - long lists use `AbstractTableModel` with paging.
- **Screens (MVP):**
  - sign in / register / verify / MFA enrollment;
  - group list;
  - group detail with tabs for members, expenses, balances, payments, and
    notifications;
  - submit expense dialog with a live split preview from `previewSplit`;
  - expense detail showing status, submitter, reviewer, outcome, shares,
    and receipt;
  - review queue;
  - record payment dialog showing "outstanding: X";
  - reports.
- Status badges always display Pending, Approved, or Rejected, plus the
  submitter and the review outcome (NFR-004).

## 14. Error model

| Exception (application `api`) | UI treatment |
|---|---|
| `ValidationException(List<FieldError>)` | Inline field messages |
| `AuthenticationRequiredException` | Return to the sign-in screen |
| `AuthorizationDeniedException` | "You are not allowed to do this". State unchanged |
| `NotFoundException` | "Not found or not accessible" |
| `ConcurrentModificationException` | "This item changed. Refreshing…" |
| `OverpaymentException(outstanding)` | "Maximum payable is X" |
| `AmbiguousAllocationException` | Explains the identical-name situation (OQ-01) |
| `IllegalStateTransitionException` | "Already approved or rejected" |
