# SplitSmart — Final Detailed Design

**Status**: Final design package. Human review required (Constitution IX). No code exists yet.
Related: [architecture.md](architecture.md), [data-model.md](data-model.md), [test-approach.md](test-approach.md), [decisions.md](decisions.md).

## 1. Canonical vocabulary

These names are used everywhere: DTOs, persistence, diagrams and tests (fixes CR-15).

| Concept | Canonical values |
|---|---|
| `ExpenseStatus` | `PENDING_REVIEW`, `APPROVED`, `REJECTED` |
| Reviewer assignment (while `PENDING_REVIEW`) | `UNASSIGNED`, `ASSIGNED` (shown as a sub-state, not a separate status) |
| `ReviewDecision` | `APPROVE`, `REJECT` |
| `SplitMethod` | `EQUAL`, `PERCENTAGE` |
| `MemberRole` | `MANAGER`, `MEMBER` |
| `InvitationStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED` |
| `AccountStatus` | `PENDING_VERIFICATION`, `PENDING_MFA`, `ACTIVE` |
| `SessionLevel` | `PARTIAL` (password checked), `FULL` (second factor checked) |
| `LedgerSource` | `EXPENSE`, `PAYMENT` |
| `NotificationType` | `EXPENSE_SUBMITTED` (MVP only) |
| `OutboxStatus` | `PENDING`, `SENDING`, `SENT`, `FAILED` |

## 2. Domain model

Class diagram: [class.puml](diagrams/class.puml).

### 2.1 Value objects (immutable Java `record`s that validate in their constructors)

| Type | Invariant |
|---|---|
| `UserId`, `GroupId`, `ExpenseId`, `PaymentId`, `InvitationId`, `NotificationId`, `CommandId`, `ReceiptKey` | Wraps a non-null opaque identifier. Typed, so IDs cannot be mixed up. |
| `CurrencyUnit` | Code plus `minorDigits ≥ 0`, obtained only from `SupportedCurrencies` (OD-03) |
| `Money` | `BigDecimal` with `scale == currency.minorDigits`, and a currency. Parsing rejects excess precision instead of rounding. Arithmetic only between the same currency. Exact `toMinorUnits()` and `ofMinorUnits()`. |
| `NonNegativeMoney` | `Money ≥ 0` (expense amount, FR-003) |
| `PositiveMoney` | `Money > 0` (payment amount, *interim* OD-07) |
| `Percentage` | `BigDecimal ≥ 0`, `≤ 100`, `scale ≤ PercentagePolicy.maxScale` (configured, OD-04) |
| `DateRange` | `start ≤ end`, inclusive on both ends (FR-011) |
| `EmailAddress` | Syntactically valid. Normalized form used for uniqueness and matching (OD-15). |
| `ParticipantName` | Name snapshot taken at submission. Its folded key is used by `NameOrdering` (OD-02). |

### 2.2 Aggregates

| Root | Owns | Invariants at commit |
|---|---|---|
| `UserAccount` | `MfaEnrollment`, `RecoveryCode[]` | The email is unique. `ACTIVE` requires a verified email, confirmed TOTP and issued recovery codes. A recovery code is used at most once. A TOTP step is accepted at most once. |
| `Group` | `Membership[]`, `Invitation[]`, `CurrencyUnit`, optional `defaultReviewerId` | There is at least one active manager (OD-16). One active membership per user. One pending invitation per normalized email. No access before acceptance. The currency is fixed once the group is created. |
| `Expense` | `ExpenseShare[]`, `ReviewerAssignment?`, `ReviewRecord?`, `ReceiptKey?` | amount ≥ 0. One payer. At least one distinct participant. Payer and participants were active members at submission. Σ shares = amount. PERCENTAGE splits total exactly 100. Reviewer ≠ submitter. At most one review record in the MVP. Shares are immutable. Status follows §5. |
| `Payment` | — | Immutable. payer ≠ recipient. Both are active members. `0 < amount ≤ outstanding(payer → recipient)` at commit. |
| `LedgerHead` | — | One row per group. Its `sequence` increases with every ledger write and is the serialization point (§9.3). |

