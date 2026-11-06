# SplitSmart — Final Requirements (Reconciled)

**Status**: Final design package, AI-reconciled. Human review required (Constitution IX).
**Canonical copy**: The requirement body in this file is identical to `specs/001-splitsmart-expense-sharing/spec.md`.
**Sources, in order of precedence**: `UserRequirement.md` → human decisions in `design/consolidation-instructions.md` → Constitution v1.0.0 → clarified `spec.md` (Session 2026-10-29) → cross-review reports → proposal recommendations.

Labels used in this file: **[SOURCE]** comes from the customer requirement or an existing clarification. **[HUMAN]** is an approved human decision (see `decisions.md` HD-xx). **[INTERIM]** is a safe default that applies only until an open decision (OD-xx) is made. Interim defaults are *not* approved product policy.

## Clarifications

### Session 2026-10-29

- Q: How should an expense payer relate to the people sharing the expense? → A: The payer may be explicitly listed as a participant; only the other participants' allocated shares are owed to the payer.
- Q: How should a person become a member of a SplitSmart group? → A: A group manager invites the person, and the person must accept the invitation before gaining access.
- Q: When an expense split produces fractions of a cent, how should the system assign the leftover cents? → A: Use the largest-remainder method; assign leftover cents to participants with the largest fractional remainders, with ties resolved by a stable participant order.
- Q: How should SplitSmart validate nonpositive expense amounts and percentage shares that do not total 100%? → A: Reject negative amounts, allow zero-value expenses, and require percentage shares to total exactly 100%.
- Q: How should a person sign in to a SplitSmart account? → A: Use a verified email address and password, and require multi-factor authentication.
- Q: Can a user record a partial payment toward a debt, or must each payment settle the full amount owed? → A: Partial payments are allowed up to the outstanding debt; payments above the current debt are rejected.
- Q: Should multiple approval levels be excluded from this feature entirely, or remain a full-product capability outside the single-level MVP? → A: Configurable multiple approval levels are a full-product capability; the Java Swing MVP has exactly one review level.
- Q: Through which channel should SplitSmart notify group members about a submitted expense, and should the notice remain available if they are signed out? → A: Show an in-app notice and email signed-out members.
- Q: Who may approve or reject an expense in the single-level Java Swing MVP? → A: A reviewer explicitly designated by the group manager may make the decision; the submitter cannot be the reviewer for their own expense.
- Q: What second-factor method should SplitSmart require in addition to an email address and password? → A: Require an authenticator-app code and provide recovery codes.
- Q: When participants have equal fractional remainders in a split, what order should decide who receives the leftover cent first? → A: Use alphabetical order by participant name.

### Session 2026-11-05 (human architecture and reconciliation decision)

- Architecture: Spec Kit's four-layer MVP design is the baseline. Claude Code's value objects, idempotency, concurrency control and security treatment are adopted. The deployment is a thin Java Swing client calling a shared application server. Clients never connect directly to the database and never hold database credentials. (HD-01 to HD-05)
- Reviewer: for every Swing MVP expense, the manager designates exactly one reviewer for *that expense*. A standing group reviewer may only prefill that designation, and the manager must confirm it. (HD-06)
- Notifications: only submission notices are mandatory. Approval and rejection notices are not part of MVP behaviour. (HD-07)
- Lifecycle: pending and rejected expenses never post to balances. Approval posts exactly once, atomically with the decision. Terminal records are never silently edited or reopened. (HD-08)
- Identical names: an unresolved identical-name tie that would change an allocation is rejected (fail closed). No tie-break rule is invented. (HD-10)
- Persistence: the database vendor is not selected. Required capabilities are specified instead. (HD-11)

## Actors

- **Individual user**: registers, signs in, takes part in groups, enters expenses, views balances, records payments and views reports.
- **Group manager**: creates a group, invites and removes members, and designates the reviewer of each submitted expense.
- **Invited person**: must accept an invitation before getting any access to the group.
- **Expense submitter**: enters an expense and identifies its payer and participants.
- **Designated reviewer**: the one active member the manager assigned to a specific expense. Never the submitter.
- **Expense participant**: a group member included in an expense.
- **Shared application server** (system actor): the only trusted component. It enforces authentication, authorization and all business rules.
- **Email provider** and **receipt storage** (external systems): reached only through provider-neutral ports. Providers are not selected.

