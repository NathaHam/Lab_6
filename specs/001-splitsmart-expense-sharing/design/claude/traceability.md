# SplitSmart — Requirement Traceability (Claude independent proposal)

**Status**: Draft, AI-generated. Requires human review (Constitution VIII
and IX).

The chain runs **customer source → spec requirement → acceptance criteria →
design element → diagram → proposed verification**. Implementation evidence
columns will be filled in once code exists. **No test exists yet, and none
is claimed to pass.**

**Scope key:**

| Key | Meaning |
|---|---|
| **MVP** | Java Swing MVP |
| **FULL** | Full product, outside the Swing MVP |
| **MVP+FULL** | The MVP delivers part of the requirement; the rest is full product |

## 1. Matrix

| Req | Customer source (`UserRequirement.md`) | Spec AC / scenarios | Scope | Design elements | Diagrams | Proposed verification (JUnit 5 unless noted) |
|---|---|---|---|---|---|---|
| **FR-001** Verified email, password, authenticator-app MFA, recovery codes | "User accounts … log in and access their own expense and balance information" | AC-001, AC-008 | MVP | design §9.1–9.4; `AccountService`; ADR-011; data-model §3.1–3.2 | use-case, auth-mfa-sequence, components | `AccountLifecycleTest`, `TotpTest` (RFC 6238 vectors, replay), `PasswordHasherTest`, `RecoveryCodeTest`, `EmailVerificationTest` (expiry, single use, generic duplicate response) |
| **FR-002** Manager invites and removes; invitee accepts before access | "Group management … create and manage groups" | AC-001; edge cases: pending, declined, revoked | MVP | design §2 GroupService, §8.5; `Group` aggregate; data-model §3.3; OQ-10/11/25/26 | use-case, domain-class, invitation-state | `GroupInvitationTest` (accept → access; decline/revoke → none; non-manager cannot invite or remove; duplicate pending invite rejected), `InvitationRaceTest` (accept vs revoke) |
| **FR-003** Nonnegative amount (zero allowed), date, description, method, one payer, ≥1 member participants; payer may participate without owing own share | "Expense creation … amount, date, description … specify which other users were involved" | AC-002; edge cases: negative, no participants, non-members | MVP | design §4.1, §3.5; `Expense` invariants; data-model §3.4–3.5 | expense-review-activity, expense-review-sequence, domain-class | `SubmitExpenseValidationTest` (negative rejected, zero accepted, empty participants, duplicate participant, non-member payer/participant, missing date or description), `PayerShareTest` |
| **FR-004** Equal and % splits; % totals exactly 100; largest remainder at the minor unit; ties alphabetical; identical names unresolved | "shared manner (equally split or split by %)" | AC-003, AC-009, SC-002 | MVP | design §3.1–3.4; `ShareAllocator`; ADR-003/004/005; OQ-01/02/21 | domain-class, expense-review-activity | `ShareAllocatorTest` (vectors E1–E9, 10,000 seeded random reconciliation cases, shuffle invariance, ambiguity detection), `MoneyTest`, `PercentageTest` |
| **FR-005** Optional receipt image shown with the expense | "an optional receipt image" | AC-002; edge case: missing, unreadable, unsupported | MVP | design §10; `ReceiptStore` port; ADR-012; data-model §3.4 receipt columns; OQ-08 | components, deployment, expense-review-sequence | `ReceiptPolicyTest` (size, magic bytes, undecodable, dimensions), `ReceiptAccessTest` (members only; non-member gets NotFound), `ExpenseWithoutReceiptTest` |
| **FR-006** Pending excluded from balances; MVP: exactly one manager-designated reviewer who is not the submitter; FULL: multiple required levels | "Approval workflow … multiple levels of approval or a single review process" | US2 AS1/AS2/AS5, AC-004, SC-003 | **MVP+FULL** (single level is MVP; multi-level is FULL) | design §4.2–4.4; `ApprovalPolicy`/`SingleReviewerPolicy`; ADR-009; `review_record.level`; OQ-12/13/14/31 | expense-state, expense-review-activity, expense-review-sequence | `ReviewServiceTest` (submitter cannot be designated, non-designated member denied with state unchanged, approve/reject idempotence, stale version, terminal states), `PendingExcludedFromBalanceTest`. FULL: `MultiLevelPolicyTest` (pending until all levels approve) |
| **FR-007** In-app notice to other members; email to members signed out at submission | "notify users when other group members create a new expense" | US3 AS1/AS3, AC-004; conflicts C-1, C-2 | MVP | design §7; `NotificationService`, `OutboxDispatcher`, `EmailGateway`; ADR-010; data-model §3.10; OQ-15–18/27 | notification-sequence, components, deployment | `NotificationRecipientsTest` (signed-in members get in-app only; signed-out members get in-app plus one email; submitter excluded), `NoticePersistsAfterSignInTest`, `OutboxDispatcherTest` (backoff, FAILED after max attempts, lease race) |
| **FR-008** Pairwise net balances from approved expenses and recorded payments only | "Balance tracking … owed by each user to every other user" | US1 AS2, AC-004, SC-003; conflict C-3 | MVP | design §5; `LedgerEntry`, `PairBalance`, `BalanceCalculator`; ADR-006; OQ-04 | payment-balance-sequence, payment-settlement-activity, domain-class | `BalanceCalculatorTest`, `ApprovalPostingTest` (non-payer shares only, zero shares not posted), `ProjectionReconciliationTest` (projection equals ledger fold over random histories), `DuplicatePostingTest` |
| **FR-009** Partial payments up to the outstanding debt; reject overpayment; preserve history | "Payment tracking … record when payments have been made" | US2 AS3/AS4, AC-005; edge case: zero, negative, overpayment | MVP | design §6, §8; `PaymentService`; ADR-007/008; data-model §3.7–3.9; OQ-19/20 | payment-settlement-activity, payment-balance-sequence | `PaymentServiceTest` (partial, full, overpay rejected with balance unchanged, no debt, zero/negative, self, non-member), `ConcurrentPaymentTest` (2×60 vs 100: exactly one succeeds), `IdempotentPaymentTest`, `PaymentHistoryImmutableTest` |
| **FR-010** Summaries of expenses, balances, payments for a group and for a user | "Reporting … reports and summaries of their expenses, balances, and payments" | US3, AC-006 | MVP | design §11; `ReportService.groupSummary/personalSummary`; ADR-014; OQ-23 | use-case, components | `GroupSummaryTest`, `PersonalSummaryTest` (per-currency totals, never summed across currencies; pending excluded from totals) |
| **FR-011** Filtered report: inclusive date range plus group, member, activity type | "custom reports with specified date ranges and other parameters" | US3 AS2, AC-006; edge case: empty range, no activity | MVP | design §11; `ReportCriteria`, `DateRange`; data-model §5 indexes; OQ-23/24/36 | use-case | `ReportFilterTest` (start and end dates included, day before and after excluded; group, member, type filters; empty result message; start > end rejected; non-member group gives NotFound) |
| **FR-012** Web-primary product plus Android and iOS apps | "primary web-based and also comes with app that can be run on Android and IOS" | US4, AC-007, SC-006 | **FULL. Not satisfied by the Swing MVP.** | architecture §2, §8; ADR-002 (server API), ADR-016; OQ-32 | deployment (full-product nodes), context | Full product: re-run the AC-001 to AC-010 acceptance suites against the web, Android, and iOS clients (SC-006); contract tests on the server API. **Nothing in the MVP counts as evidence for FR-012.** |
| **NFR-001** Privacy, authentication, authorization | "access their own expense and balance information" | AC-008, AC-001 | MVP (and FULL on every client) | architecture §3.3 trust boundaries; design §9.5 `AccessPolicy`; ADR-002/011/012; OQ-09/10/17/29/30 | context, deployment, auth-mfa-sequence | `AccessPolicyTest` (non-member, pre-acceptance invitee, removed member, signed-out user are all denied with no existence leak), `SessionTest` (PASSWORD_OK session cannot call business operations), `LogRedactionTest`; manual security review checklist |
| **NFR-002** Currency precision and reconciliation | (implied by balance accuracy) | AC-009, SC-002 | MVP | design §3; `Money`, `CurrencyUnit`; ADR-003/004/005; data-model §1; OQ-03/22 | domain-class | `MoneyTest` (excess scale rejected, no cross-currency arithmetic), `ShareAllocatorTest` reconciliation property, `MoneyFormatTest` (display at currency scale), `NoFloatingPointMoneyTest` (source scan) |
| **NFR-003** 95% of ordinary views < 2 s at 50 members and 10,000 expenses | (spec proposal, C-7) | AC-010, SC-004 | MVP (FULL needs re-measuring per client) | design §11 performance, §13 SwingWorker; data-model §5; ADR-006/014; OQ-33 | deployment | `PerformanceProfileTest` (`-Pperf`, `@Tag("perf")`, 100 mixed views, ≥95 under 2 s, measured at the client facade); presenter tests verifying no EDT I/O |
| **NFR-004** Visible status, submitter, review outcome | "reviewing and approving expenses" | AC-009, SC-005 | MVP | design §4.3, §13; expense DTO fields; data-model §3.4/3.6 | expense-state | `ExpenseDetailQueryTest` (status, submitter, reviewer, decision, date returned to members), `ExpenseDetailPresenterTest` (status badge text); SC-005 usability test (manual) |
| **NFR-005** Web, Android, iOS provide all core capabilities | "OS supported" | AC-007, SC-006 | **FULL. Not satisfied by the Swing MVP.** | ADR-016; architecture §8 | deployment | Full product: per-platform acceptance runs of the FR-001 to FR-011 scenarios. Not part of MVP verification. |

