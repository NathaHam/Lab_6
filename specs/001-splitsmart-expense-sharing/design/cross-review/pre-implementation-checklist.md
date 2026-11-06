# SplitSmart — Pre-Implementation Gate Checklist

**Purpose:** A human approval and readiness checklist derived from the source requirements, constitution, and cross-review. This is not a completion certificate. Do not mark an item complete without evidence.

## A. Source, scope and governance

- [ ] Confirm `UserRequirement.md` remains the authoritative customer-outcome source.
- [ ] Confirm the clarified `spec.md` remains consistent with the source and has not silently narrowed customer commitments.
- [ ] Confirm Java Swing MVP covers FR-001–FR-011 and NFR-001–NFR-004.
- [ ] Confirm FR-012/NFR-005 remain full-product commitments: web-primary plus Android and iOS.
- [ ] Confirm multi-level approval is full-product scope; the MVP has exactly one manager-designated reviewer per expense, not the submitter.
- [ ] Confirm no AI-generated design is accepted without a named human reviewer (Constitution IX).
- [ ] Record the human disposition for all blocking decision-log entries before implementation begins.
- [ ] Keep implementation evidence separate from design proposals; do not claim builds/tests pass until run.

## B. Architecture and delivery boundary

- [ ] Approve the deployment topology for a multi-user MVP.
- [ ] If using a shared service, ensure Swing clients never hold direct database credentials.
- [ ] Define authenticated/encrypted client-service communication, session lifecycle and error handling.
- [ ] Confirm server-side authorization is applied to every protected use case and query.
- [ ] Confirm application/domain operations can be tested without constructing Swing.
- [ ] Confirm Swing event handlers/views do not calculate shares, balances, or authorization.
- [ ] Confirm one deployable service is sufficient for MVP; justify any microservice/framework/module complexity.
- [ ] Decide whether Claude's JPMS/multi-module structure is justified; keep Maven release at Java 21.
- [ ] Define API DTO and idempotency contract before remote client implementation.

## C. Money, splits and financial domain

- [ ] Approve supported currency codes and authoritative minor-unit scale metadata.
- [ ] Approve amount bounds, input precision, percentage precision and zero-percent participant policy.
- [ ] Confirm every monetary path uses `BigDecimal`; prohibit `float`/`double`.
- [ ] Confirm currency scale/rounding policy is explicit and no user input is silently rounded.
- [ ] Independently verify equal split quotient/remainder and percentage largest-remainder algorithms.
- [ ] Confirm alphabetical ordering normalization/case/accent/locale and participant-name snapshot timing.
- [ ] Resolve identical participant-name remainder ties with a human-approved stable rule; until then, fail closed where ambiguous.
- [ ] Verify shares are nonnegative and sum exactly to expense amount at minor-unit precision.
- [ ] Verify payer-as-participant share is displayed/allocated but does not become self-debt.
- [ ] Verify zero expense is accepted and creates no financial posting; negative expense is rejected.
- [ ] Decide whether pairwise balances and payment cap are group-scoped or cross-group.
- [ ] Verify pending/rejected expenses never affect balances; approval posts exactly once.
- [ ] Verify payment partial settlement, exact settlement, overpayment rejection, invalid amount behavior, and immutable history.
- [ ] Decide payment actor authority, recipient confirmation and correction/void process.
- [ ] Ensure ledger postings and any balance projection reconcile and can be independently rebuilt.

## D. Transaction, concurrency and idempotency

- [ ] Select persistence technology only after confirming ACID transaction, uniqueness and lock/CAS requirements.
- [ ] Define the transaction boundary for expense approval, rejection, payment and submission/outbox.
- [ ] Ensure approval status and all ledger postings commit or roll back together.
- [ ] Ensure payment record, counter-posting, projection and audit commit or roll back together.
- [ ] Enforce unique source posting keys and stable idempotency keys at persistence boundary.
- [ ] Test duplicate command replay and repeated approval/payment requests.
- [ ] Test two concurrent reviewers on one pending expense; at most one decision/posts.
- [ ] Test concurrent payments that jointly exceed debt; total accepted payment never exceeds current debt.
- [ ] Test membership removal racing with expense submission/review.
- [ ] Test outbox lease, retry, duplicate delivery and permanent failure behavior.
- [ ] Define database migration, backup, restore, reconciliation and operational ownership.

## E. Accounts, security and privacy

- [ ] Approve verified-email/password/authenticator-app MFA enrollment and sign-in flows.
- [ ] Security reviewer approves password hashing algorithm/parameters and migration strategy.
- [ ] Security reviewer approves TOTP profile, time window, replay prevention and secret encryption/key custody.
- [ ] Define recovery-code generation, one-use, regeneration, loss-of-both-factors and account recovery policy.
- [ ] Define session token storage, idle/absolute expiry, revocation, multi-device semantics, rate limiting and lockout.
- [ ] Confirm credentials, MFA secrets, recovery codes, session tokens and receipt bytes are never logged.
- [ ] Confirm non-members, signed-out users and pre-acceptance invitees cannot read private group data.
- [ ] Confirm removed-member historical access and notification access policy.
- [ ] Review audit fields for financial/security events and minimize personal data.
- [ ] Approve retention, deletion, backup, restore, key rotation and account deletion policy.