## Scope split

| Scope | Content |
|---|---|
| **Java Swing MVP** | FR-001 to FR-011 and NFR-001 to NFR-004 and NFR-006, delivered through a thin Swing client and the shared application server. Exactly one review level. |
| **Full product** | FR-012 and NFR-005 (web-primary, Android, iOS), plus configurable multiple review levels (FR-006). The shared server is the evolution seam. It does **not** prove that these clients exist, and the Swing MVP does **not** satisfy FR-012 or NFR-005. |
| **Out of scope unless the sources change** | Foreign exchange, more than one currency per group, offline entry and synchronization, report export. |

## User Scenarios & Testing

### User Story 1 — Share a group expense (P1, Java Swing MVP)

A user creates an account, starts or joins a group, and records an expense for the members who shared it, split equally or by percentage. The expense affects balances only after its designated reviewer approves it.

**Independent test**: Create two verified, MFA-enrolled accounts and a group. Submit an expense with at least two participants, designate a reviewer, approve it, and check the shares and pairwise balances.

1. **Given** a signed-in member and a group with at least two members, **when** the member submits a valid equal split, **then** the expense is `PENDING_REVIEW`, appears in group activity, and is not in balances.
2. **Given** a pending expense, **when** the manager designates an eligible reviewer who is not the submitter, **then** only that reviewer may decide the expense.
3. **Given** a pending expense with a designated reviewer, **when** the reviewer approves it, **then** it becomes `APPROVED` and each non-payer participant's share is posted once as a debt to the payer.
4. **Given** a percentage split totalling exactly 100%, **when** it is approved, **then** the shares are shown and add up exactly to the expense total.

### User Story 2 — Review and settle balances (P1, Java Swing MVP)

1. **Given** a pending expense, **when** its designated reviewer rejects it, **then** it is `REJECTED`, has no balance postings, and its status and outcome are visible.
2. **Given** a full-product group with multiple required review levels, **when** only some levels approve, **then** the expense stays pending and out of balances. *(Full product only.)*
3. **Given** a positive debt from A to B, **when** a permitted party records a payment of at most that debt, **then** the payment is in history and the debt falls by exactly that amount.
4. **Given** a payment greater than the current debt, **when** it is recorded, **then** it is rejected and nothing changes.
5. **Given** a pending MVP expense, **when** anyone other than its designated reviewer tries to approve or reject it, **then** the action is denied and nothing changes.
6. **Given** two payment requests that each fit the debt but together exceed it, **when** they are submitted at the same time, **then** at most one succeeds and the other is rejected without changes.
7. **Given** a payment or approval command sent twice with the same command ID, **when** the retry arrives, **then** the original result is returned and nothing is posted twice.

### User Story 3 — Track group activity and spending (P2, Java Swing MVP)

1. **Given** a member who is signed in when another member submits an expense, **then** that member gets an in-app notice identifying the group and the expense.
2. **Given** a member who is signed out at submission time, **then** an email is queued for that member, and the in-app notice is there when they next sign in.
3. **Given** expenses and payments, **when** a member picks an inclusive date range and group, member or activity-type filters, **then** the report shows only matching records and their summary, or a clear empty result.

### User Story 4 — Use SplitSmart on supported platforms (P3, full product)

1. **Given** an account with group activity, **when** its owner signs in on the web product, **then** they reach the same authorized records and core operations.
2. **Given** the same account, **when** its owner signs in on the Android or iOS app, **then** they reach the same authorized records and core operations.

### Edge cases