## 2. Coverage check

| Check | Result |
|---|---|
| Every FR-001 to FR-012 row present | Yes (12 of 12) |
| Every NFR-001 to NFR-005 row present | Yes (5 of 5) |
| Full-product items marked | FR-006 multi-level part, FR-012, NFR-005 (and per-client re-checks of NFR-001 and NFR-003) |
| Every AC-001 to AC-010 referenced | AC-001 (FR-001, FR-002, NFR-001); AC-002 (FR-003, FR-005); AC-003 (FR-004); AC-004 (FR-006 to FR-008); AC-005 (FR-009); AC-006 (FR-010, FR-011); AC-007 (FR-012); AC-008 (FR-001, NFR-001); AC-009 (FR-004, NFR-002, NFR-004); AC-010 (NFR-003) |
| Requirements whose design depends on open decisions | FR-004 (OQ-01, OQ-02), FR-008 and FR-009 (OQ-04), FR-005 (OQ-08), FR-007 (OQ-15 to OQ-18), FR-011 (OQ-23), NFR-001 (OQ-05, OQ-09, OQ-29, OQ-30) |

## 3. Implementation evidence

To be completed during implementation. Each row will record:

- the Maven module and class implementing the requirement;
- the test class and method names;
- the test run identifier and result, recorded by a human reviewer;
- the reviewer's name and date (Constitution IX).
