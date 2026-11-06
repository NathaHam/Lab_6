# Prompt B — Claude Code independent architecture and design

Run from the repository root on the same source commit as the Spec Kit run, preferably in a separate worktree.

```text
Act as an independent principal software architect for SplitSmart. Produce architecture and detailed design only; do not implement code.

Read in full: UserRequirement.md, .specify/memory/constitution.md, and specs/001-splitsmart-expense-sharing/spec.md. Inspect git status, repository structure, Maven configuration, existing code, tests, and diagrams. Report missing inputs. UserRequirement.md is authoritative for customer outcomes, the clarified spec is the testable interpretation, and the constitution is binding.

Work independently; do not inspect or reuse another AI-generated proposal. Do not edit source requirements, constitution, or feature spec. Do not modify production/test code, install dependencies, commit, push, or merge. Write only under specs/001-splitsmart-expense-sharing/design/claude/. Stop if that directory already contains files.

Constraints: Java 21 and Maven; Swing only for desktop MVP presentation; domain/business rules outside Swing views and handlers; cohesive OO design; BigDecimal only for money (never float/double); JUnit 5; PlantUML; requirement traceability; human review. No unnecessary frameworks.

Preserve every requirement:
- FR-001 verified email, password, authenticator-app MFA, recovery codes.
- FR-002 manager invites/removes; invitee accepts before access.
- FR-003 nonnegative amount (zero allowed), date, description, split method, one payer, one or more group-member participants; payer may participate but owes no own share.
- FR-004 equal/percentage splits; percentages total exactly 100%; largest-remainder allocation reconciles to minor unit; ties alphabetical by participant name. Identical-name tie is unresolved.
- FR-005 optional receipt image.
- FR-006 pending expenses excluded from balances; Swing MVP exactly one manager-designated reviewer who is not submitter; multiple required levels are full-product only.
- FR-007 in-app notices; email to members signed out at submission.
- FR-008 pairwise net balances from approved expenses and recorded payments only.
- FR-009 partial payments up to outstanding debt; reject overpayment; preserve history.
- FR-010/011 summaries and reports with inclusive date range and group/member/activity filters.
- FR-012/NFR-005 full product is web-primary plus Android and iOS; Swing MVP does not satisfy it.
- NFR-001 privacy/authentication/authorization; NFR-002 currency precision/reconciliation; NFR-003 95% ordinary views under 2 seconds for 50 members/10,000 expenses; NFR-004 visible status, submitter, review outcome.
- One currency per group; no FX, offline sync, or report export unless sources say otherwise.

Design: system boundaries, actors and trust boundaries; layered architecture and dependency direction; domain entities/value objects/aggregates/invariants; invitation, expense, review, balance, payment, notification and reporting workflows; exact money algorithm and currency scale; persistence constraints and transaction boundaries; concurrency/idempotency and duplicate posting; authentication/MFA/authorization; receipt storage/access; notification retries; reporting/performance; JUnit test strategy; future web/mobile evolution without conflating it with the Swing MVP.

Do not invent a database, email/receipt provider, supported currency list, retention policy, or identical-name tie-break. Mark recommendations as proposals and list open decisions.

Create under the assigned directory:
1. architecture.md
2. design.md
3. data-model.md
4. decisions.md (ADRs: context, options, status, consequences)
5. diagrams/ (PlantUML context/components, domain/class, expense-review lifecycle, payment/balance workflow)
6. traceability.md (every FR-001–FR-012 and NFR-001–NFR-005 mapped to design and verification; mark full-product scope)
7. open-questions.md (impact, owner, decision timing)
8. design-review-checklist.md

Self-review: distinguish facts, assumptions, recommendations, and human decisions; keep diagrams valid and consistent; do not omit full-product requirements; do not claim tests pass; propose concrete tests. Finish with files created, sources inspected, assumptions, unresolved decisions, and conflicts. Keep changes inside the assigned directory.
```