`LedgerEntry`, `Notification`, `EmailOutboxMessage`, `Session`, `ProcessedCommand` and `AuditRecord` are append-only or simple records, written inside the owning command's transaction.

### 2.3 Policies (domain or application seams for open decisions)

| Policy | MVP implementation | Open decision |
|---|---|---|
| `ReviewPolicy` | `SingleDesignatedReviewerPolicy` | OD-11 (multi-level) |
| `TieBreakPolicy` | `FailClosedOnIdenticalNames` | OD-01 |
| `NameOrdering` | `FoldedCodePointOrdering` (interim) | OD-02 |
| `PercentagePolicy` | Configured `maxScale`, zero allowed | OD-04 |
| `PaymentPolicy` | Debtor or creditor may record | OD-06 |
| `MembershipRemovalPolicy` | Refuse while involved in open items | OD-14 |
| `SupportedCurrencies` | Configured catalogue, empty by default | OD-03 |

## 3. Application services and use cases

Use-case diagram: [use-case.puml](diagrams/use-case.puml). Every operation takes the authenticated `Principal`. Every mutation also takes a `CommandId`.

| Service.operation | Req | Authorization | Effect |
|---|---|---|---|
| `AccountService.register(email, password, displayName)` | FR-001 | Anonymous, rate limited | `PENDING_VERIFICATION`. A verification email is put in the outbox. |
| `AccountService.verifyEmail(token)` | FR-001 | Valid, unexpired, unused token | `PENDING_MFA` |
| `AccountService.beginMfa()` / `confirmMfa(code)` | FR-001 | `PARTIAL` session, email verified | Encrypted secret stored. Recovery codes shown **once**. `ACTIVE`. |
| `AuthService.signIn(email, password)` → `secondFactor(totp \| recoveryCode)` | FR-001, NFR-001 | Rate limited. Uniform errors. | `PARTIAL`, then `FULL` session |
| `AuthService.regenerateRecoveryCodes(totp)` / `signOut()` | FR-001 | `FULL` session | Old batch invalidated, or session revoked |
| `GroupService.create(name, currencyCode)` | FR-002 | `FULL` session. The currency is supported. | Group created. Caller becomes `MANAGER`. |
| `GroupService.invite / revoke / remove(...)` | FR-002 | Manager | Invitation or membership changes |
| `GroupService.accept / decline(invitationId)` | FR-002 | Verified email matches the invitation | Membership created, or invitation declined |
| `GroupService.setDefaultReviewer(groupId, userId?)` | FR-006 | Manager | Prefill value only (HD-06) |
| `ReceiptService.upload(groupId, bytes, mediaType)` | FR-005 | Active member | `ReceiptKey` (not yet linked to an expense) |
| `ExpenseService.previewSplit(...)` | FR-004 | Active member | Allocation result. No writes. |
| `ExpenseService.submit(SubmitExpense)` | FR-003–FR-005, FR-007 | Active member | `PENDING_REVIEW`, shares, notices, outbox rows |
| `ReviewService.designateReviewer(expenseId, reviewerId, expectedVersion)` | FR-006 | Manager. Reviewer eligible. Expense pending and undecided. | `ReviewerAssignment` set or replaced (OD-10) |
| `ReviewService.approve / reject(expenseId, expectedVersion, reason?)` | FR-006, FR-008 | Caller **is** the assigned reviewer | Terminal status. Approval also posts to the ledger. |
| `PaymentService.record(RecordPayment)` | FR-009 | `PaymentPolicy` | Payment and counter-posting |
| `BalanceQuery.group(groupId)` / `mine()` | FR-008 | Member, or self | Pairwise nets |
| `ExpenseQuery.list / get`, `ReceiptService.read(expenseId)` | NFR-004, FR-005 | Member | Status, submitter, reviewer, outcome. Receipt bytes. |
| `NotificationQuery.mine()` / `markRead(id)` | FR-007 | Self | |
| `ReportService.groupSummary / personalSummary / custom(ReportCriteria)` | FR-010, FR-011 | Member of every group in scope | Report DTO |

