# Proposed Data Model

**Status:** Logical model; relational database implementation is not selected by source  
**Currency invariant:** Each group has exactly one currency. There is no FX conversion.

## 1. Entity and value-object inventory

| Entity/value object | Key fields | Relationships and purpose |
|---|---|---|
| `Account` | `accountId`, normalized unique `email`, `emailVerifiedAt?`, `passwordVerifier`, `totpSecretCiphertext?`, `mfaEnrolledAt?`, `createdAt`, `disabledAt?`, `version` | Owns authentication and profile identity. Email normalization and password/MFA policy require approval. |
| `RecoveryCode` | `recoveryCodeId`, `accountId`, `verifier`, `createdAt`, `consumedAt?`, `invalidatedAt?` | One account has multiple one-use codes; plaintext is revealed once and never persisted. |
| `Group` | `groupId`, `name`, `currencyCode`, `createdByAccountId`, `createdAt`, `version`, `archivedAt?` | Owns group currency and relationships to memberships, invitations, expenses, payments. Currency scale comes from an approved currency policy. |
| `Membership` | `membershipId`, `groupId`, `accountId`, `role`, `joinedAt`, `removedAt?`, `version` | Unique active `(groupId, accountId)`; manager/participant role. Number of managers and historical access after removal are unresolved. |
| `Invitation` | `invitationId`, `groupId`, `invitedBy`, `inviteeIdentity`, `state`, `createdAt`, `acceptedAt?`, `declinedAt?`, `revokedAt?`, `acceptanceVerifier` | Pending invitation does not grant access. Delivery identity, matching, expiration, and identity field format require a decision. |
| `Expense` | `expenseId`, `groupId`, `submitterId`, `payerId`, `amount`, `currencyCode`, `occurredOn`, `description`, `splitMethod`, `status`, `submittedAt`, `reviewerId`, `reviewedAt?`, `reviewOutcome?`, `version`, `idempotencyKey` | Aggregate root for an expense. Group currency must match. One payer; at least one participant; exactly one MVP reviewer distinct from submitter. |
| `ExpenseShare` | `expenseId`, `participantId`, `percentage?`, `allocatedAmount`, `currencyCode`, `allocationOrder` | Child of expense; unique participant per expense; immutable after submit. Percentage exists only for percentage split; shares sum exactly to expense amount. |
| `ReceiptReference` | `receiptId`, `expenseId`, `opaqueObjectKey`, `contentMetadata`, `uploadedAt`, `uploadedBy`, `state` | Optional one-or-more? source only says optional image, not count; model one receipt initially is a recommendation needing confirmation. No type/size policy is implied by `contentMetadata`. |
| `ExpenseReview` | `reviewId`, `expenseId`, `reviewerId`, `outcome`, `decidedAt`, `reason?`, `requestKey` | Exactly one decisive review in MVP. Reason and future review history semantics need decision. |
| `BalanceEntry` | `entryId`, `groupId`, `sourceType`, `sourceId`, `debtorId`, `creditorId`, `amount`, `currencyCode`, `direction`, `createdAt` | Immutable financial ledger posting. Unique source/direction/member key prevents duplicate posting. Positive obligation means debtor owes creditor. |
| `Payment` | `paymentId`, `groupId`, `debtorId`, `creditorId`, `amount`, `currencyCode`, `occurredOn`, `description?`, `recordedBy`, `recordedAt`, `idempotencyKey` | Immutable recorded payment; `debtorId != creditorId`; amount must be positive and no greater than current positive net debt (zero/negative validation is proposed). |
| `BalancePosition` | `groupId`, `accountAId`, `accountBId`, `netAmount`, `currencyCode`, `updatedAt`, `version` | Optional read projection, not source of truth. Canonical sorted pair; sign says which direction is owed. Must be transactionally updated and reconcilable to ledger. |
| `Notification` | `notificationId`, `groupId`, `expenseId`, `recipientId`, `kind`, `createdAt`, `readAt?`, `eventKey` | Persistent in-app notification. Authorization checked on read; unique `(eventKey, recipientId, channel)`. |
| `OutboxMessage` | `outboxId`, `eventKey`, `channel`, `recipient`, `payloadReference`, `state`, `attemptCount`, `nextAttemptAt`, `deliveredAt?`, `lastErrorCategory?` | Durable email/delivery intent. Do not store credentials or receipt bytes in payload. |
| `AuditEvent` | `auditEventId`, `actorId?`, `groupId?`, `targetType`, `targetId`, `action`, `outcome`, `occurredAt`, `correlationId`, minimal `metadata` | Append-only audit for security/financial transitions; no secrets or unneeded personal data. |

## 2. Enumerations and value objects

