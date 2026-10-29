# Feature Specification: SplitSmart Expense Sharing

**Feature Branch**: `001-splitsmart-expense-sharing`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Read UserRequirement.md in this workspace as the authoritative customer requirements. Write a testable SplitSmart feature specification: actors, user scenarios, functional and non-functional requirements, acceptance criteria, requirement IDs (FR-001, etc.), and open questions. Preserve all original customer features in the requirements inventory; label the Java Swing MVP subset separately. Do not write Java code. Do not edit UserRequirement.md."

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

## Actors

- **Individual user**: Registers, signs in, participates in groups, enters expenses,
  reviews balances, records payments, and views reports.
- **Group creator or manager**: Creates a group, invites people, and manages
  its membership.
- **Invited person**: Accepts a group invitation before gaining access to
  that group's information.
- **Expense submitter**: Enters an expense and identifies the people who share it.
- **Expense reviewer**: A person designated by the group manager to review
  expenses. A submitter cannot review their own expense.
- **Expense participant**: A group member included in an expense and affected by
  its resulting balances.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Share a group expense (Priority: P1, Java Swing MVP)

A user creates an account, starts or joins a group, and records an expense for
the members who shared it. The user can divide the amount equally or specify
each participant's percentage. The group can see the expense after it is
approved and understand how it changes who owes whom.

**Why this priority**: Recording and splitting shared expenses is the core
customer value of SplitSmart.

**Independent Test**: Create two accounts and a group, submit and approve an
expense with at least two participants, and verify the displayed shares and
pairwise balances.

**Acceptance Scenarios**:

1. **Given** a signed-in user and a group with at least two members, **When**
   the user submits a valid equally split expense, **Then** the expense is
   marked pending review and is not yet included in balances.
2. **Given** an expense awaiting review, **When** its designated reviewer approves
   it, **Then** the expense is included in the participants' balances and the
   group members are notified.
3. **Given** a valid expense using percentage shares totaling 100%, **When**
   it is approved, **Then** each participant's share is displayed and the
   shares add up exactly to the expense total.

---

### User Story 2 - Review and settle balances (Priority: P1, Java Swing MVP)

A group member reviews submitted expenses, then any participant can record a
payment made to another member. Members can check each pairwise balance after
approved expenses and recorded payments.

**Why this priority**: Approval prevents unreviewed expenses from affecting
balances, and payment tracking lets users close out what they owe.

**Independent Test**: Submit an expense, have its designated reviewer other
than the submitter approve it, record a payment between participants, and
verify the balance changes.

**Acceptance Scenarios**:

1. **Given** a pending expense, **When** its designated reviewer rejects it,
   **Then** it remains excluded from balances and its status shows rejected.
2. **Given** a full-product group with multiple required reviews, **When** only some
   required reviewers approve it, **Then** it remains pending and excluded
   from balances until all required reviews approve it.
3. **Given** a positive balance owed between two members, **When** the debtor
   records a payment to the creditor, **Then** the payment appears in their
   history and the outstanding balance decreases by that amount.
4. **Given** a payment greater than the amount owed, **When** the user attempts
   to record it, **Then** the system rejects the payment without changing the
   balance.
5. **Given** a pending expense in the MVP, **When** a group member who was not
   designated as its reviewer attempts to approve or reject it, **Then** the
   system denies the action and the expense status and balances remain
   unchanged.

---

### User Story 3 - Track group activity and spending (Priority: P2, Java Swing MVP)

A user receives notice when another group member submits an expense and views
expense, balance, and payment summaries for the group or a chosen date range.

**Why this priority**: Notifications help members stay aware of activity, while
reports make group spending and settlement history understandable.

**Independent Test**: Submit an expense as one member, confirm signed-in group
members see an in-app notification and signed-out members receive an email,
and view a summary for a date range containing the expense and a payment.

**Acceptance Scenarios**:

1. **Given** a group member is signed in, **When** another member submits an
   expense to that group, **Then** the member sees a notification identifying
   the group and expense.
2. **Given** a group with expenses, balances, and payments, **When** a member
   selects a date range and report filters, **Then** the report shows only
   matching records and summarizes the selected records.
3. **Given** a group member is signed out when an expense is submitted,
   **When** the expense is submitted, **Then** the member receives an email
   and the notice remains available in-app after the member signs in.

---