## F. Groups, invitations and review

- [ ] Define manager multiplicity, transfer and last-manager removal behavior.
- [ ] Define invitation identity matching, delivery channel, expiry, duplicate, decline, revoke and accept-race behavior.
- [ ] Verify invite acceptance and membership activation are atomic and idempotent.
- [ ] Define how outstanding balances, pending expenses and reviewer assignments behave when a member is removed.
- [ ] Enforce exactly one reviewer assignment per submitted MVP expense, selected/designated by the manager.
- [ ] Enforce reviewer differs from submitter and is eligible for that group/expense.
- [ ] Ensure non-designated members cannot approve/reject.
- [ ] Decide expense correction/resubmission/withdrawal policy without rewriting historical financial records.
- [ ] Defer multi-level approval details to a separate full-product decision/design.

## G. Notifications and receipts

- [ ] Define “signed out” at submission time, including multiple sessions/devices and exact snapshot instant.
- [ ] Confirm notification recipients satisfy “other group members”; decide whether submitter receives an in-app copy.
- [ ] Persist in-app notices and email outbox intents transactionally with expense submission.
- [ ] Email signed-out recipients only; ensure retries cannot repeat financial operations.
- [ ] Approve email provider, sender domain, content minimization, retry schedule, alerting and delivery monitoring.
- [ ] Keep approval/rejection notices out of scope unless separately approved.
- [ ] Approve receipt provider, accepted image formats, byte/pixel limits, scanning and metadata policy.
- [ ] Ensure receipt storage is private and every read rechecks group authorization.
- [ ] Define upload failure/orphan cleanup, retention, deletion and backup behavior.

## H. Reports and performance

- [ ] Define which date field drives expense/payment report filtering and the timezone/calendar boundary.
- [ ] Confirm date ranges are inclusive at both ends and invalid ranges are rejected.
- [ ] Define member filter semantics and behavior for empty reports.
- [ ] Decide whether report balances are current or as-of selected end date; separate period activity from current balance if needed.
- [ ] Ensure reports apply authorization before returning rows and do not leak other groups.
- [ ] Define NFR-003 “normal operating conditions”: hardware, network, concurrency, dataset and query mix.
- [ ] Define whether latency is measured at server, client facade or full Swing user-visible boundary.
- [ ] Run 100 representative views at 50 members/10,000 expenses; demonstrate at least 95 under 2 seconds.
- [ ] Publish raw latency, environment, test data generation and reproducible test instructions.

## I. Build, tests, diagrams and review evidence

- [ ] Create/verify Maven project with Java 21 release configuration.
- [ ] Use JUnit 5 for domain, application, integration and acceptance tests.
- [ ] Keep money/business tests independent of Swing; minimize GUI-dependent tests.
- [ ] Add tests for all FR/NFR rows in `requirement-matrix.md`; map tests back to requirement IDs.
- [ ] Add source-level guard against `float`/`double` in money paths.
- [ ] Keep PlantUML source in repository and validate syntax/render in CI.
- [ ] Inspect every rendered diagram against architecture prose, data model and state transitions.
- [ ] Reconcile naming differences (e.g. `PENDING` vs `PENDING_REVIEW`) across model, DTO, persistence, diagrams and tests.
- [ ] Add database adapter contract tests and verify isolation/locking behavior against the selected store.
- [ ] Perform human security/privacy review and record reviewer/date/findings.
- [ ] Record accepted ADRs, rejected alternatives, open questions, owners and follow-up actions.

## J. Full-product gate (not required to accept the Swing MVP)

- [ ] Define primary web client architecture and supported browsers.
- [ ] Define Android/iOS technology, OS support and release expectations.
- [ ] Confirm shared service/API and consistent domain rules across all clients.
- [ ] Design configurable multiple approval levels, reviewer assignment, sequencing and rejection semantics.
- [ ] Define any additional push-notification channels.
- [ ] Re-run core acceptance scenarios on web, Android and iOS; Swing tests do not satisfy FR-012/NFR-005.

## Final human disposition

- Reviewer: ______________________________
- Role: __________________________________
- Date: __________________________________
- Decision: ☐ Ready for implementation ☐ Ready with conditions ☐ Needs revision ☐ Blocked
- Blocking decisions remaining: ______________________________________________
- Approved architecture baseline / ADRs: ______________________________________
- Follow-up owner and due date: _______________________________________________

**Gate status at time of this AI review: BLOCKED pending human decisions and approval.** This status concerns design approval/readiness, not a claim that source requirements cannot be implemented.
