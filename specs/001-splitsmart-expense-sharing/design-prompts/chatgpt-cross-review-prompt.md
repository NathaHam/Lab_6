# Prompt C — ChatGPT comparison and cross-check

Use only after both independent design sets are complete. Supply ChatGPT with all source documents and every file in both proposal directories. ChatGPT's role is reviewer/reconciler, not a third competing architect.

```text
Act as the independent architecture/design reviewer for SplitSmart. Compare the Spec Kit and Claude Code proposals against the actual requirements and constitution. Be impartial and evidence-based; document paths and headings for each material finding. Never claim to review files that were not supplied or readable.

Read completely:
SOURCE: UserRequirement.md; .specify/memory/constitution.md; specs/001-splitsmart-expense-sharing/spec.md.
PROPOSAL A: all files under specs/001-splitsmart-expense-sharing/design/speckit/.
PROPOSAL B: all files under specs/001-splitsmart-expense-sharing/design/claude/.

Rules:
- UserRequirement.md is authoritative for customer outcomes; clarified spec is the testable interpretation; constitution is binding.
- Swing MVP covers FR-001–FR-011 and NFR-001–NFR-004. FR-012/NFR-005 remain full-product web-primary + Android + iOS commitments. Do not claim Swing satisfies them.
- Distinguish contradictions from valid alternative designs. Do not invent product decisions.
- Identical participant-name tie-breaking remains unresolved unless a human-approved source says otherwise.
- Do not modify source docs or either proposal. This is design review, not implementation authorization.

Required review:
A. Completeness: list every file actually reviewed; identify missing/truncated/unreadable files, incomplete diagrams, and whether same-baseline independent generation can be verified.
B. Requirement matrix: for every FR-001–FR-012 and NFR-001–NFR-005, summarize accurately; rate each proposal Complete / Partial / Missing / Contradictory with exact evidence; give a concrete verification test and identify gaps. Do not combine or omit IDs.
C. Constitution: assess each proposal against I–IX (Java 21/Maven; Swing presentation-only; OO design; GUI/business separation; BigDecimal; JUnit 5; PlantUML; traceability; human review). Rate Compliant / Partial / Non-compliant / Not assessable with evidence.
D. Domain/finance: verify payer-as-participant semantics; zero/negative amount handling; percentage total; largest-remainder reconciliation; alphabetical ties and unresolved identical-name case; pending/rejected exclusion; single designated non-submitter MVP reviewer; full-product review levels; pairwise balances; partial payment and overpayment rules. Find formula errors, race conditions, duplicate posting, transaction inconsistencies, and missing tests.
E. Architecture: compare boundaries/layers/dependencies, responsibilities/coupling, domain model/aggregates, persistence/integrity/transactions, authentication/MFA/authorization/privacy, notifications/idempotency, receipt handling, reporting/performance, testability, and web/mobile evolution. Explain trade-offs; do not force a winner where both designs are reasonable.
F. Consistency: compare diagrams with prose and data model. Validate PlantUML if possible; otherwise say source inspection only. Find inconsistent names, components, relationships, state transitions, and traceability.
G. Open questions: merge/deduplicate. For each include source evidence, late-decision impact, owner, and timing: before implementation / persistence / UI / safely deferrable. Keep assumptions distinct from requirements.
H. Recommendation: strengths/weaknesses/readiness of each; choose adopt Spec Kit / adopt Claude / combine / defer for each design area; provide a source-supported target outline; prioritize issues Critical/High/Medium/Low with evidence, impact, correction; include human decision log template and pre-implementation gate checklist.

If scoring, define the scale and score dimensions separately (coverage, constitution, domain correctness, security, consistency, testability, clarity). Do not use one opaque score or reward verbosity.

Write:
- specs/001-splitsmart-expense-sharing/design/cross-review/review-report.md
- specs/001-splitsmart-expense-sharing/design/cross-review/requirement-matrix.md
- specs/001-splitsmart-expense-sharing/design/cross-review/decision-log.md
- specs/001-splitsmart-expense-sharing/design/cross-review/pre-implementation-checklist.md

If file writing is unavailable, return complete Markdown for each file separately. End with status: ready for human approval / needs revision / blocked by unresolved product decisions. Human approval is required before acceptance.
```
