# Prompt A — Spec Kit architecture and design

Use the installed Spec Kit planning command (normally `/speckit.plan`). If this installation has a dedicated architecture/design command, use it; otherwise produce these design artifacts through the planning workflow. Do not invent unavailable slash commands.

```text
Act as SplitSmart's software architect. This is an architecture and detailed design task only. Do not implement code.

Read completely:
- UserRequirement.md
- .specify/memory/constitution.md
- specs/001-splitsmart-expense-sharing/spec.md
Inspect the current Maven project, source, tests, diagrams, and documentation. Report missing inputs. UserRequirement.md is authoritative for customer outcomes; the clarified spec is the testable feature interpretation; the constitution is binding.

Independence/change control:
- Make an independent proposal. Do not inspect or reuse other AI-generated designs.
- Do not edit the source requirements, constitution, or feature spec.
- Do not modify production/test code, install dependencies, or commit/push.
- Write only under specs/001-splitsmart-expense-sharing/design/speckit/. Do not overwrite files outside that directory.

Binding constraints:
- Java 21, Maven, Java Swing for the desktop MVP presentation only.
- Keep business/domain rules out of Swing views and event handlers; business logic must be testable without a GUI.
- Cohesive object-oriented design; avoid unnecessary frameworks/patterns.
- BigDecimal only for money; never float/double. Specify scale, rounding, and deterministic allocation.
- JUnit 5; test business behavior and financial edge cases; minimize GUI tests.
- PlantUML source for architecture and interaction diagrams.
- Trace customer requirement → spec/acceptance criterion → design → verification.
- Human review is mandatory.

Preserve all requirements and distinctions:
- FR-001: verified email, password, authenticator-app MFA, recovery codes.
- FR-002: manager invites/removes; invitee accepts before access.
- FR-003: nonnegative expense (zero allowed), date, description, split method, one payer, one or more group-member participants. Payer may participate but owes no own share.
- FR-004: equal and percentage splits; percentages total exactly 100%; shares reconcile to currency minor unit using largest remainder; ties alphabetical by participant name. Identical-name tie remains unresolved; do not invent a rule.
- FR-005: optional receipt image.
- FR-006: pending expense excluded from balances until reviewed. Swing MVP has exactly one manager-designated reviewer, not the submitter. Full product may have configurable multiple required review levels.
- FR-007: in-app notices to group members; email to members signed out at submission time.
- FR-008: pairwise net balances from approved expenses and recorded payments only.
- FR-009: partial payments allowed up to outstanding debt; overpayment rejected; history retained.
- FR-010/011: summaries and reports, inclusive date range, group/member/activity filters.
- FR-012 and NFR-005 remain full-product web-primary + Android + iOS commitments; Swing MVP does not satisfy them.
- NFR-001 privacy/authentication/authorization; NFR-002 currency precision/reconciliation; NFR-003 95% ordinary group/balance/report views under 2 seconds for 50 members and 10,000 expenses; NFR-004 visible status, submitter, review outcome.
- One currency per group; no FX, offline sync, or report export unless source docs state otherwise.

Design explicitly:
1. System boundary, actors, external systems, trust boundaries, major runtime components.
2. Layered architecture and dependency direction: presentation, application, domain, infrastructure.
3. Domain entities/value objects, aggregate boundaries, invariants, lifecycle, state transitions.
4. Invitation, expense submit/review/approve/reject, balance, payment, notification, reporting workflows.
5. Exact money arithmetic, currency scale, percentage validation, largest-remainder algorithm, tie ordering, payer-participant semantics, balance consistency.
6. Persistence model and transaction boundaries for approval/posting/payment. If database is not established by repo, present options and mark recommendation as proposed.
7. MFA/recovery, authorization, privacy, secrets, auditability.
8. Receipt validation/storage/access control; do not invent provider/type/size policy.
9. Notification delivery/retries/idempotency; do not assume provider.
10. Reporting/performance design against NFR-003.
11. JUnit 5 test strategy and requirement traceability.
12. Evolution toward web/mobile without claiming Swing delivers those platforms or overbuilding full product.

Create under the assigned directory:
- architecture.md
- design.md
- data-model.md
- decisions.md (ADRs with context, alternatives, status: Proposed / Accepted by source / Needs human decision, consequences)
- diagrams/ with PlantUML source: context/components, domain/class model, submit-review-approve/reject sequence, payment/balance sequence
- traceability.md mapping every FR-001–FR-012 and NFR-001–NFR-005 to design elements and verification evidence; mark full-product scope
- open-questions.md with impact, stakeholder/owner, and decision timing
- design-review-checklist.md

Also include PlantUML use case, activity (expense submit/review/approve-reject, payment settlement), state (expense lifecycle), sequence and deployment diagrams in diagrams/.

Quality:
- Be specific enough to derive implementation tasks, but do not write implementation code or begin implementation.
- Separate source facts, assumptions, recommendations, and human decisions.
- No undocumented technology choices.
- Ensure PlantUML source is valid and agrees with prose.
- Check every requirement ID; do not omit FR-012/NFR-005.
- Do not claim tests pass; no implementation is being produced.
- End with a report of files created, sources read, assumptions, unresolved decisions, and workflow limitations.
```