### User Story 4 - Use SplitSmart on supported platforms (Priority: P3, full product)

A user accesses the same account and expense information through the primary
web product or the Android and iOS apps.

**Why this priority**: The customer requires web as the primary product and
Android and iOS apps, beyond the Java Swing desktop MVP.

**Independent Test**: Sign in on each supported product and verify that the
same authorized groups, expenses, balances, payments, and reports are
available.

**Acceptance Scenarios**:

1. **Given** an account with existing group activity, **When** its owner signs
   in on the web product, **Then** the owner can access the same authorized
   records and core operations.
2. **Given** an account with existing group activity, **When** its owner signs
   in on the Android or iOS app, **Then** the owner can access the same
   authorized records and core operations.

### Edge Cases

- A user attempts to create an account with an identity already in use.
- A user who is not a group member attempts to view or change that group's data.
- An invitation is pending, declined, or revoked before it is accepted.
- An expense has a negative amount, no participants, or participants
  who are not members of its group.
- An approved zero-value expense produces zero-value shares and does not
  change any balance.
- Percentage shares are negative, exceed 100% in total, or are supplied with
  more precision than the currency can represent.
- Equal or percentage splits produce a fractional minor currency unit.
- An expense submitter attempts to approve their own expense.
- A rejected expense is later edited and resubmitted.
- A payment is zero, negative, or exceeds the current debt between its parties.
- A report has an empty date range or no matching activity.
- A receipt image is missing, unreadable, or an unsupported image type.
- A notification recipient is signed out when an expense is submitted.

## Requirements *(mandatory)*

### Functional Requirements

The inventory below preserves every feature in `UserRequirement.md`. The
**Java Swing MVP** label identifies the initial desktop scope; **full product**
denotes a customer requirement beyond that initial scope.

- **FR-001 (Java Swing MVP)**: The system MUST allow each person to create an
  individual account with a unique, verified email address, sign in using a
  password and an authenticator-app code, and access only their own account
  information and authorized group information. The system MUST provide
  recovery codes for users who lose access to their authenticator app.
- **FR-002 (Java Swing MVP)**: The system MUST allow a signed-in user to create
  a group and manage its members. Only a group manager may invite or remove
  members. An invited person MUST accept the invitation before becoming a
  member or gaining access to the group.
- **FR-003 (Java Swing MVP)**: The system MUST allow a group member to submit
  an expense with a nonnegative amount, date, description, split
  method, one payer, and one or more participating group members. The payer
  MAY be explicitly listed as a participant; only the other participants'
  allocated shares are owed to the payer. A zero-value expense MUST be
  accepted and MUST NOT change any balance when approved.
- **FR-004 (Java Swing MVP)**: The system MUST support equal and percentage
  expense splits. Percentage shares MUST total exactly 100%; the resulting
  participant shares MUST reconcile exactly to the expense total at the
  currency's minor unit. When rounding creates leftover minor units, the
  system MUST allocate them by the largest-remainder method, with ties
  resolved alphabetically by participant name.
- **FR-005 (Java Swing MVP)**: The system MUST allow an expense submitter to
  attach an optional receipt image and show that image with the expense.
- **FR-006 (Java Swing MVP: exactly one review level; full product: configurable
  review levels)**: A submitted expense MUST await review before affecting
  balances. In the Java Swing MVP, the group manager MUST designate exactly
  one reviewer for the expense; that reviewer MUST NOT be its submitter. The
  designated reviewer MUST approve or reject it. In the full product, a group
  MAY configure multiple required review levels. The expense MUST remain
  pending until the required approval decision or decisions are complete;
  rejection MUST prevent it from affecting balances.
- **FR-007 (Java Swing MVP)**: When an expense is submitted, the system MUST
  notify the other members of that group. A notification MUST identify the
  group and expense, remain available in-app to all group members, and be sent
  by email to members who are signed out when it is submitted.
- **FR-008 (Java Swing MVP)**: The system MUST show each user's net balance
  owed to or due from every other user, based on approved expenses and
  recorded payments only. For each approved expense, participants other than
  the payer owe their allocated shares to the payer; a payer listed as a
  participant does not owe their own share.
- **FR-009 (Java Swing MVP)**: The system MUST allow a user to record a
  payment between group members, including payer, recipient, amount, date,
  and optional description. A payment MAY be less than the outstanding debt
  but MUST NOT exceed it. The system MUST update the corresponding balance
  by the payment amount and retain the payment in history.