## 4. Money and the split algorithm (FR-004, NFR-002)

### 4.1 Currency scale

`minorDigits` comes only from the approved `SupportedCurrencies` configuration (OD-03). No list and no metadata source is assumed. Input such as `12.345` for a 2-digit currency is **rejected** (`ExcessPrecision`). Input with fewer digits is scaled exactly (`12.3` → `12.30`). There is no rounding mode anywhere in the money path. Amount bounds are configuration (OD-03).

### 4.2 Unified largest-remainder algorithm

```
Input:  M = amount.toMinorUnits()                      // BigInteger, M ≥ 0
        participants p_1..p_n, n ≥ 1, distinct
        weights:  EQUAL       W_i = 1, D = n
                  PERCENTAGE  s = max scale used; W_i = pct_i × 10^s (exact integer, ≥ 0)
                              require pct_i ≥ 0 and Σ W_i == 100 × 10^s   // exactly 100 %
1. (base_i, rem_i) = (M × W_i) divideAndRemainder D   // exact floor
2. L = M − Σ base_i                                   // integer, 0 ≤ L < n
3. sort by (rem_i DESC, NameOrdering.key(name_i) ASC)
4. if 0 < L < n and sorted[L−1].rem == sorted[L].rem
      and key(sorted[L−1]) == key(sorted[L])  → AmbiguousAllocation   // fail closed, OD-01
5. sorted[0..L−1] receive base_i + 1; the others receive base_i
6. share_i = Money.ofMinorUnits(...)
Postcondition (asserted): Σ share_i == amount, and 0 ≤ share_i ≤ amount
```

- `L < n` because each `rem_i < D` and `Σ rem_i = L × D`. That identity also means a participant with `rem_i = 0` (for example a 0% share) never receives an extra unit.
- Ambiguity (step 4) exists **only** when identical names fall on both sides of the cut. Identical names that end up on the same side of the cut do not change the result and are accepted.
- Percentage precision is independent of currency scale. The algorithm reconciles for any allowed `s`.
- Shares are computed **at submission** and stored with the name snapshot and rank. Approval never recomputes them.

### 4.3 Test vectors (2-digit currency; they become `ShareAllocatorTest`, see test-approach.md T-MNY)

| # | Amount | Method and input | Expected |
|---|---|---|---|
| V1 | 1.00 | EQUAL Alice, Bob, Carol | Alice 0.34, Bob 0.33, Carol 0.33 |
| V2 | 10.00 | % Ann 33.33, Ben 33.33, Cy 33.34 | Ann 3.33, Ben 3.33, Cy 3.34 (largest remainder) |
| V3 | 0.05 | % Zed 50, Amy 50 | Amy 0.03, Zed 0.02 (alphabetical tie) |
| V4 | 0.00 | EQUAL A, B | 0.00, 0.00. Approval posts nothing. |
| V5 | 0.02 | EQUAL A, B, C | A 0.01, B 0.01, C 0.00 |
| V6 | 1.00 | EQUAL Alex(u1), Alex(u2), Zoe | `AmbiguousAllocation` |
| V7 | 0.99 | EQUAL Alex(u1), Alex(u2), Zoe | 0.33 each (no leftover, no ambiguity) |
| V8 | 1.00 | EQUAL Aaron, Alex(u1), Alex(u2) | Aaron 0.34, both Alex 0.33 (cut is not inside the identical run) |
| V9 | 10.00 | % A 60, B 30 | `PercentageTotalInvalid` |
| V10 | 10.00 | % A 100, B 0 | A 10.00, B 0.00 (0% accepted, interim OD-04) |
| V11 | 30.00 | EQUAL payer P, A, B | 10.00 each. Ledger: A→P 10.00, B→P 10.00. P's share is not posted. |
| V12 | 5.00 | EQUAL payer P only | P 5.00. No ledger entries. |
| V13 | −1.00 | any | `NegativeAmount` |
| V14 | 12.345 | any | `ExcessPrecision` |
| V15 | 10.00 | % A −10, B 110 | `InvalidPercentage` |

