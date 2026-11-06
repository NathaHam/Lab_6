# Detailed Design

**Status:** Proposed; human review is mandatory before acceptance  
**Design boundary:** Detailed design, not implementation instructions masquerading as verified code

## 1. Design vocabulary

- **Source fact:** required by `UserRequirement.md`, `spec.md`, or the constitution.
- **Proposed:** a design choice made here to enable implementation.
- **Needs human decision:** sources do not settle the point. No behavior is treated as accepted.

## 2. Domain model and aggregate boundaries

Entity fields, value objects, and complete invariants are specified in [data-model.md](./data-model.md). The principal aggregates are:

1. **Account** owns verified-email and authentication enrollment/recovery state.
2. **Group** owns group currency, manager authority, active memberships, and invitations. Membership and invitation changes are serialized through the group aggregate boundary.
3. **Expense** owns payer, participants, split inputs, immutable allocated shares, optional receipt reference, reviewer assignment, review outcome, and lifecycle. Its review operation is the only path that produces an approval posting request.
4. **Payment** is immutable once recorded; it references the group and the debtor/creditor pair and is accepted only against a currently positive obligation.
5. **Balance ledger** is an append-only record of approved expense obligations and payment counter-postings. **Balance position** is a derived pairwise net read model, not an independent editable debt.
6. **Notification/outbox** is durable delivery work. Delivery status cannot alter an expense or payment outcome.

**Proposed**: Persist a submitted expense's split inputs and allocated shares as a snapshot. Later changes to group membership or display name must not recompute existing shares. Expense review decisions and payment records are append-only for auditability; corrections use a separately reviewed compensating/new record. The exact correction workflow is unresolved.

### Lifecycle

```text
Draft (client-only / not shared) -> PendingReview -> Approved
                                             └-----> Rejected
```

Only pending expenses are reviewable. Approved and rejected states are terminal in this MVP proposal. Re-submission after rejection is an open product decision; do not silently edit or reactivate a rejected financial record.

Invitation lifecycle is `Pending -> Accepted | Declined | Revoked`. Expiration is not specified. Membership becomes active only on acceptance. Removing an active membership blocks future access by default; historical visibility requires a decision before implementation.

Payment lifecycle is one committed `Recorded` state or no payment. Validation failure creates no financial record. A recorded payment is never silently edited/deleted; correction semantics need human approval.

## 3. Money arithmetic and split allocation

### Monetary representation

- All amounts and monetary operations use `BigDecimal`; never use `float` or `double`.
- **Proposed scale policy:** take the currency's configured minor-unit scale for the group's single currency. Convert inputs to that scale with `RoundingMode.UNNECESSARY`; reject amounts that cannot be represented exactly rather than silently round. The exact supported currency set and source of currency-scale metadata are not supplied and require a decision.
- Store a monetary value as `(currencyCode, amount)` or an exact integer minor-unit count plus the group's currency code. Never compare/add amounts from different group currencies.
- Percentage inputs are `BigDecimal` percentages, nonnegative, and must sum numerically to exactly `100`. Their accepted input precision is not fixed by source; precision limits require a decision. A percentage that is not exact at its declared decimal representation is not normalized by binary floating point.
- `BigDecimal` equality in validation is numeric (`compareTo`), not scale-sensitive object equality.

### Common rules

1. Require one payer and at least one distinct participant; each must be an eligible group member at submission. The payer can be outside the participant set or explicitly included. An explicitly participating payer receives an allocated share but owes no share to themselves.
2. A zero expense is valid and produces zero shares and no balance postings. A negative amount is rejected.
3. Calculate allocated shares in currency minor units. Shares are nonnegative and their sum equals the expense total exactly.
4. The tie order for equal remainders is alphabetical participant name as specified. Normalize/order semantics (case, accents, locale) are not specified. Identical participant names can still tie; do not add an ID tie-break. Mark such a tie unresolved and require a stakeholder decision before the result can be accepted as deterministic.

### Equal split

Let `T` be total integer minor units and `n` the number of participants. Compute integer quotient `q = T div n` and remainder `r = T mod n`. Give each participant `q`; give one additional minor unit to the first `r` participants in the approved alphabetical order. This is the largest-remainder result for an equal split.