- **FR-010 (Java Swing MVP)**: The system MUST provide summaries of expenses,
  balances, and payments for a group and for an individual user.
- **FR-011 (Java Swing MVP)**: The system MUST allow a user to create a
  filtered report using a specified inclusive date range and additional
  parameters, including group, member, and activity type, and show only
  matching activity.
- **FR-012 (Full product)**: SplitSmart MUST be available primarily as a
  web-based product and also as applications for Android and iOS. The Java
  Swing MVP is a separate desktop deliverable and does not satisfy this
  customer platform requirement.

### Customer Requirement Inventory

| Original customer feature | Requirement IDs | Scope |
|---|---|---|
| User accounts and access to personal expenses and balances | FR-001 | Java Swing MVP |
| Group creation and member management | FR-002 | Java Swing MVP |
| Expense details, equal/percentage splits, optional receipt, and participants | FR-003–FR-005 | Java Swing MVP |
| Notifications when another group member creates an expense | FR-007 | Java Swing MVP |
| Expense review and approval before balance changes | FR-006 | Single level in MVP; configurable levels in full product |
| Balance owed by each user to every other user | FR-008 | Java Swing MVP |
| Recording payments to settle balances | FR-009 | Java Swing MVP |
| Expense, balance, and payment reports, including date ranges and filters | FR-010–FR-011 | Java Swing MVP |
| Primary web product and Android and iOS apps | FR-012 | Full product, outside desktop MVP |

### Non-Functional Requirements

- **NFR-001**: The system MUST prevent a user from viewing or changing another
  user's private account information or groups they do not belong to. Account
  access MUST require a verified email address, password, and
  authenticator-app code. Users MUST be provided recovery codes if they lose
  access to their authenticator app.
- **NFR-002**: All displayed expense shares and balances MUST use the
  applicable currency precision, and displayed shares MUST reconcile to their
  expense total without unexplained residual amounts.
- **NFR-003**: For a group of up to 50 members and 10,000 recorded expenses,
  at least 95% of ordinary group, balance, and report views MUST be displayed
  within 2 seconds under normal operating conditions.
- **NFR-004**: A member who has access to a group MUST be able to identify
  whether an expense is pending, approved, or rejected and see its submitter
  and review outcome.
- **NFR-005**: The web, Android, and iOS products MUST provide the core
  account, group, expense, balance, payment, notification, approval, and
  reporting capabilities defined in the functional requirements.

### Acceptance Criteria

- **AC-001 (FR-001, FR-002)**: A newly registered user can sign in, create a
  group after verifying their email and completing multi-factor
  authentication with an authenticator-app code, invite another account, and
  see the invitation as pending; the invitee gains group access only after
  accepting; an unrelated account cannot view or modify the group.
- **AC-002 (FR-003, FR-005)**: A valid expense with an optional receipt is
  shown with its amount, date, description, payer, participants, split method,
  and receipt when supplied; when the payer is a participant, only the other
  participants owe their allocated shares to the payer. A zero-value expense
  is accepted and does not change balances; negative amounts and other
  invalid expense data are rejected.
- **AC-003 (FR-004)**: Equal splits allocate the expense across selected
  participants; percentage splits that total exactly 100% allocate the full
  amount. Percentages not totaling 100% are rejected, and rounding never
  leaves the allocated shares unequal to the expense total. Any leftover
  minor units go to the participants with the largest fractional remainders;
  tied remainders go alphabetically by participant name.
- **AC-004 (FR-006, FR-007, FR-008)**: A submitted expense is pending and
  excluded from balances; only its designated reviewer, who is not the
  submitter, can approve it; the group manager designates exactly one
  reviewer in the MVP and all configured reviews are needed in the full
  product before balances change;
  rejection prevents balance changes; group members can see the in-app notice
  and signed-out members receive email.
- **AC-005 (FR-009)**: Recording a valid payment adds it to payment history
  and decreases the corresponding debt by precisely the payment amount.
  Partial payments are accepted; a payment above the current debt is rejected
  without changing the balance.
- **AC-006 (FR-010, FR-011)**: A report includes expense, balance, and payment
  summaries; selecting an inclusive date range and group, member, or activity
  type filters excludes non-matching activity and returns a clear empty
  result when no activity matches.