V3 and V8 also depend on the interim `NameOrdering` (OD-02) and must be re-confirmed when OD-02 is decided.

## 5. Expense lifecycle and review (FR-006, NFR-004)

State diagram: [state-expense.puml](diagrams/state-expense.puml). Activity diagram: [activity-expense-review.puml](diagrams/activity-expense-review.puml). Sequence diagram: [sequence-expense-review.puml](diagrams/sequence-expense-review.puml).

```
[submit] → PENDING_REVIEW{UNASSIGNED} --designate--> PENDING_REVIEW{ASSIGNED}
PENDING_REVIEW{ASSIGNED} --re-designate (OD-10)--> PENDING_REVIEW{ASSIGNED}
PENDING_REVIEW{ASSIGNED} --approve--> APPROVED   (terminal; posts once)
PENDING_REVIEW{ASSIGNED} --reject-->  REJECTED   (terminal; posts nothing)
```

**Submit** (one transaction):
1. Idempotency check.
2. Principal is an active member.
3. Validate amount, currency and date. The description is non-blank.
4. Payer and participants are distinct active members.
5. Allocate (§4).
6. If `receiptKey` is present, it was uploaded by this user for this group and is not yet linked.
7. Insert the expense (`PENDING_REVIEW`, `UNASSIGNED`) and its shares.
8. Write notices and outbox rows (§8).
9. CAS on the group version (serializes against membership removal).
10. Write the processed command and audit record. Commit.

**Designate**: the caller is the manager. The reviewer is an active member and ≠ submitter. The status is `PENDING_REVIEW` with no review record. Version check, then audit. If the group has a `defaultReviewerId`, the UI **prefills** it, and the manager still submits `designateReviewer` for that expense (HD-06). The decision authority check reads only the expense's assignment, never the group default.

**Approve** (one transaction):
1. Idempotency check.
2. The expense is `PENDING_REVIEW`, has an assignment, and `principal == assignedReviewer`. The submitter can never pass this check because designation already excludes them.
3. Compare `expectedVersion`.
4. Acquire `LedgerHead(group)`.
5. Insert `ReviewRecord(level=1, APPROVE)` and set the status to `APPROVED`.
6. For each share where participant ≠ payer and share > 0, insert `LedgerEntry(EXPENSE, expenseId, debtor=participant, creditor=payer, share)`.
7. Bump the head and update the projection if one is enabled.
8. Write the processed command and audit record. Commit.

The unique constraint on `(EXPENSE, expenseId, debtor, creditor)` makes a double posting impossible even if the logic has a bug.

**Reject**: same checks as approve, then `ReviewRecord(REJECT, reason?)` and status `REJECTED`. No ledger writes and no `LedgerHead` acquisition.

**Concurrency**: two decisions on one expense both read version v, and only one CAS succeeds. The other gets `StaleState` and re-reads a terminal state, which produces `AlreadyDecided`.

**Terminal**: no transition leaves `APPROVED` or `REJECTED`. Correction is open (OD-09).

**Full product**: `ReviewPolicy.isComplete(expense)` will evaluate the configured levels. `review_record.level` is reserved (OD-11).

## 6. Ledger and balances (FR-008, NFR-006)

