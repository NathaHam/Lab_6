# SplitSmart — Independent Architecture and Design Cross-Review

**Status:** Needs human approval; not implementation authorization  
**Review basis:** Prompt C; source documents and both proposal directories on `main`  
**Reviewed baseline:** Spec Kit proposal commit [3286639](https://github.com/NathaHam/Lab_6/commit/32866392fb0ea76e187ab47096f29cfde5019c5b); Claude Code proposal commit [c730f7c](https://github.com/NathaHam/Lab_6/commit/c730f7c05df78056aecff238488f1f93fba5c960). The latter is a child of the former.  
**Reviewer:** ChatGPT independent review  
**Review date:** 2026-11-06

## 1. Executive conclusion

Both proposals are substantially aligned with the customer requirements and constitution. They converge on the important architectural principles: a thin Swing presentation, application/domain logic outside the GUI, exact money arithmetic, an auditable ledger, atomic financial state changes, server-side authorization, durable notifications, JUnit 5 verification, PlantUML artifacts, and an explicit boundary between the Swing MVP and the web-primary/Android/iOS full product.

**Recommendation: combine the proposals, using Spec Kit as the simpler MVP architecture baseline and selectively adopting Claude Code's more detailed value-object, idempotency, session/MFA, and concurrency treatment.** Neither proposal should be accepted unchanged. The strongest design choice is a shared application service behind the Swing client, subject to human approval: a local Swing process with direct shared-database credentials is not a safe multi-user deployment model for NFR-001 and durable email delivery.

No proposal is executable or verified evidence. The repository at the reviewed baseline has no Maven project, production Java source, tests, selected database, or deployed service. Design readiness must not be confused with implementation readiness.

<badge>Needs human approval</badge>

### Highest-priority findings

1. **High — settle the shared-service topology before implementation.** Both proposals recommend a server boundary; Claude compares unsafe/direct-database alternatives more explicitly. A service is important for enforcing authorization centrally, protecting database credentials, and running the outbox independently of a desktop session.
2. **High — resolve currency precision and identical-name tie policy before finalizing financial persistence/allocation.** The alphabetical rule is sourced; the identical-name case and supported currencies are not. Both proposals correctly avoid silently inventing an identity tie-break, but the allocator must fail safely until policy is approved.
3. **High — make expense approval/posting and payment acceptance/posting atomic, serialized, and idempotent.** Both designs describe the right pattern. The selected persistence technology must demonstrably support the required transaction, uniqueness, and locking/compare-and-set semantics.
4. **High — define the meaning of signed-out at expense-submission time.** FR-007 requires email for signed-out members; multi-session and expiry semantics affect the recipient snapshot and cannot be left to a UI heuristic.
5. **Medium — resolve per-group versus cross-group balance/payment-cap scope and report balance/date semantics.** These affect user-visible totals and overpayment validation.
6. **Medium — correct internal ambiguity in Claude's optional approval/rejection notifications and reviewer assignment model.** Its prose describes outcome notices and a standing reviewer, while open questions leave both choices unsettled.

## 2. Review scope and evidence

### 2.1 Source documents read

- `UserRequirement.md` — authoritative customer feature inventory.
- `.specify/memory/constitution.md` — Constitution v1.0.0, Principles I–IX.
- `specs/001-splitsmart-expense-sharing/spec.md` — clarified FR-001–FR-012, NFR-001–NFR-005, acceptance criteria, assumptions, and open questions.

The source specification preserves the customer’s web-primary, Android, and iOS commitment as FR-012/NFR-005, while explicitly labelling FR-001–FR-011 and NFR-001–NFR-004 as the Java Swing MVP. The review retains that distinction.

### 2.2 Proposal A — Spec Kit

Files present and reviewed:

- `design/speckit/architecture.md`
- `design/speckit/design.md`
- `design/speckit/data-model.md`
- `design/speckit/decisions.md`
- `design/speckit/open-questions.md`
- `design/speckit/traceability.md`
- `design/speckit/design-review-checklist.md`
- `design/speckit/quickstart.md`
- `design/speckit/research.md`
- `design/speckit/contracts/application-boundary.md`
- `design/speckit/contracts/external-ports.md`
- PlantUML: `components.puml`, `context.puml`, `deployment.puml`, `domain-class.puml`, `expense-review-activity.puml`, `expense-review-sequence.puml`, `expense-state.puml`, `payment-balance-sequence.puml`, `payment-settlement-activity.puml`, `use-case.puml`.

**Inventory:** 11 Markdown files and 10 PlantUML source files. No PNG renderings are part of this proposal; this is not itself a defect because the constitution requires PlantUML source.

### 2.3 Proposal B — Claude Code

Files present and reviewed:

- `design/claude/architecture.md`
- `design/claude/design.md`
- `design/claude/data-model.md`
- `design/claude/decisions.md`
- `design/claude/open-questions.md`
- `design/claude/traceability.md`
- `design/claude/design-review-checklist.md`
- PlantUML: `auth-mfa-sequence.puml`, `components.puml`, `context.puml`, `deployment.puml`, `domain-class.puml`, `expense-review-activity.puml`, `expense-review-sequence.puml`, `expense-state.puml`, `invitation-state.puml`, `notification-sequence.puml`, `payment-balance-sequence.puml`, `payment-settlement-activity.puml`, `use-case.puml`, plus corresponding PNG renderings.

**Inventory:** 7 Markdown files, 13 PlantUML source files, and 13 PNG renderings. The PNGs are review aids, not substitutes for source.

### 2.4 Completeness and independence limits

No missing or unreadable files were found in the proposal directories at the reviewed `main` tree. No proposal file was intentionally omitted from the inventory. Binary PNGs were present in the repository, but diagram validation here is source/prose inspection; no PlantUML renderer or executable validation was run. Therefore syntax/render validity and pixel-to-source correspondence are **not certified**.

The two proposal commits are sequential: Claude Code commit `c730f7c` has Spec Kit commit `3286639` as its parent. Claude's architecture states that it did not open the Spec Kit proposal, which is evidence of the author's stated intent, but commit ancestry alone cannot prove independent generation or identical prompt/input conditions. Treat independence as **plausible but not independently verifiable** from repository artifacts. Both proposals cite the same governing source documents; Claude's own note says its proposal was generated without opening the other design set.

### 2.5 Repository implementation evidence

The reviewed tree has no `pom.xml`, Java source tree, JUnit tests, selected database schema/migrations, or running deployment. Both proposals acknowledge this. No build, test, PlantUML render, security test, performance test, or implementation behavior was run as part of this review.

## 3. Requirement coverage summary

The full ID-by-ID assessment and concrete tests are in [requirement-matrix.md](requirement-matrix.md). Summary:

- **Complete at design level:** FR-001, FR-002, FR-003, FR-005, FR-008 core ledger semantics, FR-009 core partial/overpayment semantics, and NFR-004.
- **Partial pending explicit decisions or fuller full-product design:** FR-004, FR-006 full-product extension, FR-007, FR-008 scope, FR-009 authorization/scope edges, FR-010, FR-011, FR-012, NFR-001, NFR-002, NFR-003, NFR-005.
- **Contradictory:** No whole requirement is wholly contradicted by either proposal. There are localized internal inconsistencies and unsupported proposed defaults documented below.

“Complete” means the design addresses the requirement coherently; it does not mean code exists or the requirement is implemented.

## 4. Constitution assessment

| Principle | Spec Kit | Claude Code | Review |
|---|---|---|---|
| I. Java 21 and Maven | Partial | Partial | Both specify Java 21/Maven as binding, but no POM/build exists to verify. |
| II. Java Swing presentation | Compliant | Compliant | Both keep Swing as presentation only and distinguish it from full-product clients. |
| III. Object-oriented design | Compliant | Compliant | Cohesive domain/application/infrastructure boundaries; Claude adds Maven modules/JPMS, which is more prescriptive. |
| IV. GUI/business separation | Compliant | Compliant | Both put rules in independently testable domain/application operations. |
| V. Exact money arithmetic | Partial | Partial | BigDecimal and largest remainder are explicit; currency catalogue/scale, percentage precision/collation, and identical-name tie policy remain open. |
| VI. JUnit 5 verification | Compliant as proposal | Compliant as proposal | Both propose JUnit 5 domain and integration tests; no tests have been created or run. |
| VII. PlantUML artifacts | Partial | Partial | Source files exist and are referenced; syntax/render and prose/model consistency were not executable-validated here. |
| VIII. Requirement traceability | Compliant as proposal | Compliant as proposal | Both trace all FR/NFR IDs to design and proposed verification; implementation evidence is correctly deferred. |
| IX. Human review of AI output | Compliant as proposal | Compliant as proposal | Both explicitly require human review and do not claim AI output is accepted evidence. |

Neither proposal can receive an implementation-level constitution pass until the Maven project, JUnit tests, and reviewed diagrams exist and are checked.

## 5. Domain and financial correctness

### 5.1 Split allocation and money

Both proposals correctly:
- use `BigDecimal` for monetary values and prohibit `float`/`double` in money paths;
- require one group currency and avoid FX conversion;
- reject negative expenses and allow zero-value expenses;
- require percentage inputs to total exactly 100%;
- use largest remainder at the currency minor unit and alphabetical participant-name ordering for equal remainders;
- preserve the unresolved identical-name case rather than inventing a user-ID or join-order tie-break;
- recommend persisting the computed shares as a submission-time snapshot.

Spec Kit explains the quotient/remainder equal split and exact percentage remainder ordering clearly. Claude adds an integer/rational formulation, test vectors, seeded property-style tests, and explicit fail-closed handling when identical names make the ordering ambiguous. **Adopt the common algorithmic rule and Claude's more explicit fail-closed treatment**, but do not treat fail-closed as the final product policy. Human approval of the identical-name resolution is still required.

Both need an approved currency catalogue and source of minor-unit metadata before storage/API contracts are final. Claude's proposed fixed `decimal(18,4)` column and percentage precision/positive-share restrictions are proposals, not customer requirements; verify they support the approved currency set and do not accidentally prohibit a valid 0% participant. Spec Kit leaves percentage precision open, which is safer until approved.

### 5.2 Payer as participant

Both designs preserve the critical rule: the payer may be included in the participant list and receive an allocated share, but the payer's own share is not booked as a debt to themselves. Other participants owe their allocated shares to the payer. The total expense share allocation must still reconcile to the full expense amount; the resulting obligations can be less than the expense total when the payer participates. Test this explicitly; do not “correct” it by reallocating the payer's share among other participants.

### 5.3 Expense lifecycle and approval

Both proposals keep pending and rejected expenses out of balances, and make approval the only posting path. Both describe the MVP's exactly one manager-designated reviewer, distinct from the submitter, and identify configurable multiple review levels as full-product scope. Both recommend atomic approval plus postings and duplicate-posting protection.

Claude's model stores review records with a level and proposes a `SingleReviewerPolicy`/future `MultiLevelPolicy`; this is a reasonable extension seam. However, its group table also has a `standing_reviewer_id`, and OQ-12 leaves standing-versus-per-expense designation open. Its prose alternates between reviewer assignment at submission and a standing reviewer convenience. Keep the binding MVP rule explicit: exactly one reviewer is designated for each submitted expense by the manager, and that reviewer is not the submitter. A standing default may only be an optional UI convenience after approval, never a substitute for the per-expense assignment requirement.

Claude's state model treats approved/rejected as terminal and suggests resubmission as a new linked expense. Spec Kit also avoids silent editing/reactivation. This is a safe proposal, but resubmission/correction policy remains a product decision.

### 5.4 Balance ledger and payment settlement

Both proposals use immutable expense/payment history, append-only balance postings, and a derived pairwise balance. Both propose atomic transactions, unique source keys, idempotency, and debt revalidation under a lock or equivalent serialization before a payment commits. This is the right design direction.

Important implementation conditions:
- Expense approval must atomically persist the decision, all non-self obligations, the projection update if enabled, audit evidence, and relevant outbox records.
- A rejected/pending expense must have no financial postings.
- Payment record and reverse/counter-posting must commit together.
- A concurrent payment must re-check the remaining debt after serialization; two requests cannot jointly overpay a debt.
- Replayed commands must not duplicate payment or expense postings.
- Projection totals must be independently rebuildable from the immutable ledger.

Both proposals scope balances/payment caps per group in their models or recommendations, but the spec's phrase “owed by each user to every other user” does not explicitly settle whether cross-group debts are netted. This must be decided before the payment-cap contract and balance UI are frozen. Claude explicitly lists this as OQ-04; Spec Kit should elevate the same question.

Zero/negative payment behavior is not fully specified by the customer. Claude proposes rejecting amounts <= 0; Spec Kit models positive payments as a proposed validation. Record that as a human-approved rule rather than a source fact. Payment actor authority (debtor only, creditor, or third party), recipient confirmation, and correction of mistaken payments also remain open.

### 5.5 Race conditions and idempotency

Both proposals identify duplicate approval and concurrent payment risks. Claude is more detailed about aggregate versions, pair-row lock ordering, command IDs, and idempotent retries. Spec Kit gives a simpler transaction boundary and unique posting constraints. Combine these: use a transaction-capable store, lock or compare-and-set the relevant expense/pair state, use stable command idempotency keys, and enforce uniqueness in persistence. Add tests for:
- two simultaneous review decisions on one pending expense;
- two payments that individually fit but jointly exceed the outstanding debt;
- repeated submission/approval/payment commands;
- rollback between state transition and posting;
- membership removal racing with expense submission or review;
- outbox lease/retry races.

No proposal's design prose alone proves these properties; they must be verified against the selected database and transaction isolation.

## 6. Architecture comparison and recommendation

| Design area | Spec Kit proposal | Claude Code proposal | Recommendation |
|---|---|---|---|
| Layering | Four logical layers; application boundary and external ports | Ports-and-adapters with Maven modules and JPMS | Adopt the shared four-layer boundary. Start with a simple Maven structure; add JPMS only if maintainers confirm its build/test complexity is justified. |
| Deployment | Thin Swing client + shared Java service; PostgreSQL candidate | Compares topologies; recommends thin client + server; database undecided | Adopt shared-service topology subject to approval. Do not let production clients connect directly to the database. Decide DB separately. |
| Domain model | Account, Group, Expense, Payment, ledger, projection, notification/outbox | Rich immutable records/value objects and explicit service/policy seams | Use the common model; adopt Claude's explicit value objects where they encode real invariants, not as ceremony. |
| Persistence | Relational system; PostgreSQL recommendation; ledger source of truth | Technology-neutral logical schema; ACID/locking requirements | Defer vendor selection to human decision. Retain the relational transaction/constraint requirements. |
| Security | Service-side authorization, adaptive password hash, TOTP/recovery, secret management open | Central AccessPolicy, PBKDF2/TOTP/AES-GCM proposal, server sessions and replay state | Adopt centralized policy and threat boundaries. Do not accept crypto algorithms/parameters without security review; avoid hard-coding the proposed PBKDF2 parameters as approved. |
| Notification | Durable in-app notification + transactional outbox | Same, plus dispatcher retry/lease/idempotency details | Combine; explicitly define recipient snapshot and “signed out.” Submission notices are required; approval/rejection notices are not. |
| Receipts | Private provider-neutral storage port and authorized reads | Content-addressed store, decode/metadata-stripping proposal | Keep provider-neutral private storage and authorized retrieval. Defer format, size, scanning, metadata, and retention policy. |
| Reporting/performance | Bounded authorized queries; optional projection only if measured | Indexed operational queries, projection and detailed performance profile | Prefer measurement before adding projection. Define current/as-of balance and date semantics first. |
| Testing | JUnit 5 domain/integration/performance tests | More granular named tests, seeded allocation properties, concurrency cases | Adopt Claude's test specificity with Spec Kit's simpler scope. None exist yet. |
| Full-product evolution | Shared application boundary; web/mobile explicitly outside MVP | Same server API, future web/mobile and multi-level policy | Preserve both proposals' boundary; full product still requires separate platform design and parity evidence. |

### 6.1 Recommended target outline

1. **Presentation:** Java Swing views/presenters; no financial, authorization, or persistence rules in event handlers.
2. **Application:** use cases for account, group, invitation, expense, review, payment, balance, notification, receipt, and report operations; authenticated principal and resource-level authorization.
3. **Domain:** immutable identifiers/value objects, group and expense invariants, exact share allocator, approval policy, payment/debt rules, and ledger semantics.
4. **Infrastructure:** repository/unit-of-work adapters, chosen relational store, session/credential protection, receipt store, email gateway, transactional outbox, audit, clock and ID adapters.
5. **Deployment:** Swing clients call a shared service; only the service has database/provider credentials. A single deployable service is sufficient for MVP; microservices are not justified by current scale.
6. **Financial source of truth:** immutable source records and ledger; optional rebuildable pair-balance projection only when measured performance requires it.
7. **Future product:** web-primary, Android and iOS clients reuse the same service/domain rules; configurable multi-level approval is designed and verified as full-product scope, not delivered by Swing.

## 7. Consistency and diagram review

### 7.1 Consistent elements

Both proposals' prose agrees on the central lifecycle: pending → approved or rejected; approval creates obligations; rejection does not. Both represent the payer's own share as non-debt, and both keep financial rules out of Swing. Both include PlantUML source for context, component, deployment, domain, expense review/state, payment, and use-case views.

Claude adds diagrams for MFA, invitation state, and notifications, improving coverage of cross-cutting interactions. Spec Kit adds explicit application-boundary and external-port contracts, improving the precision of the service seam.

### 7.2 Findings

- **Medium — Claude reviewer assignment representation needs reconciliation.** `standing_reviewer_id` in the group schema and per-expense `reviewer_id`/OQ-12 can be read as competing sources of reviewer authority. Make the expense assignment authoritative; a standing value, if retained, is only a default copied into each expense.
- **Medium — Claude review-result notifications are unsettled.** Detailed design includes outcome notices, while OQ-15 asks whether they should exist and proposes in-app only behind a flag. Source FR-007 requires submission notification; treat post-decision notices as optional future scope until approved.
- **Medium — Claude percentage constraints may over-constrain.** Its proposed positive-only percentage shares and max scale need confirmation; spec only says percentages total exactly 100%, and rejects invalid negative/excess totals. Do not silently forbid zero share unless approved.
- **Medium — both proposals use per-group balances without a resolved source decision.** Make the scope explicit in the decision log.
- **Low — A and B use differing status names** (e.g. `PENDING_REVIEW` versus `PENDING`). This is a naming variation, not a domain contradiction, provided DTOs, persistence, diagrams, and tests use one canonical vocabulary.
- **Low — diagrams are not machine-validated in this review.** Run the same PlantUML version in CI and inspect rendered output after any reconciliation. Claude's PNGs do not remove the need to validate the .puml source.

No specific syntax error is asserted because a PlantUML parser was not run. Diagram/source alignment is based on inspection, not rendering validation.

## 8. Merged open questions and ownership

See [decision-log.md](decision-log.md) for the decision record template and detailed disposition. The highest-impact questions are:

| Question | Owner | Timing |
|---|---|---|
| Identical-name tie and alphabetical collation/normalization | Product owner + technical lead | Before allocator acceptance |
| Supported currencies, minor-unit scale, percentage precision/zero-percent policy, amount bounds | Product owner/finance + technical lead | Before schema/API and financial tests |
| Shared service topology and database technology/isolation | Technical lead + product owner/operations | Before implementation baseline |
| Per-group versus cross-group balance/payment cap | Product owner/finance | Before payment/balance contract |
| Reviewer assignment per expense and full-product multi-level semantics | Product owner | Per-expense rule before MVP; multi-level before full-product design |
| Signed-out session definition and recipient snapshot point | Product owner + security/technical lead | Before notification workflow |
| Payment actor/confirmation/correction and zero/negative validation | Product owner | Before payment authorization |
| Report date source, time zone, and current/as-of balance | Product owner | Before report contract/UI |
| Removed-member history, invitation matching/expiry, manager transfer | Product owner/privacy | Before membership implementation |
| Receipt formats/limits/scanning/storage/retention and email content/provider | Product owner + security/operations | Before receipt/email integrations |
| Security algorithm parameters, key custody, sessions, rate limits, recovery | Security owner | Before authentication implementation |
| NFR-003 normal operating profile and measurement environment | Product owner + operations | Before performance acceptance |
| Web/mobile client stack and platform support matrix | Product owner + technical lead | Before full-product planning |

## 9. Prioritized findings

| ID | Severity | Finding | Evidence / impact | Required correction |
|---|---|---|---|---|
| CR-01 | High | Shared-service topology must be explicitly approved | A architecture §§1–5; B architecture §§3–6/ADR-002. Direct client DB access undermines central authorization and durable outbox. | Approve a thin Swing client + shared service, or document a safer alternative and its security/notification behavior. |
| CR-02 | High | Identical-name remainder tie is unresolved | Spec FR-004/open questions; A ADR-004; B ADR-004/OQ-01. | Record human rule; until then fail closed on ambiguous allocation. |
| CR-03 | High | Currency and percentage policy incomplete | Spec open questions; A ADR-003; B ADR-003/OQ-03/OQ-21; B decimal schema. | Approve currency set, authoritative scale source, accepted precision, zero-percent policy, and amount bounds before schema/API finalization. |
| CR-04 | High | Transaction and concurrency guarantees require selected-store proof | A architecture §7/data-model §§4–6; B design §§7/10 and data-model constraints. | Select a store; implement rollback/locking/idempotency tests including concurrent payment and review. |
| CR-05 | High | “Signed out” is undefined | Spec FR-007; A/B open questions; B OQ-18. | Define session lifetime, multi-device behavior, and the exact snapshot instant for recipient routing. |
| CR-06 | Medium | Balance scope/payment cap is undecided | B OQ-04; both models carry group ID; spec not explicit. | Decide group-scoped versus cross-group netting and align API, ledger, and payment tests. |
| CR-07 | Medium | Reviewer assignment has a standing/per-expense ambiguity in B | B architecture/data-model OQ-12; source FR-006 requires per-expense designation. | Per-expense reviewer assignment is authoritative; standing reviewer may only prefill. |
| CR-08 | Medium | Approval/rejection notifications are not required and B contradicts its own open question | B design §6/§8 vs OQ-15; spec FR-007 covers submission. | Remove or mark outcome notices optional pending product decision. |
| CR-09 | Medium | Report date and balance semantics unresolved | Spec FR-011 and open questions; A ADR-010; B OQ-23/OQ-36. | Define event date vs approval/creation date, timezone, inclusive boundaries, and current vs as-of balance. |
| CR-10 | Medium | Payment authorization and correction semantics incomplete | A open questions; B OQ-19/OQ-20; FR-009. | Decide who can record/confirm/correct payments and zero/negative validation. |
| CR-11 | Medium | Membership removal and invitation lifecycle policies open | A/B open questions; FR-002/NFR-001 access impact. | Decide historical access, open balances/reviews on removal, invite identity/expiry/revocation, and manager transfer. |
| CR-12 | Medium | Security controls need specialist approval | A ADR-007; B ADR-011/OQ-29/OQ-30. | Security owner approves password hashing, TOTP replay/window, recovery, key custody, session, throttling, and logging. |
| CR-13 | Medium | Receipt policy and orphan lifecycle are incomplete | A/B receipt ADRs; spec edge cases. | Decide formats, size, scanning, metadata, provider, failed-upload cleanup, access and retention. |
| CR-14 | Medium | NFR-003 cannot be reproducibly tested yet | Spec NFR-003; both proposals acknowledge missing environment. | Define hardware, network, concurrency, dataset, workload, and measurement boundary. |
| CR-15 | Low | Canonical state/field names differ | A and B model naming differences. | Choose canonical enum/DTO names during design convergence and update all diagrams/tests. |
| CR-16 | Low | PlantUML rendering not validated | Both contain .puml; no parser/render run in this review. | Add CI syntax/render validation and inspect diagrams against prose/model. |

## 10. Scoring (separate dimensions; design-document assessment only)

Scale: 1 = materially weak/absent; 2 = significant gaps; 3 = adequate with open issues; 4 = strong; 5 = exceptionally clear and well-supported. Scores are reviewer judgments, not test results or acceptance votes.

| Dimension | Spec Kit | Claude Code | Rationale |
|---|---:|---:|---|
| Requirement coverage | 4 | 4 | Both trace every FR/NFR; full-product client design remains evolutionary. |
| Constitution alignment | 4 | 4 | Strong on architecture rules; no actual Maven build/tests; money details remain open. |
| Domain/financial correctness | 4 | 4 | Correct payer, lifecycle, split, ledger and payment model; policy gaps remain. |
| Security/privacy | 4 | 4 | Central trust boundary and authorization; security parameters and session policy need approval. |
| Consistency | 4 | 3 | A is relatively coherent; B has standing/per-expense reviewer and outcome-notification ambiguity. |
| Testability | 4 | 5 | Both have useful tests; B is more explicit about concurrency, replay, and property-style coverage. |
| Clarity/actionability | 4 | 4 | A is concise with useful contracts/quickstart; B is detailed with richer decision and data-model material. |

Do not add these numbers into one opaque total. Neither proposal's verbosity or score replaces human review.

## 11. Final recommendation and readiness

**Adopt a combined design, with Spec Kit as the MVP structural baseline.** Reuse Claude Code's detailed value-object definitions, command idempotency/concurrency tests, explicit security/session concerns, and additional MFA/invitation/notification diagrams after reconciling the identified inconsistencies. Keep the persistence technology open until a human selects a database. PostgreSQL is a reasonable Spec Kit candidate, not an accepted decision.

**Do not begin financial persistence or authentication implementation until CR-01 through CR-05 are resolved.** Some non-blocking UI and domain scaffolding can be prepared only if maintainers explicitly authorize it and avoid embedding unsettled policy.

**Status: needs revision / human approval.** Both proposal sets are strong design inputs, but key product and technical decisions remain open. Human approval is required before acceptance, and no implementation or test result is claimed.
