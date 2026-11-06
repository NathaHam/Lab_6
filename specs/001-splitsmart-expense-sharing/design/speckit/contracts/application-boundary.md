# Proposed Application Boundary Contract

This is a conceptual contract for deriving service/client interfaces. It is not an implemented or versioned wire API. Transport, serialization, versioning, and endpoint paths remain decisions. Every request is authenticated server-side; caller-supplied account IDs never substitute for the authenticated actor.

## Common behavior

- Protected operations require a verified account and a valid authenticated session.
- Group-scoped operations require active membership and the appropriate manager/reviewer authority.
- Requests are validated in the application/domain layers; errors are explicit and do not return success-shaped defaults.
- Writes that may be retried accept or derive a stable idempotency key. Reusing the same key with different command data is a conflict.
- All monetary input/output includes the group currency code and approved scale. Amounts serialize as exact decimal strings or an equivalent lossless representation, never binary floating point.
- Dates use an explicitly agreed format/time-zone rule before the wire contract is frozen.

## Use-case operations

| Operation | Request shape (conceptual) | Success result | Important failures |
|---|---|---|---|
| `registerAccount` | Email, password | Account ID and verification-required state; no authenticated group access | Duplicate email, invalid input, delivery intent failure surfaced separately |
| `verifyEmail` | Verification token | Verified account state | Invalid, expired, reused token |
| `enrollAuthenticator` | Authenticated account, enrollment proof | MFA enrolled and recovery codes revealed once | Enrollment proof invalid; account not verified |
| `authenticate` | Email, password, authenticator code or approved one-use recovery code | Session result | Invalid/unverified account, invalid/replayed code, rate limited |
| `createGroup` | Name, currency code | Group ID and manager membership | Unsupported/unapproved currency; invalid name |
| `inviteMember` | Group ID, invitee identity | Pending invitation ID/state | Not manager; duplicate/conflicting invitation; invalid group |
| `acceptInvitation` | Invitation reference, authenticated identity | Active membership result | Identity mismatch, revoked/declined invitation, already resolved invitation |
| `removeMember` | Group ID, account ID | Removal outcome | Not manager; invalid lifecycle state |
| `submitExpense` | Group, amount, date, description, split method/input, payer, participants, reviewer, optional receipt reference | Pending expense ID/status, allocated-share snapshot | Unauthorized, nonmember, negative/unrepresentable amount, missing participant, percentage sum != 100, reviewer invalid, unresolved allocation tie |
| `reviewExpense` | Expense ID, approve/reject, optional reason | Terminal status and review result | Not assigned reviewer, submitter self-review, nonpending state, stale/concurrent decision |
| `recordPayment` | Group, debtor, creditor, amount, date, optional description, idempotency key | Payment ID/history item and resulting pairwise balance | Unauthorized, invalid party/amount, debt insufficient, stale concurrent debt |
| `getGroupActivity` | Group, filters, inclusive date range, paging | Authorized matching activity and status | Nonmember, invalid range |
| `getPairwiseBalances` | Group and optional member filter | Exact signed pairwise positions | Nonmember, invalid member filter |
| `getReport` | Inclusive start/end, optional group/member/activity filters | Summary and matching activity/empty result | Unauthorized scope, invalid range, unsupported report semantics |
| `getReceipt` | Expense/receipt ID | Authorized image stream/metadata | Nonmember, missing/unavailable object, policy validation failure |

## Status and failure semantics

- `PENDING_REVIEW`, `APPROVED`, and `REJECTED` are distinct returned values. The client must display status, submitter, and outcome to authorized group members.
- A failed approval transaction returns no approved state and creates no visible postings.
- A rejected expense never returns a balance-posting success.
- A failed/over-debt payment creates no payment-history entry and leaves the balance unchanged.
- Notification delivery status is not a financial operation result. The application reports committed business state separately from queued/delayed email status.

## Full-product evolution

Future web/Android/iOS clients may use the same application operations and authorization policies. Their platform-specific authentication UX and compatibility requirements require separate contracts and do not change Swing MVP scope.