- `LedgerEntry(debtor, creditor, amount > 0, source, sourceId, effectiveDate, sequence)` is append-only. It has no update or delete path.
- `net(A→B) = Σ entries(debtor=A, creditor=B) − Σ entries(debtor=B, creditor=A)` within a group (interim per-group scope, OD-05).
- `outstanding(A→B) = max(0, net(A→B))`.
- Balance views compute nets from the ledger with grouped sums over the `(group, debtor, creditor)` index. A group has at most 1,225 pairs for 50 members.
- Optional projection (OD-22): `PairBalance(group, low, high, net)`, updated in the same transaction as each ledger write, and rebuildable with `rebuildProjection(group)`. A test compares the projection with the ledger.
- Pending and rejected expenses never appear in the ledger, so they cannot affect balances.

## 7. Payments (FR-009)

Activity diagram: [activity-payment-settlement.puml](diagrams/activity-payment-settlement.puml). Sequence diagram: [sequence-payment-settlement.puml](diagrams/sequence-payment-settlement.puml).

`RecordPayment(commandId, groupId, payer(debtor), recipient(creditor), amount, date, description?)`, in one transaction:
1. Idempotency check. A replay returns the stored result.
2. `PaymentPolicy`: the principal is the payer or the recipient (interim OD-06). Both are active members, and payer ≠ recipient.
3. `PositiveMoney` in the group currency with exact scale (zero or negative is rejected, interim OD-07).
4. Acquire `LedgerHead(group)`.
5. Compute `outstanding(payer → recipient)` from the ledger **after** acquiring the head.
6. If `amount > outstanding`, return `OverpaymentRejected(outstanding)` and roll back. Nothing is written, and the command is not recorded, so a corrected retry with a new command ID is evaluated fresh.
7. Insert `Payment` and one `LedgerEntry(PAYMENT, paymentId, debtor=recipient, creditor=payer, amount)`. This counter-posting reduces the payer's net debt by exactly `amount`.
8. Bump the head, update the projection if enabled, write the processed command and audit record. Commit.

Two concurrent payments that each fit but together exceed the debt are serialized by the head. The second one re-reads the reduced debt and is rejected. Payments are never edited or deleted (OD-08).

## 8. Notifications and outbox (FR-007)

Sequence diagram: [sequence-notification.puml](diagrams/sequence-notification.puml).

**At submission (in the submit transaction):**
- Recipients = active members of the group at the transaction snapshot, excluding the submitter (interim OD-13).
- For each recipient, insert `Notification(EXPENSE_SUBMITTED, recipient, group, expense)` with `UNIQUE(recipient, expense, type)`.
- **Signed-out test** (interim OD-12): the recipient is *signed in* if a `Session` exists with level `FULL`, not revoked, and with `idleExpiresAt` and `absoluteExpiresAt` both later than the transaction instant. Otherwise they are signed out, and an `EmailOutboxMessage(kind=EXPENSE_SUBMITTED, notificationId)` is inserted with `UNIQUE(notification_id, kind)`. Session lifetimes are security configuration (OD-18).
- A sign-in that commits at the same instant may or may not be seen by the snapshot. This is acceptable because the in-app notice always exists.

**Dispatcher (server background task, after commit):**
1. Select rows that are `PENDING` with `nextAttemptAt ≤ now`, or `SENDING` with an expired lease.
2. Claim with CAS: `status=SENDING, leaseUntil=now+lease, attempts+1 WHERE id=? AND (status, leaseUntil) unchanged`.
3. `EmailGateway.send(messageId=row.id, ...)`.
4. `Accepted` → `SENT`. `Transient` → `PENDING` with a backoff `nextAttemptAt`. `Permanent`, or attempts at the configured maximum → `FAILED`, with a secret-free error category. Operators see `FAILED` rows (OD-19).

Delivery is at-least-once. A lease expiry can cause a duplicate send. The provider idempotency key reduces that where the provider supports it. Email content is minimal: group name, a "new expense" prompt, and a link to sign in. It contains no receipt, secrets or tokens. The exact content is OD-19.

The same outbox carries account-verification emails. Invitation email is not sent in the interim (OD-15).