### Percentage split

For each participant `i`, compute the exact rational share in minor units from `T * percentage_i / 100`. Retain the integer floor and exact fractional remainder; do not use a rounded intermediate `double`. Give each participant the floor, then distribute the remaining units one at a time in descending fractional-remainder order, breaking equal remainders alphabetically by participant name. Because percentages total exactly 100%, the remaining units equal the sum needed to reconcile to `T`. An identical-name tie for a remaining unit is unresolved and must not be settled by an invented identity ordering.

**Implementation note:** A safe implementation can use exact `BigDecimal`/integer arithmetic (e.g. scale-aware unscaled values) for floors and remainder comparisons. It must not depend on a fixed decimal approximation that can change remainder ordering.

### Balance postings and pairwise netting

Represent a balance position as a signed amount for an ordered debtor/creditor pair: positive means the debtor owes the creditor; zero means settled; negative is normalized to the reverse pair for display.

On approval, for every participant other than the payer, create an obligation from that participant to the payer equal to that participant's allocated share. Do not create an obligation for a payer-participant's own allocated share. Zero postings may be omitted. For a payer who is not a participant, all allocated shares are owed to that payer.

On payment, add the inverse posting against the selected debtor-to-creditor obligation. A payment amount may be less than or equal to the current positive net debt. Payments greater than that debt are rejected. Pairwise netting aggregates source postings and payments; it does not erase the underlying expense or payment history. The group ledger must reconcile to zero net value across all parties for each transaction.

### Financial examples for verification

Examples use a two-decimal currency only as test vectors, not as the product's chosen currency policy:

| Total | Split | Expected allocation |
|---:|---|---|
| 10.00 | Equal among A, B, C | 3.34, 3.33, 3.33; alphabetical A receives the residual cent |
| 10.00 | 33.33%, 33.33%, 33.34% | 3.33, 3.33, 3.34 |
| 0.00 | Any valid equal/percentage split | All shares zero; no balance change |
| 0.01 | Equal among A and B | 0.01 to A, 0.00 to B under the source tie rule |
| Any | Payer is also a participant | Payer's share is allocated/displayed but not booked as an amount owed to self |

These are illustrative tests. Identical-name exact remainders and currency-specific scales remain blocked by open decisions.

## 4. Application use cases and authorization

Every use case receives a server-authenticated actor context; the client cannot supply an actor identity as authority. Application services ask the domain for valid transitions and use repositories/transactions to persist results.

| Use case | Preconditions and authorization | Result |
|---|---|---|
| Register account | Email not already assigned; password meets approved policy | Unverified account and verification intent |
| Verify email / enroll MFA | Valid one-use verification token; authenticator enrollment confirmed | Verified account, protected TOTP secret, one-time recovery codes |
| Authenticate | Verified email, valid password, valid authenticator code; recovery-code alternative only under approved policy | Authenticated session with defined expiry/revocation |
| Create group | Authenticated account | Group with selected one-currency code and manager membership |
| Invite member | Active manager of group | Pending invitation; no group access for invitee |
| Accept invitation | Invitee identity matches invitation under approved matching policy; invitation still pending | Active membership and access |
| Remove member | Active group manager | Membership removal and audit; historical visibility follows unresolved policy |
| Submit expense | Active member, eligible payer/participants, valid amount/date/description/split, selected reviewer is group member and differs from submitter | Pending expense and durable notice intents; no balance posting |
| Review expense | Actor is assigned reviewer, differs from submitter, expense pending | Approved and postings, or rejected with no postings |
| Record payment | Actor authorized for group; debtor and creditor are eligible distinct members; positive amount <= current debt | Payment history, counter-posting, and updated net balance |
| View group/balance/report | Active member with requested group scope | Only authorized, filtered data; dates inclusive |
| Read receipt | Active authorization to the associated group | Private image content or explicit unavailable error |

Manager count/transfer, group deletion, and whether a payer may submit a payment on another member's behalf are not established and must be decided.

## 5. Invitation workflow

