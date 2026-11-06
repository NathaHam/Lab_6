# Human Design Review Checklist

This checklist is a required human review aid, not a completion certificate. Do not mark the proposal accepted until evidence has been examined.

## Requirements and scope

- [ ] Confirm `UserRequirement.md` was treated as customer-outcome authority and `spec.md` as its testable interpretation.
- [ ] Confirm every FR-001–FR-012 and NFR-001–NFR-005 is represented in [traceability.md](./traceability.md).
- [ ] Confirm FR-012/NFR-005 remain full-product web-primary, Android, and iOS commitments and are not represented as delivered by Swing.
- [ ] Confirm single-reviewer MVP and configurable multi-review full-product distinction remains intact.
- [ ] Confirm group invitations grant no access before acceptance.
- [ ] Confirm zero expenses are allowed, negatives rejected, one payer and one-or-more members are required, and payer-self-share semantics are correct.
- [ ] Confirm no unsupported currency, receipt, email-provider, export, FX, or offline-sync policy was invented.

## Money and financial consistency

- [ ] Approve currency codes and minor-unit scale policy before storage/API work.
- [ ] Approve percentage precision and exact `100%` validation.
- [ ] Independently verify equal and percentage largest-remainder calculations using exact arithmetic.
- [ ] Decide identical-name remainder ties without silently adopting an account-ID ordering.
- [ ] Verify payer participation does not create self-debt and expense postings reconcile.
- [ ] Verify pending/rejected expenses have no postings; approved expense posting is atomic and exactly once.
- [ ] Verify partial payments, debt-direction rules, concurrency, and overpayment rejection.
- [ ] Verify payment history is retained and balances can be independently rebuilt from ledger entries.

## Security, privacy, and operations

- [ ] Approve password, TOTP, recovery-code, key custody, rate-limit, session, and account-recovery policies.
- [ ] Verify authorization is enforced by application use cases, not only Swing controls.
- [ ] Review email content for personal/financial/receipt data minimization.
- [ ] Confirm in-app and email recipients are based on an explicitly defined submission-time state.
- [ ] Approve invitation identity, delivery, expiration, revocation, and acceptance policies.
- [ ] Approve removed-member historical access and notification visibility.
- [ ] Approve receipt type/size/scanning/retention/access rules; do not rely on filename or object-key secrecy.
- [ ] Approve audit coverage, data retention/deletion, backup, restore, and key rotation.
- [ ] Approve failure/retry/idempotency behavior for database, storage, and email operations.

## Architecture and implementation readiness

- [ ] Confirm a shared service is appropriate for the multi-user Swing MVP.
- [ ] Decide relational database and deployment/provider; verify transaction/locking semantics.
- [ ] Confirm domain/application rules are testable without Swing and dependencies point inward.
- [ ] Confirm no framework, microservice, or abstraction is added without a requirement.
- [ ] Define report date/time semantics, current-versus-as-of balance behavior, and invalid range behavior.
- [ ] Define NFR-003 normal operating profile and measure at least 95/100 views under two seconds.
- [ ] Inspect existing Maven/source/test artifacts when provided; this workspace currently has none.
- [ ] Validate each PlantUML diagram against the prose and keep the sources together.
- [ ] Ensure verification uses JUnit 5 and GUI-dependent tests are minimized.
- [ ] Perform independent human security/privacy review of the final code and test results.

## Acceptance

- [ ] Resolve all questions identified as blockers in [open-questions.md](./open-questions.md).
- [ ] Record accepted or rejected ADRs and rationale.
- [ ] Do not state tests/builds pass until an implementation exists and has actually been run.
- [ ] Record reviewer, date, decisions, and any follow-up tasks in the project’s approved review process.