- `ExpenseStatus`: `PENDING_REVIEW`, `APPROVED`, `REJECTED`.
- `ReviewOutcome`: `APPROVED`, `REJECTED`.
- `SplitMethod`: `EQUAL`, `PERCENTAGE`.
- `InvitationState`: `PENDING`, `ACCEPTED`, `DECLINED`, `REVOKED`. Expiry is intentionally absent until specified.
- `MembershipRole`: `MANAGER`, `MEMBER`; role multiplicity/transfer rules are unresolved.
- `Money`: exact `BigDecimal` amount plus currency code and currency scale policy. No binary floating point.
- `Percentage`: nonnegative `BigDecimal` percent. Precision and normalization policy require decision; all percentages must sum numerically to exactly 100.
- `PairwisePosition`: canonical member pair, signed net amount, group currency. Positive direction means the canonical first/second relationship specified by the implementation; API/UI must display debtor and creditor unambiguously.

## 3. Relationships

```text
Account 1 ── * Membership * ── 1 Group
Group 1 ── * Invitation
Group 1 ── * Expense 1 ── * ExpenseShare * ── 1 Account
Expense 1 ── 0..1 ReceiptReference
Expense 1 ── 0..1 ExpenseReview (MVP: one final review)
Group 1 ── * Payment
Approved Expense / Payment 1 ── * BalanceEntry
Group + AccountPair 1 ── 0..1 BalancePosition (derived)
Expense submission 1 ── * Notification / OutboxMessage
Security and financial transitions 1 ── * AuditEvent
Account 1 ── * RecoveryCode
```

## 4. Validation and persistence constraints

### Account and group

- Unique normalized email across accounts; exact normalization/case-folding rules are a human decision.
- Unverified accounts cannot perform protected operations.
- Every expense/payment currency equals its group currency.
- Only active group membership grants group data access. Whether removed members retain historical access is unresolved; default authorization must fail closed until decided.
- An invitation in `PENDING` cannot create access. Acceptance and membership insertion are atomic and idempotent.

### Expense and shares

- `amount >= 0`; amount is exactly representable at the approved currency scale.
- `payerId` and every distinct `participantId` are eligible group members at submission; participant list is nonempty.
- Exactly one reviewer is designated in the MVP; reviewer is an eligible group member and is not `submitterId`.
- `PENDING_REVIEW` has no balance postings. `REJECTED` has no balance postings. `APPROVED` has exactly one complete posting set for its source expense.
- Shares are nonnegative, currency-matched, and sum exactly to total amount.
- Equal shares use quotient/remainder allocation in alphabetical participant order.
- Percentage values are nonnegative and sum exactly to 100. Percentage-derived remainders use exact arithmetic, descending remainder order, alphabetical tie order.
- Duplicate-name ties remain unresolved. Do not create a surrogate-ID tie-break under this model.
- The payer's own share, if the payer is a participant, is not a debt to the payer.
- Status and review result are visible to authorized members with submitter identity as required by NFR-004.

### Payment and ledger

- `debtorId != creditorId`; amount is positive under the proposed validation policy.
- Payment amount <= current positive net debt in the same group/currency at commit time.
- Unique idempotency/source keys prevent duplicate payment/expense posting on request retries.
- Expense approval and its complete ledger posting set commit or roll back together.
- Payment record, counter-posting, projection update, and audit commit or roll back together.
- Ledger postings are immutable. Reconciliation checks ensure each source amount is explained and projections equal the sum of ledger entries.
- Report date filters include both endpoints. Date/time interpretation still needs a decision.

## 5. Expense state transitions

| Current state | Command | Actor condition | Next state | Financial effect |
|---|---|---|---|---|
| Not submitted | Submit valid expense | Active group member; valid reviewer assignment | `PENDING_REVIEW` | None |
| `PENDING_REVIEW` | Approve | Exactly designated reviewer, not submitter | `APPROVED` | Post obligations once, atomically |
| `PENDING_REVIEW` | Reject | Exactly designated reviewer, not submitter | `REJECTED` | None |
| `APPROVED` | Approve/reject again | Any | No transition | No effect; return conflict/current result idempotently |
| `REJECTED` | Edit/resubmit | Policy not specified | No transition in the proposed immutable model | Requires explicit new/correction policy |

## 6. Balance derivation

For every approved expense, create a debtor-to-payer obligation for each participant except the payer, equal to the participant's allocated share. For each recorded payment, create an equal counter-posting against the matching debt. Aggregate by group and unordered member pair; expose the positive net direction as creditor/debtor. Pending and rejected expenses have no postings. Balance views include only approved expense postings and recorded payments, exactly as FR-008 requires.

`BalancePosition` may be maintained to meet NFR-003 but remains a rebuildable projection. The `BalanceEntry` ledger and committed payment/expense records are authoritative. Reconciliation must compare projection totals to ledger-derived totals.

## 7. Decisions still required

See [open-questions.md](./open-questions.md) for currency catalog/scale, duplicate-name ties, membership history, invitations, receipt policy, identity/security operations, report semantics, manager multiplicity, corrections, and deployment. This logical schema intentionally does not invent provider, image format/size, or retention policy.
