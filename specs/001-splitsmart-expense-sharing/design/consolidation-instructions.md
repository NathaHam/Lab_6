# Claude Code Reconciliation Instructions — SplitSmart Final Design

**Repository:** `NathaHam/Lab_6`  
**Target branch:** `main`  
**Source baseline:** `UserRequirement.md`, `.specify/memory/constitution.md`, `specs/001-splitsmart-expense-sharing/spec.md`, both proposal sets under `design/speckit/` and `design/claude/`, and the four reports under `design/cross-review/`.  
**Human architecture decision:** Use Spec Kit as the simpler MVP baseline. Adopt Claude Code's stronger value-object modelling, idempotency, concurrency control, and security treatment. The approved deployment direction is a thin Java Swing client calling a shared application server; clients must not connect directly to the database or contain database credentials.

## Mission

Produce one coherent, implementation-ready **final design package**. Reconcile—not concatenate—the two proposals. Preserve customer scope and Constitution v1.0.0. Update the existing `specs/001-splitsmart-expense-sharing/spec.md` with the reconciled functional and non-functional requirements, and place the complete final package under:

`specs/001-splitsmart-expense-sharing/design/final/`

Do not implement application code. Do not modify `UserRequirement.md` or the Constitution. Do not overwrite the original `speckit/`, `claude/`, or `cross-review/` evidence.

## Authority and precedence

Apply this order when material conflicts arise:

1. `UserRequirement.md` is authoritative for customer outcomes.
2. The human clarifications and explicit architecture decision in this instruction govern the clarified requirements and selected architecture.
3. The Constitution governs implementation constraints (Java 21, Maven, Swing presentation-only for MVP, object-oriented design, GUI/business separation, BigDecimal, JUnit 5, PlantUML, traceability, human review).
4. The current `spec.md` contains clarified requirements; retain valid clarifications and update contradictions.
5. The cross-review reports identify defects, gaps and unresolved product decisions.
6. Proposal details are recommendations, not requirements or approved decisions unless explicitly adopted below.

If information is not settled by these sources, **do not invent a product policy**. Make the design safe and internally consistent, record the decision as open with owner/impact/default-safe behavior, and isolate it behind a policy/configuration boundary where practical. Do not label an unresolved assumption as approved.

## Required reconciliation

### Adopt

- Spec Kit's straightforward four-layer structure and MVP-sized design; avoid unnecessary microservices, frameworks, or abstraction.
- Thin Swing presentation -> application/use-case layer -> domain model -> infrastructure adapters, with a shared server as the trusted boundary.
- Claude's explicit immutable identifiers/value objects and domain types where they encode invariants.
- Claude's command idempotency, optimistic versioning/locking, stable command IDs, unique source-posting constraints, concurrency scenarios, and detailed security/session threat treatment.
- Append-only financial ledger as source of truth; any balance projection must be optional, atomically maintained, and rebuildable. Start with ledger-derived balances unless performance evidence justifies a projection.
- Provider-neutral ports for email and private receipt storage; transactional outbox for durable notifications.
- Java 21, Maven, JUnit 5, PlantUML, and traceability from requirement -> design -> test.

### Resolve known proposal conflicts

- **Reviewer assignment:** For every Swing MVP expense, the manager designates exactly one reviewer for that expense; reviewer must be eligible and different from submitter. Any standing group reviewer is only a convenience/default copied into and confirmed as the expense's explicit assignment; it is never the source of review authority. Full-product multiple review levels remain configurable future scope; document extension points without designing speculative policy.
- **Decision notifications:** FR-007 requires submission notices. Approval/rejection notices are not required by the source; omit them from MVP mandatory behavior and mark them optional only if product later approves.
- **Expense lifecycle:** pending and rejected expenses never create balance postings. Approval posts exactly once. Keep decision and postings atomic. Do not silently edit/reopen terminal records; correction/resubmission policy remains an explicit decision if not specified.
- **Money:** use BigDecimal and exact minor-unit arithmetic; no float/double. Equal and percentage splits must reconcile exactly. Percentage total is exactly 100%. Largest remainder assigns residual minor units; equal fractional remainders use alphabetical participant-name order. The payer may participate, but their own share is not a debt to themselves. Negative expenses are rejected; zero expenses are accepted and create no balance change.
- **Identical names/collation:** alphabetical ordering is required, but identical-name tie resolution, case/accent/locale normalization and snapshot semantics are not approved. Do not invent a user-ID, join-order, locale or database-collation tie-break. Fail closed if an unresolved tie can change allocation; record the precise decision needed.
- **Currency/precision:** one currency per group; no FX. Do not assume a currency catalogue, scale source, amount bound, decimal column width, percentage input precision or zero-percent policy beyond what source explicitly states. Record these for product/technical approval; do not hard-code Claude's proposed decimal(18,4) or strictly-positive percentage shares as requirements.
- **Balances/payments:** pending/rejected expenses excluded; only approved expense obligations and recorded payments affect balances. Partial payments are allowed up to outstanding debt; reject overpayment without mutation. Make payment and counter-posting atomic, idempotent and serialized against concurrent debt changes. Per-group versus cross-group netting, payment actor authority, confirmation, zero/negative payment rule, and correction/void policy remain explicit decisions unless the source already settles them. Never rewrite financial history.
- **Notifications:** persistent in-app notices plus email for members who are signed out when the expense is submitted. Define a safe, testable recipient snapshot at submission; if session semantics/multi-device rules are not approved, record them as open and avoid pretending an arbitrary timeout is a customer decision. Notification/outbox creation must be durable and idempotent.
- **Security:** enforce authentication and resource-level authorization on the server for every operation and receipt read. Include verified email/password, authenticator-app MFA and one-use recovery codes. Specify secure password hashing, TOTP replay prevention, encrypted MFA secrets, key custody, session expiry/revocation, rate limiting and secret-safe logging as requirements for security review, but do not freeze unapproved algorithm parameters or claim certification.
- **Receipts:** private provider-neutral storage, authorization on every read. Format, size, malware scanning, metadata stripping, retention, provider and orphan cleanup remain decisions; do not assume a particular image library/provider.
- **Reports/performance:** inclusive date range and group/member/activity filters. Explicitly identify unresolved event-date, timezone, current-vs-as-of balance semantics. Preserve NFR-003 target (at least 95% of ordinary group/balance/report views under 2 seconds for 50 members and 10,000 expenses), but specify the missing workload, hardware, concurrency, network and measurement boundary as acceptance-test parameters to be approved—not fabricated facts.
- **Platform scope:** Swing is the MVP presentation client only. Preserve full-product web-primary, Android and iOS requirements; shared service is the evolution seam, not proof that those clients exist. Do not relabel Swing as satisfying FR-012/NFR-005.
- **Persistence:** shared service is the approved topology; database vendor remains unselected. Specify required transactional/unique/locking/CAS capabilities and migration/backup needs without silently accepting PostgreSQL or another vendor.