## 9. Concurrency, idempotency and duplicate prevention (NFR-006)

### 9.1 Optimistic versions
`Group`, `Expense` and `UserAccount` carry `version`. Writes use `WHERE id=? AND version=?`. Zero rows updated means `StaleState`. Review commands carry `expectedVersion` from the screen the reviewer saw.

### 9.2 Idempotent commands
- The client creates a `CommandId` once per user intent (for example when the dialog opens) and reuses it on every retry.
- `processed_command(command_id PK, user_id, command_type, request_fingerprint, result_ref, created_at)` is written in the same transaction as the effect.
- Same ID with the same user, type and fingerprint: return the stored result. Same ID with any difference: `IdempotencyConflict`.
- Two concurrent duplicates: the primary-key violation rolls back the second transaction, which then reads and returns the first result.
- Failed commands (validation, authorization, overpayment) are not recorded, because they changed nothing.

### 9.3 Ledger serialization
Every transaction that writes the ledger (approve, payment) and every membership removal acquires `LedgerHead(group)`. It does this with a row lock or with a compare-and-set on `sequence`, depending on what the chosen store supports (OD-23). With CAS, a failed update rolls back, and the server retries a bounded number of times before returning `Conflict`. This one serialization point per group replaces pair-lock ordering (RJ-13).

### 9.4 Membership races
- Submit, invite-accept and remove all CAS the group version, so a removal cannot interleave with a submission.
- Removal also acquires the ledger head and checks `MembershipRemovalPolicy` (no nonzero balance, no involvement in a pending expense), so a concurrent approval cannot create a balance for a member who is being removed.
- Accept and revoke of the same invitation: the second commit fails its version check.

### 9.5 Uniqueness backstops
Ledger source postings, one payment posting, notifications, outbox rows per notification, pending invitations, active memberships, account emails and review records per level are all enforced by database unique constraints (data-model.md §6).

## 10. Authentication, MFA, sessions and authorization (FR-001, NFR-001)

All algorithms and parameters below are **requirements for security review**. None is approved (OD-18).

- **Registration**: normalized unique email. The password is hashed by `PasswordHasher` (salted, adaptive, memory- or iteration-hard, chosen by the security reviewer). `needsRehash` allows parameters to be upgraded. Verification tokens are random, single-use and time-limited, and stored only as hashes.
- **TOTP**: compatible with RFC 6238 authenticator apps. Digits, period and acceptance window are configured. The secret is encrypted by `SecretCipher` with a `keyId` (key custody and rotation in OD-18). **Replay**: a code is accepted only if its time step is greater than `lastAcceptedStep`, which is updated with CAS in the same transaction.
- **Recovery codes**: generated with a cryptographically secure random generator, shown once, stored as verifiers. Consumption is atomic (`UPDATE … WHERE used_at IS NULL`). Regenerating invalidates the previous batch. Every use is audited. The count and the "both factors lost" account-recovery flow are open (OD-18).
- **Sign-in**: password → `PARTIAL` session (short-lived; it allows only the second-factor step) → TOTP or recovery code → `FULL` session. Errors are uniform, so they do not reveal whether an account exists.
- **Rate limiting** on sign-in, second factor, verification, recovery and registration, per account and per source. Thresholds are configured (OD-18).
- **Sessions**: opaque random tokens, stored hashed on the server, with idle and absolute expiry (values in OD-12 and OD-18). Revoked on sign-out, password change and MFA reset. The client keeps the token in memory only.
- **Authorization**: `AccessPolicy` is called by every service:

| Rule | Checked by |
|---|---|
| A `FULL` session is required for every non-auth operation | API adapter |
| Self-only access to account data and notifications | `AccessPolicy.self` |
| Active member of the group for any group or expense read, including receipts and reports | `AccessPolicy.member` |
| Manager for invite, remove, designate and default reviewer | `AccessPolicy.manager` |
| Assigned reviewer for approve and reject | `ReviewPolicy` |
| Payer or recipient for a payment | `PaymentPolicy` |