- An account is registered with an email already in use.
- A non-member or signed-out user tries to read or change group data or a receipt.
- An invitation is pending, declined or revoked before acceptance, or is accepted by a different identity.
- An expense has a negative amount, no participants, duplicate participants, participants who are not active members, or an amount with more precision than the currency allows.
- An approved zero-value expense creates zero shares and no postings.
- The payer is the only participant (valid, no debt).
- Percentages are negative, do not total exactly 100%, or have more decimal places than the configured limit.
- Rounding leaves leftover minor units. Tied remainders are ordered alphabetically by name.
- Two participants have identical names and the leftover cut falls between them (rejected, OD-01).
- The submitter tries to review their own expense, or the manager designates an ineligible reviewer.
- Two review decisions for the same expense arrive at the same time.
- A rejected expense is later corrected (no edit, OD-09).
- A payment is zero, negative, or above the current debt.
- A member is removed while an expense they are involved in is being submitted or reviewed.
- A report has an empty range (start after end) or no matching activity.
- A receipt is missing, unreadable, unsupported, or not available from storage.
- An email delivery fails repeatedly.

## Requirements

### Functional requirements

- **FR-001 (Java Swing MVP)**: Each person MUST be able to create an individual account with a unique, verified email address, sign in with a password and an authenticator-app code, and see only their own account information and the groups they are authorized for. The system MUST issue one-use recovery codes for users who lose their authenticator app. An account MUST NOT reach any group data until the email is verified and MFA enrollment is complete.
- **FR-002 (Java Swing MVP)**: A signed-in user MUST be able to create a group and manage its members. Only a group manager may invite or remove members. An invited person MUST accept the invitation before becoming a member or getting any access. *[INTERIM]* A removed member loses access to the group (OD-14). A removal that would leave unsettled balances or pending expenses involving the member is refused until OD-14 is decided.
- **FR-003 (Java Swing MVP)**: A group member MUST be able to submit an expense with a nonnegative amount in the group currency, a date, a description, a split method, exactly one payer and one or more distinct participants who are active group members. The payer MAY be a participant. Only the other participants' shares are owed to the payer. A zero-value expense MUST be accepted and MUST NOT change any balance. Negative amounts MUST be rejected.
- **FR-004 (Java Swing MVP)**: The system MUST support equal and percentage splits. Percentages MUST total exactly 100% and MUST NOT be negative. Shares MUST reconcile exactly to the expense total at the currency's minor unit. Leftover minor units MUST be assigned by the largest-remainder method, with equal remainders ordered alphabetically by participant name. If participants with identical names would make that order decide who gets a unit, the system MUST reject the allocation and explain why, until OD-01 is decided. Shares MUST be computed once at submission and stored.
- **FR-005 (Java Swing MVP)**: The submitter MAY attach one optional receipt image. Authorized group members MUST be able to view it with the expense. Receipts MUST be stored privately, and every read MUST be authorized by the server.
- **FR-006 (Java Swing MVP: exactly one review level; full product: configurable levels)**: A submitted expense MUST stay `PENDING_REVIEW` and outside balances until the required decision is made. In the Swing MVP the group manager MUST designate exactly one reviewer for each expense. The reviewer MUST be an active member and MUST NOT be the submitter. Only that reviewer may approve or reject the expense. A standing group default MAY prefill the designation but MUST be confirmed for the expense, and it is never a source of review authority. Approval and rejection are terminal. In the full product, a group MAY configure several required review levels, and the expense stays pending until all of them approve.
- **FR-007 (Java Swing MVP)**: When an expense is submitted, the system MUST create a durable in-app notice identifying the group and the expense for each other active member. It MUST also queue an email for each such member who is signed out at the moment the submission commits. Notice and email-intent creation MUST commit in the same transaction as the submission and MUST be idempotent. The expense MUST remain visible in group activity to all members. Approval and rejection notices are not required (OD-13).
- **FR-008 (Java Swing MVP)**: The system MUST show each user's net balance owed to or due from every other user, derived only from approved expenses and recorded payments. For each approved expense, each non-payer participant owes their share to the payer. The payer's own share is not a debt. *[INTERIM]* Balances are per group (OD-05).
- **FR-009 (Java Swing MVP)**: A permitted user MUST be able to record a payment between two group members with payer, recipient, amount, date and an optional description. A payment MAY be less than the outstanding debt and MUST NOT exceed it. An overpayment MUST be rejected without any change. Accepting the payment and posting it MUST be atomic, idempotent, and serialized against other changes to the same debt. Payments are never edited or deleted. *[INTERIM]* Only the debtor or the creditor may record a payment (OD-06). Zero and negative payments are rejected (OD-07). Corrections are not supported (OD-08).
- **FR-010 (Java Swing MVP)**: The system MUST provide summaries of expenses, balances and payments for a group and for an individual user, limited to groups the user may access.
- **FR-011 (Java Swing MVP)**: A user MUST be able to create a filtered report with an inclusive date range plus group, member and activity-type filters, showing only matching activity. *[INTERIM]* Expenses are filtered by expense date and payments by payment date. Dates are calendar dates with no time zone conversion. Balances are labelled "current". (OD-20)
- **FR-012 (Full product)**: SplitSmart MUST be available primarily as a web product and also as Android and iOS applications. The Swing MVP is a separate desktop deliverable and does not satisfy this requirement.