1. Manager authenticates and selects a group and invitee identity.
2. Application verifies manager authority and creates a pending invitation with inviter, group, creation time, and a high-entropy acceptance reference (exact delivery channel and expiry remain open).
3. Invitee receives whatever channel is approved; before acceptance, every group-data request is denied.
4. The invitee accepts while authenticated and matching the invitation identity according to the policy selected by stakeholders.
5. One transaction marks the invitation accepted, creates active membership, and appends the audit event. Repeated acceptance is idempotent and cannot create duplicate memberships.
6. Manager revocation/removal is authorized and audited. An invitation already accepted is not treated as pending.

The identity-matching, expiry, duplicate invitation, and removed-member historical access policies are open questions, not hidden defaults.

## 6. Expense submission and review workflow

### Submit

1. Swing collects amount, date, description, split method, one payer, participant list, and optional image; it performs only immediate UX checks.
2. The application service authenticates the submitter and checks active group membership.
3. Domain validation checks nonnegative amount (zero allowed), valid date/description, group currency scale, payer/participant membership, nonempty distinct participants, exact 100% percentages, and resolvable allocation ordering.
4. The manager-designated reviewer must be exactly one group member and not the submitter. If the manager is submitter, the group must select another reviewer.
5. Store pending expense and immutable share snapshot; no ledger posting is allowed.
6. Persist in-app notices for group recipients and email outbox intents for group recipients observed signed out at submission time. Notice content includes group/expense identifiers; email avoids full receipt/financial details.
7. UI clearly displays `Pending`, submitter, and designated reviewer. NFR-004 makes status and review outcome visible to authorized members.

### Approve

1. Reviewer opens a pending expense; service rechecks group access and assignment.
2. In one transaction, verify status is still pending and actor is the assigned reviewer and not the submitter.
3. Record an immutable approval decision and timestamp; transition to approved.
4. Create unique ledger obligations for participants other than the payer; update the balance projection if enabled; append audit record; enqueue review-result notices.
5. Commit. If any persistence step fails, the expense remains pending and no posting is visible. A repeated request returns the already committed outcome without duplicating postings.

### Reject

1. Apply the same reviewer and pending checks.
2. Record rejection and outcome/reason only if a reason is selected as a product requirement (reason requirement is not currently established).
3. Transition to rejected and append audit; create no balance ledger entries.
4. Enqueue outcome notices transactionally. Rejection does not adjust balance.

### Failure and race handling

- Competing review requests use a status/version check; at most one terminal decision commits.
- A submitter's self-review and any unassigned review are denied with no status, ledger, or balance mutation.
- Notifications may be delayed or retried but cannot roll back a successful transition.
- Rejected-expense correction/resubmission semantics remain open; the proposed safe default is a separate new submission linked for audit, subject to approval.

## 7. Payment and balance workflow

1. An authorized member selects a group, debtor, creditor, amount, date, and optional description.
2. Application verifies both parties are distinct and in the applicable group under the approved membership policy. The authenticated actor's authority to enter a payment on behalf of the debtor remains a human decision.
3. In a transaction, lock or serialize the relevant pairwise position; recompute/validate current positive debt; reject zero, negative, wrong-direction, or over-debt payment (zero/negative handling is proposed input validation because FR-009 requires valid payment but does not state their exact behavior).
4. Insert an immutable payment with an idempotency key, append the counter-posting, update projection if present, append audit, commit.
5. Return the new net balance and preserve payment in history. If a concurrent payment reduces the obligation first, re-check and reject the later amount if it now exceeds the debt.
6. Balance views aggregate approved-expense postings and payment counter-postings by group and pair. Pending/rejected expenses never appear.

See the payment/balance sequence diagram for commit order.

## 8. Notification delivery and idempotency

- Create an in-app notification for each group member in the submission-time recipient snapshot, including the submitter only if the product interprets “other members” to include them; the spec says notify other members, so the submitter is excluded.
- The submission transaction records signed-in/signed-out state for each recipient at submission time. Only signed-out recipients receive an email intent. Session-state definition and race timing need approval.
- Outbox records have stable operation/event identifiers, recipient, channel, attempt count, and delivery state. Dispatcher claims work safely across instances, sends outside the business transaction, records outcome, and retries transient failures.
- Re-delivery is possible; use event/recipient/channel idempotency keys to avoid duplicate in-app records and provider idempotency where supported. Provider capabilities are unknown.
- Permanent failures remain visible to operations and are not represented as delivered. Exact alerting, retry schedule, retention, and email provider are open.