A resource in a group the caller cannot access returns `NotFound`, so its existence is not revealed.

- **Audit**: sign-in success and failure, MFA changes, recovery-code use, membership changes, designation, decisions and payments. Each record has actor, time, target and command ID.
- **Logging**: passwords, TOTP secrets and codes, recovery codes, session or verification tokens and receipt bytes are never logged. A logging filter and tests enforce this (T-SEC-09).

## 11. Receipts (FR-005)

- **Upload**: active member. Size must be within the configured limit, and the declared media type must be in the configured allowlist. Both values are required configuration with no approved defaults (OD-17). Bytes go to `ReceiptStore.put`, and a `receipt_upload(key, uploader, group, created_at, expense_id NULL)` row is recorded. The content is not transformed (scanning and metadata stripping are OD-17).
- **Link**: the submit transaction sets `expense_id` on that upload row, provided it is still unlinked and belongs to the same uploader and group.
- **Read**: `AccessPolicy.member(expense.group)`, then `ReceiptStore.get`. The server returns the bytes with the stored media type. No direct or public object URL exists. A missing object returns `ReceiptUnavailable`.
- **Orphans**: unlinked uploads older than a configured age are reported for cleanup. They are not deleted automatically until retention is decided (OD-17, OD-26).

## 12. Error model

Typed errors cross the boundary. There are no success-shaped defaults.

`ValidationFailed(field, code)` with codes `NegativeAmount`, `ExcessPrecision`, `InvalidPercentage`, `PercentageTotalInvalid`, `NoParticipants`, `DuplicateParticipant`, `NotActiveMember`, `UnsupportedCurrency`, `InvalidDateRange`, `ReceiptTooLarge`, `ReceiptTypeNotAllowed`.
Domain errors: `AmbiguousAllocation(names)`, `ReviewerIneligible`, `NotAssignedReviewer`, `AlreadyDecided`, `OverpaymentRejected(outstanding)`, `RemovalBlocked(reason)`.
Other errors: `NotAuthenticated`, `MfaRequired`, `Forbidden`, `NotFound`, `StaleState`, `Conflict`, `IdempotencyConflict`, `RateLimited`, `ReceiptUnavailable`.

## 13. Reporting (FR-010, FR-011, NFR-003)

- `ReportCriteria(dateRange?, groupIds ⊆ caller's groups, memberId?, activityTypes ⊆ {EXPENSE, PAYMENT}, expenseStatuses?)`.
- Expenses are filtered by `expenseDate` and payments by `paymentDate`. Both are calendar dates with no time zone conversion (interim OD-20). Both ends of the range are inclusive.
- The member filter matches an expense where the member is payer or participant, and a payment where the member is payer or recipient.
- **Summaries**: count and total by status (only `APPROVED` totals count as balance-affecting), payment count and total, and current pairwise balances labelled "current" (OD-20). Totals are always per group and currency, never summed across currencies.
- An empty result returns an explicit empty report. If start is after end, the error is `InvalidDateRange`.
- Lists are paged. Queries use the indexes in data-model.md §7. NFR-003 is measured according to test-approach.md §9.

## 14. Swing UI boundary (Constitution II, IV)

- Views (Swing components) → presenters (plain Java, with no Swing types in their API) → `ServerGateway` (contract interfaces).
- Server calls run off the event dispatch thread through `SwingWorker`. Results are posted back to the event dispatch thread.
- Money fields are parsed into `BigDecimal` from text by the contract mapper. The presenter never computes shares. The split preview calls `previewSplit` on the server.
- The UI always shows status, submitter, assigned reviewer and outcome (NFR-004). It shows the `AmbiguousAllocation` explanation and the overpayment limit when those errors occur.
- Presenters are unit-tested with a fake `ServerGateway`. Tests that need Swing are limited to wiring (Constitution VI).