## Deliverables — all under `design/final/`

Create/update the following files. Use clear, concise, internally consistent content and stable requirement/decision identifiers.

1. `requirements.md` — final functional and non-functional requirements, actors, scope split (Swing MVP vs full product), scenarios, acceptance criteria, edge cases, assumptions and open decisions. Preserve all customer features and IDs. Update root `spec.md` to match this file (or make it a concise canonical pointer plus identical requirements content only if repository conventions support it); avoid two conflicting specifications.
2. `architecture.md` — context, layers, responsibilities, trust boundaries, shared-server deployment, request/response flow, persistence/transaction boundaries, external ports, failure handling, security, MVP/full-product evolution and key trade-offs.
3. `design.md` — use cases and application services, domain workflows, lifecycle rules, split algorithm, ledger/payment flow, notification/outbox flow, receipt flow, authorization, error handling and UI boundary.
4. `data-model.md` — entities/aggregates, immutable value objects, identifiers, invariants, relationships, persistence constraints/indexes, audit/ledger records, idempotency keys, optimistic versions/locking, outbox and rebuildable projections. Clearly distinguish logical model from vendor-specific schema.
5. `test-approach.md` — JUnit 5 strategy, unit/application/integration/contract/acceptance/performance/security test layers, requirement traceability, deterministic money vectors and property tests, transaction rollback/idempotency/concurrency tests, authorization/MFA/receipt/outbox tests, Swing boundary tests, PlantUML CI validation, test data and NFR-003 measurement plan. Do not claim tests have run.
6. `decisions.md` — accepted human decisions, adopted proposal elements, unresolved decisions (owner, impact, safe interim behavior, decision deadline/gate), and rejected alternatives. Explicitly mark shared-service + thin Swing and Spec Kit baseline/Claude selected elements as approved by the user.
7. `traceability.md` — every FR/NFR mapped to architecture/design/data model and planned verification IDs. No requirement may disappear or be silently downgraded.
8. `diagrams/` — PlantUML source, at minimum:
   - `use-case.puml`
   - `component.puml`
   - `class.puml`
   - `sequence-expense-review.puml`
   - `sequence-payment-settlement.puml`
   - `sequence-notification.puml`
   - `state-expense.puml`
   - `activity-expense-review.puml`
   - `activity-payment-settlement.puml`
   - `deployment.puml`

Every diagram must have a clear title, consistent names/states with the text and model, and renderable PlantUML source. Include all key actors/components and relevant trust boundaries; avoid diagrams that imply unapproved features or technologies. Add diagrams only when they add distinct information.

## Quality gates before declaring the package final

- Read all governing sources, both proposal sets, and cross-review reports; verify paths and requirement IDs.
- No conflict between root `spec.md`, `design/final/requirements.md`, architecture, design, data model, decisions, traceability, tests or diagrams.
- Every FR/NFR from the customer inventory and current specification is retained and labelled MVP/full product correctly.
- Explicitly close the proposal inconsistencies listed above; unresolved product decisions stay visible and are not guessed.
- Ensure payer-self-share, zero/negative expense, exact percentage 100%, largest remainder, alphabetical ties, pending/rejected exclusion, single reviewer, partial payment and overpayment rejection are consistently specified.
- Ensure transaction boundaries, idempotency, uniqueness, locking/versioning, rollback and retry semantics are concrete and testable.
- Ensure server-side authorization, MFA/recovery, secrets, session and audit concerns are addressed without unreviewed crypto parameters.
- Ensure every diagram is syntactically valid PlantUML; render all diagrams with one consistent PlantUML version and inspect them against prose. Record validation command/version/results.
- Ensure no technology/provider/currency/retention choice is invented where the sources leave it open.
- Do not claim a Maven build, JUnit suite, security assessment or performance result exists unless it was actually executed; this task is design documentation only.
- Human review remains required under Constitution Principle IX.

## Working and Git instructions

Work on the current `main` baseline. First inspect `git status` and latest `main`; do not overwrite unrelated changes. Create the output directory if needed. Keep all final package files in `design/final/` and update only the existing `spec.md` plus these new final-design files. Preserve proposal and cross-review artifacts unchanged.

When complete, provide a concise summary of key reconciliations, unresolved decision gates, and validation actually performed. Commit the documentation changes directly to `main` with a descriptive message. Do not claim success until the commit is pushed and the resulting `main` tree is verified. If the working tree contains unrelated changes or branch protection prevents a direct push, stop and report the blocker rather than force-pushing or overwriting work.