### Customer requirement inventory

| Customer feature (UserRequirement.md) | Requirement IDs | Scope |
|---|---|---|
| User accounts and access to own expenses and balances | FR-001, NFR-001 | Swing MVP |
| Group creation and member management | FR-002 | Swing MVP |
| Expense details, equal/percentage split, optional receipt, participants | FR-003, FR-004, FR-005 | Swing MVP |
| Notification when another member creates an expense | FR-007 | Swing MVP |
| Review and approval before balances change; single or multiple levels | FR-006 | One level in MVP; configurable levels in full product |
| Balance owed by each user to every other user | FR-008 | Swing MVP |
| Recording payments to settle balances | FR-009 | Swing MVP |
| Reports and summaries, custom date ranges and parameters | FR-010, FR-011 | Swing MVP |
| Primary web product plus Android and iOS apps | FR-012, NFR-005 | Full product |

### Non-functional requirements

- **NFR-001 (Swing MVP)**: The server MUST authenticate every request and authorize every operation and receipt read against the resource. A user MUST NOT see or change another user's private account data or a group they do not belong to. Access requires a verified email, a password and an authenticator-app code, with one-use recovery codes. These controls are required and are specified for security review: salted adaptive password hashing, TOTP replay prevention, encrypted MFA secrets with managed key custody, server-side session expiry and revocation, rate limiting of authentication steps, encrypted client-server transport, and logs that never contain secrets. Algorithm parameters are not approved (OD-18). No certification is claimed.
- **NFR-002 (Swing MVP)**: All money MUST use `BigDecimal` exact arithmetic. `float` and `double` MUST NOT be used for money. Each group has one currency, and every amount has exactly that currency's minor-unit scale. Input with more precision is rejected, never rounded. Displayed shares MUST reconcile to the expense total with no unexplained residual. The currency catalogue, scale source, amount bounds and percentage precision are configuration that needs approval (OD-03, OD-04). Group creation fails if no approved catalogue is configured.
- **NFR-003 (Swing MVP)**: For a group of up to 50 members and 10,000 recorded expenses, at least 95% of ordinary group, balance and report views MUST be displayed within 2 seconds under normal operating conditions. The workload, hardware, concurrency, network and measurement boundary are acceptance-test parameters still to be approved (OD-21).
- **NFR-004 (Swing MVP)**: A member with access to a group MUST be able to see whether an expense is pending, approved or rejected, plus its submitter, designated reviewer and review outcome.
- **NFR-005 (Full product)**: The web, Android and iOS products MUST provide the core account, group, expense, balance, payment, notification, approval and reporting capabilities above.
- **NFR-006 (Swing MVP, financial integrity)**: Financial history MUST be append-only and is the source of truth for balances. Each state-changing command MUST carry a stable command ID and be idempotent. Concurrent changes MUST NOT cause lost updates, double postings or a combined overpayment. A failed command MUST leave no partial financial state. Any balance projection MUST be updated atomically with the ledger and be rebuildable from it.

### Acceptance criteria