## 9. Reporting and performance

### Query behavior

- Reports filter group, member, activity type, and inclusive date range.
- Activity rows are sourced from approved expenses and recorded payments; pending/rejected expenses may be shown in activity/status views but never count toward balance summaries.
- Summary values use the same domain monetary policy and group currency. Authorization is applied before returning any row.
- A report with no matching rows returns an explicit empty result; invalid date range is a validation error, not an empty success.
- Date-only expense dates and payment dates need a consistent time-zone/report-boundary interpretation before implementation.
- Whether a report's balance means current balance or balance as of its end date, and whether creation date or occurred-on date drives inclusion, remain open questions.

### Performance strategy

The initial design favors relational indexes and bounded queries over premature caching. Candidate indexes: `(group_id, occurred_on)`, `(group_id, status, submitted_at)`, `(group_id, reviewer_id, status)`, `(group_id, debtor_id, creditor_id)`, `(group_id, member_id)`, and unique source/idempotency keys. Exact SQL schema and database-specific indexes follow the selected database.

Measure 100 views under the NFR-003 workload; require at least 95 under 2 seconds. Define normal operating conditions, client/server location, database sizing, concurrent load, data generation, and percentile calculation before performance acceptance. Do not assert this target is achieved by design alone.

## 10. JUnit 5 verification strategy

Tests below are required evidence to create once code exists; no code or test results are present in this workspace.

### Domain unit tests (no GUI or database)

- Account state: unverified access denied; valid verification enables enrollment; one-time recovery verifier is consumed exactly once.
- Group/invitation: non-manager cannot invite/remove; invitation pending grants no access; only accepted invitation activates membership; duplicate acceptance has no duplicate effect.
- Expense invariants: negative rejected, zero accepted, missing participant rejected, payer/participant membership validated, one payer, immutable pending shares.
- Split property tests: equal and percentage allocations are nonnegative and sum exactly to total minor units; percentage total must equal 100%; largest remainder ordering and alphabetical tie behavior; zero and one-minor-unit cases; identical-name tie is explicitly unresolved and must not be silently identity-ordered.
- Payer participation: payer's allocated share is not booked as a self-debt.
- Lifecycle: pending/rejected produce no postings; only assigned non-submitter can decide; repeated approval cannot duplicate posting.
- Payment: partial and exact settlement succeed; overpayment, zero, negative, wrong direction, and concurrent stale debt cannot create a payment or alter balance.
- Reports: inclusive start/end boundaries, filters, empty results, authorization.

### Application/integration tests

- Transaction rollback leaves no approved status without all corresponding postings or vice versa.
- Concurrent review results in at most one terminal review and one set of postings.
- Concurrent payments cannot overdraw a pairwise debt.
- Outbox delivery retries/idempotency do not duplicate notices or change financial state.
- Receipt access checks group authorization; invalid/unconfigured receipt policy is not silently accepted.
- A representative report query and balance projection reconcile to independently recomputed ledger totals.

### Presentation tests

Limit Swing tests to navigation, rendering status/submitter/review outcome, error presentation, and wiring of user actions to application boundaries. No Swing test should be the only evidence for business or money rules.

### Performance and acceptance tests

- Run the NFR-003 100-view workload for a 50-member group and 10,000 recorded expenses; report measured latency distribution and environment.
- Verify spec acceptance criteria AC-001 through AC-010 using acceptance/integration scenarios. AC-007/FR-012/NFR-005 requires full-product platform work and is not a desktop-MVP pass criterion.

## 11. Unresolved policy boundaries

See [open-questions.md](./open-questions.md). The duplicated-name allocation tie is a correctness blocker; currency metadata, security algorithms, receipt policy, invitation identity/delivery, membership history, reporting semantics, and operational service assumptions need owner decisions. Human review is a release gate under the constitution.