- **AC-007 (FR-012, NFR-005)**: The product is available through the web,
  Android, and iOS experiences, and an account's authorized core records and
  capabilities remain consistent across them.
- **AC-008 (NFR-001)**: A non-member and a signed-out user cannot view private
  group activity; authorized members can view only their permitted group
  information.
- **AC-009 (NFR-002, NFR-004)**: Representative equal and percentage splits,
  including rounding cases, reconcile exactly; an expense's status and review
  outcome are visible to authorized group members.
- **AC-010 (NFR-003)**: In a performance test using the stated group and
  expense volume, at least 95 out of 100 ordinary group, balance, and report
  views complete within 2 seconds.

### Java Swing MVP Subset

The initial MVP is the Java Swing desktop experience covering **FR-001
through FR-011** and **NFR-001 through NFR-004**: accounts, group membership,
expense entry and receipt attachment, equal and percentage splits, exactly
one review level, notifications, pairwise balances, payments, and
date-filtered and filtered summaries. Notifications remain available in-app
to all group members, and signed-out members receive email. Multiple review levels
are a full-product capability; the MVP has exactly one review level.
**FR-012 and NFR-005 remain full-product requirements**: the
desktop MVP does not deliver or claim web, Android, or iOS support. This
boundary does not remove those original customer requirements.

## Key Entities

- **User account**: A person's identity and private account information.
- **Group**: A shared expense context with a creator/manager, member users,
  and pending invitations.
- **Expense**: A submitted monetary event with payer, date, description,
  participants, split method, optional receipt, and review status.
- **Expense share**: One participant's assigned amount and, for percentage
  splits, their assigned percentage of an expense.
- **Review**: An approval or rejection decision for a submitted expense,
  including reviewer and decision date.
- **Notification**: A notice to group members about a newly submitted
  expense.
- **Balance**: The net amount one user owes another after approved expenses
  and recorded payments.
- **Payment**: A recorded transfer between group members with amount, date,
  payer, and recipient.
- **Report**: A summary of expense, balance, and payment activity for a
  selected user, group, and date range.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time test users can create an account, join
  a group, and submit a valid expense within 5 minutes without assistance.
- **SC-002**: In all acceptance tests, approved equal and percentage expense
  shares reconcile exactly to the original expense amount at the currency's
  minor unit.
- **SC-003**: In all acceptance tests, pending and rejected expenses do not
  change balances; approved expenses and valid payments produce the expected
  pairwise balances.
- **SC-004**: At least 95 of 100 ordinary group, balance, and report views for
  the stated test volume complete within 2 seconds.
- **SC-005**: Test users can identify the status, submitter, payer, participants,
  and share of a selected expense in at least 90% of usability test attempts.
- **SC-006**: The full product passes the same core account and expense
  acceptance scenarios on web, Android, and iOS.

## Assumptions

- A group uses one currency for its expenses and balances; foreign exchange
  conversion is not included.
- An expense has one payer and one or more participating members. The payer
  participates only when explicitly selected; all other participants owe
  their allocated shares to the payer. Zero-value expenses are allowed and
  do not change balances; negative amounts are rejected.
- Equal and percentage split rounding use the largest-remainder method;
  ties are resolved alphabetically by participant name so the result is
  deterministic and the total reconciles.
- The MVP uses one review decision per expense; the full product can configure
  multiple required review levels by group. A submitter cannot approve their
  own expense. Rejected expenses do not affect balances.
- Notifications identify the group and expense, remain available in-app to
  all group members, and are emailed to members who are signed out when an
  expense is submitted.
- An expense date-range filter includes both its start and end dates.
- Reports can be filtered by group, member, and activity type in addition to
  an inclusive date range. Reports are viewed in the product; exporting or
  sharing report files is not required.
- Users have an internet connection when using the product. Offline entry and
  synchronization are not included.
- The MVP is desktop-only and implemented with Java Swing; web, Android, and
  iOS are required for the full product but are outside the MVP deliverable.
- The response-time and usability thresholds in this specification are
  proposed acceptance targets, not values supplied by the customer.

## Open Questions

- Which currencies and currency precision rules must the full product support?
- How should rounding ties be resolved when participants have identical names?
- Should removed group members retain access to historical group activity?
- Are report exports, custom fields, or saved report definitions required?
- Which image formats and maximum receipt image sizes should be accepted?
- What data retention, account recovery, and account deletion policies should
  apply?
