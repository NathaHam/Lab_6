# SplitSmart — Open Questions, Conflicts, and Assumptions (Claude independent proposal)

**Status**: Draft, AI-generated. Requires human review.

## Owners

| Role | Decides |
|---|---|
| **Customer / Product Owner (PO)** | Product behaviour |
| **Tech Lead (TL)** | Engineering choices (the instructor or team lead in a course setting) |
| **Security Reviewer (SR)** | Security and privacy choices |
| **Ops** | Hosting and providers |

## Timing

| Value | When the decision is needed |
|---|---|
| **T0** | Before implementation starts |
| **T1** | Before the affected component is implemented |
| **T2** | Before the MVP is accepted |
| **T3** | Before full-product work |

## 1. Conflicts and inconsistencies found in the sources

| ID | Conflict | Where | Design handling | Owner, timing |
|---|---|---|---|---|
| C-1 | **US1 AS2** says that when an expense is approved, "group members are notified". **FR-007** requires notification only on *submission*. | spec.md | Submission notices are required. In-app decision notices are proposed behind a flag; no approval email is sent. | PO, T1 |
| C-2 | **FR-007** says "notify the *other* members", but also "remain available in-app to *all* group members". | spec.md | Other members receive notices. The submitter sees the expense in their list. | PO, T1 |
| C-3 | **UserRequirement** says balances take "into account all expenses that have been entered". The **spec** says approved expenses only. | UserRequirement vs FR-008 | Follows the spec, which combines the customer's approval-workflow feature with balance tracking. Recorded so a human can confirm. | PO, T0 |
| C-4 | Clarification Q3 says "stable participant order". The later clarification and FR-004 say alphabetical by name. | spec.md clarifications | Uses alphabetical order, the later and more specific clarification. Identical names remain open (OQ-01). | PO, T0 |
| C-5 | A Swing **desktop** MVP must email members who are signed out and enforce multi-user privacy. That implies a shared server-side component, which neither source names. | FR-007, NFR-001 vs "desktop MVP" | ADR-002 option B recommended. | TL, T0 |
| C-6 | Spec edge cases list "rejected expense later edited and resubmitted" and "payment is zero" without stating the expected outcome. | spec.md edge cases | Proposals in OQ-13 and OQ-20. | PO, T1 |
| C-7 | NFR-003 and SC thresholds are "proposed acceptance targets, not values supplied by the customer". | spec.md Assumptions | Design targets them, but the customer must confirm them. | PO, T2 |
| C-8 | Environment: the installed JDK is 25, while the constitution requires a Java 21 target. | repository/machine | Use `maven.compiler.release=21`. CI should also run on a JDK 21. | TL, T0 |

## 2. Open questions