- **AC-001 (FR-001, FR-002)**: A new user verifies their email, enrols an authenticator app, receives recovery codes once, signs in with password and code, creates a group and invites another account. The invitation shows as pending, the invitee gets access only after accepting, and an unrelated account cannot read or change the group. A used recovery code cannot be used again, and a TOTP code cannot be replayed.
- **AC-002 (FR-003, FR-005)**: A valid expense with an optional receipt shows amount, date, description, payer, participants, split method and receipt. If the payer participates, only the others owe their shares. A zero-value expense is accepted and changes no balance. Negative amounts and invalid data are rejected. A non-member cannot fetch the receipt.
- **AC-003 (FR-004)**: Equal and percentage splits reconcile exactly. Percentages not totalling exactly 100% are rejected. Leftover units go to the largest remainders, and equal remainders go alphabetically by name. An identical-name tie that changes the result is rejected with an explanation.
- **AC-004 (FR-006, FR-007, FR-008)**: A submitted expense is pending and out of balances. The manager designates exactly one reviewer, who is not the submitter. Only that reviewer can decide. Approval posts once. Rejection posts nothing. Other members get an in-app notice and signed-out members get an email intent. In the full product, all configured levels must approve.
- **AC-005 (FR-009, NFR-006)**: A valid payment is added to history and lowers the debt by exactly its amount. Partial payments are accepted. An overpayment, including a combined overpayment from concurrent requests, is rejected with no change. A replayed command does not post twice.
- **AC-006 (FR-010, FR-011)**: A report includes expense, balance and payment summaries. The inclusive date range and the group, member and activity-type filters exclude non-matching activity. No match gives a clear empty result.
- **AC-007 (FR-012, NFR-005)**: The product is available on web, Android and iOS with consistent authorized records and capabilities. *(Full product.)*
- **AC-008 (NFR-001)**: Non-members and signed-out users cannot read private group activity or receipts. Authorized members see only what they are allowed to see. Logs contain no passwords, TOTP secrets or codes, recovery codes or session tokens.
- **AC-009 (NFR-002, NFR-004)**: The representative split vectors reconcile exactly. Status, submitter, reviewer and outcome are visible to authorized members.
- **AC-010 (NFR-003)**: Under the approved performance profile, at least 95 of 100 ordinary group, balance and report views complete within 2 seconds.
- **AC-011 (NFR-006)**: Fault injection between the decision and posting rolls back both. Rebuilding balances from the ledger matches any projection.

## Key entities

User account, MFA enrollment, recovery code, session, group, membership, invitation, expense, expense share, reviewer assignment, review record, receipt reference, ledger entry, payment, notification, email outbox message, processed command, audit record. See `design/final/data-model.md`.

## Success criteria

- **SC-001**: At least 90% of first-time test users can create an account, join a group and submit a valid expense within 5 minutes without help.
- **SC-002**: In all acceptance tests, approved equal and percentage shares reconcile exactly to the expense amount at the minor unit.
- **SC-003**: In all acceptance tests, pending and rejected expenses do not change balances, and approved expenses and valid payments produce the expected pairwise balances.
- **SC-004**: At least 95 of 100 ordinary group, balance and report views complete within 2 seconds under the approved profile.
- **SC-005**: Test users identify the status, submitter, payer, participants and share of a selected expense in at least 90% of usability attempts.
- **SC-006**: The full product passes the same core account and expense acceptance scenarios on web, Android and iOS.

## Assumptions

- A group uses exactly one currency. There is no foreign exchange. [SOURCE]
- Users are online. Offline entry and sync are not included. [SOURCE]
- Reports are viewed in the product. Export is not required. [SOURCE]
- Date-range filters include both the start and the end date. [SOURCE]
- The 2-second / 95% target and the usability thresholds are proposed acceptance targets, not customer-supplied values. [SOURCE]
- The Swing MVP is a desktop client of the shared server. Web, Android and iOS are full-product requirements. [SOURCE, HUMAN]

## Open decisions

The full register, with owner, impact, interim behaviour and decision gate, is in `design/final/decisions.md` §3: OD-01 to OD-28. The decisions that block implementation are OD-01 (identical names), OD-03 (currency catalogue), OD-05 (balance scope), OD-12 (meaning of "signed out"), OD-18 (security parameters) and OD-23 (database).
