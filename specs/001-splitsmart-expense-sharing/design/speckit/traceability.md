# Requirement Traceability

**Evidence status:** This document proposes design and verification evidence. No implementation or tests exist in the inspected workspace; none of the verification items below are reported as passing.

Source: `UserRequirement.md` -> clarified feature requirements/acceptance criteria in `specs/001-splitsmart-expense-sharing/spec.md` -> design elements below -> future JUnit 5/integration/acceptance evidence. Refer to [design.md](./design.md), [data-model.md](./data-model.md), and [diagrams/](./diagrams/).

## Functional requirements

| Requirement | Scope / spec acceptance | Design elements | Proposed verification evidence |
|---|---|---|---|
| FR-001 | Swing MVP; AC-001, AC-008 | Account, protected password verifier, verified email, authenticator-app TOTP, one-use recovery code, server-side authentication; [ADR-007](./decisions.md#adr-007-credential-and-recovery-protection) | JUnit 5 authentication/account-state tests; integration tests for verification, MFA, recovery-code one-use, and cross-account authorization; no secrets in logs |
| FR-002 | Swing MVP; AC-001 | Manager-authorized invitation and removal, pending invitation grants no access, active membership only after acceptance; [invitation flow](./design.md#5-invitation-workflow) | JUnit 5 manager/non-manager tests; integration test proving invitee has no access before accept and gains access after atomic acceptance; revocation/removal tests |
| FR-003 | Swing MVP; AC-002 | Expense aggregate, nonnegative amount (zero allowed), date/description, one payer, one-or-more eligible participants, payer-self-share rule | JUnit 5 validation and payer-participant cases; submitted expense persistence and zero expense has no balance posting |
| FR-004 | Swing MVP; AC-003, AC-009 | Exact currency minor units, equal/percentage largest remainder, percentage total exactly 100%, alphabetical tie ordering; duplicate-name tie unresolved; [ADR-003](./decisions.md#adr-003-group-scoped-single-currency-and-exact-amounts), [ADR-004](./decisions.md#adr-004-largest-remainder-allocation-and-unresolved-duplicate-name-tie) | JUnit 5 property/edge tests for reconciliation, negative/excess percentages, zero and 1-unit totals, fractional remainders and alphabetical ties; block identical-name exact ties until decided |
| FR-005 | Swing MVP; AC-002 | Optional private `ReceiptReference`, provider-neutral object-storage port, authorization at every read | Integration tests for optional attachment, authorized display, denied non-member retrieval, and configured validation; accepted image types/size await decision |
| FR-006 | Exactly one designated reviewer in MVP; configurable levels full product; AC-004 | Expense lifecycle; reviewer assigned by manager, distinct from submitter; atomic approval/posting; rejection posts nothing; multi-level excluded from MVP | JUnit 5 lifecycle/role tests; transaction rollback, concurrent decision, idempotent approval integration tests; separate full-product multi-review verification |
| FR-007 | Swing MVP; AC-004 and User Story 3 acceptance scenarios 1 and 3 | Submission-time recipient/sign-in snapshot, persistent in-app `Notification`, email outbox only for signed-out recipients; [ADR-009](./decisions.md#adr-009-durable-outbox-for-notices-and-email) | JUnit 5 recipient-selection test; integration tests for in-app availability, signed-out email intent, retry/idempotency and no email-to-signed-in recipient |
| FR-008 | Swing MVP; AC-004, AC-005, AC-009 | Immutable balance ledger; approved expenses and recorded payments only; exclude payer's own share | JUnit 5 ledger/netting tests; independent recomputation compared with pairwise balance view; pending/rejected excluded |
| FR-009 | Swing MVP; AC-005 | Immutable payment history, transactional debt recheck, partial allowed, overpayment rejected | JUnit 5 partial/exact/overpayment/negative/zero/concurrency tests; verify invalid payment leaves history and balance unchanged |
| FR-010 | Swing MVP; AC-006 | Authorized group/user summaries over approved expenses, balances, payments; ledger-derived balances | JUnit 5 summary query tests, integration with mixed expense/payment records and group/member authorization |
| FR-011 | Swing MVP; AC-006 | Inclusive start/end dates and group/member/activity filters, explicit empty result; report date semantics open | JUnit 5 boundary and combined-filter tests, including no-match result and invalid range; verify authorized row filtering |
| FR-012 | Full product; AC-007 | Shared service/domain boundary designed for future web, Android, iOS adapters; Swing desktop explicitly does not satisfy this requirement; [ADR-011](./decisions.md#adr-011-do-not-conflate-swing-mvp-with-platform-commitments) | Full-product acceptance tests on web, Android, and iOS with shared authorized records. Not a Swing MVP verification item. |

## Non-functional requirements

| Requirement | Scope / spec acceptance | Design elements | Proposed verification evidence |
|---|---|---|---|
| NFR-001 | Privacy/authentication/authorization; AC-001, AC-008 | Server-side authentication and resource authorization, verified email/password/TOTP/recovery, least privilege and private receipt reads | JUnit 5 policy tests plus integration security tests for signed-out/nonmember/removed-member access; credential handling/security review |
| NFR-002 | Currency precision and reconciliation; AC-003, AC-009 | Currency-specific scale, exact minor-unit arithmetic, largest remainder, explicit unresolved duplicate-name ties | JUnit 5 split properties and ledger reconciliation against source records; cannot complete until currency and name-tie policies are decided |
| NFR-003 | 95% of ordinary views under 2s at 50 members/10,000 expenses; AC-010 | Indexed bounded queries, pagination, optional rebuildable balance projection; [ADR-010](./decisions.md#adr-010-reports-use-bounded-authorized-queries) | 100-view performance run under documented normal conditions; require >=95 observations <2 sec; include raw latency, environment, and load generator configuration |
| NFR-004 | Visible status, submitter, review outcome; AC-004, AC-009 | Expense status, submitter, designated reviewer, final outcome in authorized detail/list presentation | JUnit 5 application response tests; minimal Swing rendering test for pending/approved/rejected, submitter, and outcome |
| NFR-005 | Full-product platform commitment; AC-007 | Reusable application service boundary; platform clients outside MVP; [ADR-011](./decisions.md#adr-011-do-not-conflate-swing-mvp-with-platform-commitments) | Full-product web/Android/iOS parity acceptance tests. Not satisfied by desktop architecture or Swing tests. |

## Acceptance criteria coverage index

| Spec AC | Covered requirements | Design verification location |
|---|---|---|
| AC-001 | FR-001, FR-002 | Account/invitation use cases; authentication and authorization tests |
| AC-002 | FR-003, FR-005 | Expense validation, allocation snapshot, receipt access tests |
| AC-003 | FR-004 | Split arithmetic tests; duplicate-name decision blocker |
| AC-004 | FR-006, FR-007, FR-008 | Review/notification/balance sequence and transactional tests |
| AC-005 | FR-009 | Payment/balance tests, including partial and overpayment behavior |
| AC-006 | FR-010, FR-011 | Filtered report query and inclusive-boundary tests |
| AC-007 | FR-012, NFR-005 | Full product only; not a desktop MVP claim |
| AC-008 | NFR-001 | Cross-user/nonmember authorization tests |
| AC-009 | NFR-002, NFR-004 | Split reconciliation and visible state/review result tests |
| AC-010 | NFR-003 | Defined 100-view workload and latency report |

## Verification constraints

- JUnit 5 is mandatory; business/money tests must not require constructing or showing Swing.
- Financial integration tests require a transaction-capable persistence implementation after database selection.
- Human review remains mandatory for AI-generated design and test evidence.
- A requirement with unresolved policy is not considered fully verified merely because a default was coded.