| ID | Question | Impact if unresolved | Proposed default (not decided) | Owner | Timing |
|---|---|---|---|---|---|
| OQ-01 | **Identical-name tie-break**: how are leftover minor units assigned when tied participants have identical names? | Some expenses cannot be submitted (fail closed). | None. Candidates: unique display names per group, user ID, join order, submitter choice. | PO | T0 |
| OQ-02 | What counts as "alphabetical"? Case sensitivity, accents, locale. | Different tie results, and test vectors. | `Collator(Locale.ROOT, TERTIARY)` on the display-name snapshot | PO + TL | T1 |
| OQ-03 | **Which currencies, and which precision rules?** | Group creation, `Money` scale, storage width. | Configurable list; scale from ISO 4217 minor units | PO | T1 |
| OQ-04 | **Balance scope**: are pairwise balances and the payment cap per group or across groups (in the same currency)? | Overpayment rule, balance views, data model. | Per group; personal view itemised per currency and group | PO | T0 |
| OQ-05 | Is a server component acceptable for the "desktop" MVP (ADR-002)? | NFR-001 enforceability, email retries, full-product reuse. | Option B | TL + PO | T0 |
| OQ-06 | **Database technology** | Persistence adapter, isolation semantics. | None. Must satisfy data-model.md §6 | TL/Ops | T1 |
| OQ-07 | **Email provider**, sender identity, deliverability | `EmailGateway` adapter | None | Ops | T1 |
| OQ-08 | **Receipt storage provider**, accepted image formats, maximum size and dimensions, and whether to strip metadata | `ReceiptStore` adapter, `ReceiptPolicy` values | Store: none. Validate formats the JDK can decode; strip EXIF | PO + Ops + SR | T1 |
| OQ-09 | **Retention and deletion**: accounts, receipts (including orphans), sessions, processed commands, notifications, outbox; account recovery after losing both factors | Privacy compliance, storage growth | None | PO + SR | T2 |
| OQ-10 | Do removed members keep access to historical group activity? | Authorization rules, UI | No access | PO | T1 |
| OQ-11 | Can a member with a non-zero balance, a pending expense, or an open reviewer designation be removed? What happens to those items? | Data integrity, balances shown with ex-members | Allowed. Balances and history remain visible to the remaining members; the manager must re-designate any pending reviewer | PO | T1 |
| OQ-12 | Is the reviewer designated **per expense** or as a **standing per-group** designation? What happens when no eligible reviewer exists (one-member group, or the reviewer is the submitter)? | Review latency, UX | Standing reviewer when not the submitter, otherwise the manager designates per expense; show "No eligible reviewer" | PO | T1 |
| OQ-13 | Semantics of resubmitting a rejected expense | State machine, history | A new expense with `supersedesExpenseId`; the rejected one stays terminal | PO | T1 |
| OQ-14 | May a pending expense be edited or withdrawn by its submitter? | State machine | Not supported | PO | T2 |
| OQ-15 | Send notifications on approval or rejection (C-1)? In-app, email, or both? | Notification types | In-app only, behind a flag | PO | T1 |
| OQ-16 | Should the submitter also receive their own notice (C-2)? | Recipient set | No | PO | T2 |
| OQ-17 | What may an email contain (amount, description, names)? | Privacy (NFR-001) | Group name, description, submitter name; no amount or receipt | PO + SR | T1 |
| OQ-18 | Definition of **signed out**: session idle and absolute timeouts; whether a closed client counts as signed out | Who receives email | No active FULL session; 30 min idle and 12 h absolute (placeholders) | PO + SR | T1 |
| OQ-19 | Who may record a payment (payer, recipient, a third party)? Is recipient confirmation required? How are mistaken payments corrected? | Authorization, history | Payer or recipient; no confirmation; no correction in the MVP | PO | T1 |
| OQ-20 | Reject zero-value payments? | Validation | Reject amounts ≤ 0 | PO | T1 |
| OQ-21 | Maximum percentage scale; may a participant have 0%? | Validation, storage `decimal(7,4)` | Scale ≤ 2; each share > 0 | PO | T1 |
| OQ-22 | Maximum expense amount | Validation, storage | 15 integer digits | PO + TL | T1 |
| OQ-23 | Report semantics: match on expense date or approval date; meaning of "balance" inside a date range; member-filter scope; whether pending and rejected expenses can appear | Report correctness (FR-010, FR-011) | Expense and payment dates; period net change plus a separate current balance; member = any involvement; pending and rejected listed with labels, excluded from totals | PO | T1 |
| OQ-24 | Are report export, saved reports, or custom fields required? (spec OQ) | Scope | Not included | PO | T2 |
| OQ-25 | Multiple managers per group? Transferring the manager role? Removing the last manager or oneself? | Group invariants | Creator is the sole manager; the last manager cannot be removed | PO | T1 |
| OQ-26 | Do invitations expire? Can someone without an account be invited (by email)? | Invitation flow | Invite by email; the invitee registers, then accepts; no expiry | PO | T1 |
| OQ-27 | Email retry schedule, maximum attempts, who monitors `FAILED` messages | Operations | 6 attempts (1 m, 5 m, 30 m, 2 h, 12 h); logged plus metric | Ops | T1 |
| OQ-28 | Remote protocol and library for the server API (if option B) | Client and server adapters | JDK-only HTTP with JSON is possible; a JSON library choice is needed | TL + SR | T1 |
| OQ-29 | Password policy, lockout and throttling thresholds | Security, UX | Minimum 12 characters; 5 failures per 15 min, then a backoff lockout | SR | T1 |
| OQ-30 | Encryption key management for TOTP secrets | Security | Environment-provided key with `key_id` for rotation | SR + Ops | T1 |
| OQ-31 | Full product: semantics of multi-level review (sequential or parallel, rejection at any level, who configures it) | `MultiLevelPolicy` | Sequential; any rejection rejects | PO | T3 |
| OQ-32 | Full product: web and mobile technology stack, push notifications, browser and OS support matrix | FR-012, NFR-005 | None | PO + TL | T3 |
| OQ-33 | NFR-003 "normal operating conditions": hardware, network, data distribution | Performance test validity | Defined in the `-Pperf` README when implemented | PO + TL | T2 |
| OQ-34 | Can a group's currency change before any expense exists? | Group invariants | Yes before the first expense, no after | PO | T2 |
| OQ-35 | Show a QR code at TOTP enrollment (needs a library or custom encoder)? | Usability vs dependencies | Text secret plus `otpauth` URI only | TL + PO | T1 |
| OQ-36 | Time zone used to interpret expense, payment, and report dates | Inclusive range boundaries | Dates are calendar dates entered by the user, with no time zone; `submittedAt` is UTC | PO | T1 |
| OQ-37 | Is the email local part case-sensitive for uniqueness? | Duplicate accounts | Case-insensitive | SR | T1 |

## 3. Assumptions made by this design

Each assumption below needs confirmation.

1. Members use the product online (spec Assumption); there is no offline
   mode.
2. Average participants per expense is about 5, which was used for volume
   estimates.
3. Payer and participants must be active members at submission. A later
   removal does not invalidate the expense.
4. The manager may designate themselves as reviewer when they are not the
   submitter.
5. A reviewer can be re-designated while the expense is pending.
6. `APPROVED` and `REJECTED` are terminal states.
7. The group creator is its first manager.
8. Display-name snapshots taken at submission are the "participant name"
   used for tie ordering.
