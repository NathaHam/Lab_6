# SplitSmart — Traceability

**Status**: Final design package. Human review required. The test IDs below are **planned** ([test-approach.md](test-approach.md)). None has been implemented or run.
Chain: `UserRequirement.md` → requirement ID ([requirements.md](requirements.md) = `spec.md`) → architecture, design and data model → planned verification.

## 1. Requirement matrix

| Req | Scope | Architecture | Design | Data model | Diagrams | Planned verification | Open decisions |
|---|---|---|---|---|---|---|---|
| FR-001 | MVP | §3, §10 | §3, §10 | §4 accounts and security | use-case | T-SEC-01..05, 07, 10; AC-001 | OD-18, OD-26 |
| FR-002 | MVP | §7 | §3, §9.4 | `app_group`, `membership`, `invitation` | use-case, class | T-CON-04, 05; T-SEC-08; AC-001 | OD-14, OD-15, OD-16 |
| FR-003 | MVP | §7 | §2, §4, §5 | `expense`, `expense_share` | class, activity-expense-review | T-EXP-01, 04, 07; T-MNY-11..13; AC-002 | OD-09 |
| FR-004 | MVP | §4 | §4 | `expense_share` (snapshot, rank) | class | T-MNY-01..15, 30, 31, 40; AC-003 | OD-01, OD-02, OD-04 |
| FR-005 | MVP | §8, §9 | §11 | `receipt_upload` | component, deployment | T-RCP-01..05; AC-002 | OD-17, OD-26 |
| FR-006 (MVP: one level) | MVP | §7 | §5, §2.3 | `reviewer_assignment`, `review_record` | state-expense, activity-expense-review, sequence-expense-review | T-EXP-02, 03, 05, 06; T-CON-01; AC-004 | OD-10 |
| FR-006 (multi-level) | **Full product** | §11 | §5 (ReviewPolicy) | `review_record.level`, §9 | use-case | Full-product acceptance (to be designed) | OD-11 |
| FR-007 | MVP | §7, §9 | §8 | `notification`, `email_outbox_message`, `session` | sequence-notification | T-NOT-01..05; T-CON-06; AC-004 | OD-12, OD-13, OD-19 |
| FR-008 | MVP | §7, §12 | §6 | `ledger_entry`, `ledger_head`, optional `pair_balance` | class, sequence-expense-review | T-EXP-04; T-LED-01..03; AC-004 | OD-05, OD-22 |
| FR-009 | MVP | §7, §9 | §7 | `payment`, `ledger_entry` | activity-payment-settlement, sequence-payment-settlement | T-PAY-01..06; T-CON-02, 03; T-IDEM-01; AC-005 | OD-05..08 |
| FR-010 | MVP | §7 | §13 | §7 indexes | use-case | T-RPT-01..03; AC-006 | OD-20 |
| FR-011 | MVP | §7 | §13 | §7 indexes | use-case | T-RPT-01..03; AC-006 | OD-20, OD-27 |
| FR-012 | **Full product** | §11 | — (separate design) | §9 | use-case, deployment (note) | AC-007, SC-006 (future) | OD-24, OD-25 |
| NFR-001 | MVP | §3, §10 | §10, §11 | security tables, §8 item 6 | component, deployment | T-SEC-01..11; T-RCP-02; AC-008 | OD-18 |
| NFR-002 | MVP | §4 | §4 | §1 `money` type | class | T-MNY-*; AC-009; SC-002 | OD-03, OD-04 |
| NFR-003 | MVP | §12 | §13 | §7 | — | T-PERF-01..03; AC-010; SC-004 | OD-21, OD-22 |
| NFR-004 | MVP | §4 | §5, §14 | `expense.status`, `reviewer_assignment`, `review_record` | state-expense | T-EXP-05; T-UI-01; AC-009; SC-005 | — |
| NFR-005 | **Full product** | §11 | — | — | use-case | AC-007, SC-006 (future) | OD-25 |
| NFR-006 | MVP | §7, §9 | §9 | §5, §6, §8 | sequence-payment-settlement, activity-payment-settlement | T-TX-01..03; T-IDEM-01..04; T-CON-01..06; T-LED-02; AC-011 | OD-22, OD-23 |

Constitution: I and III (OD-28, architecture §4), II and IV (design §14, T-UI-01..03), V (T-MNY-21), VI (all of test-approach.md), VII (§3 below), VIII (this file), IX (decisions.md §5).

## 2. No requirement dropped or downgraded

Every original customer feature maps to at least one ID (requirements.md inventory). FR-012, NFR-005 and multi-level review stay full-product requirements. They are not met by the Swing MVP, and nothing claims they are. Interim behaviours (OD-xx) are labelled as interim and do not narrow any FR. NFR-006 is new. It makes integrity properties that FR-008 and FR-009 already imply explicit and testable.

## 3. Validation performed for this package

| Check | Command or method | Result |
|---|---|---|
| PlantUML syntax | `java -jar plantuml.jar -checkonly -failfast2 *.puml`, PlantUML **1.2024.3** (from the VS Code extension `jebbs.plantuml-2.18.1`), Java runtime OpenJDK 25 | Exit 0 for all 10 diagrams. The first run failed on `sequence-notification.puml` (`cloud` is not a sequence participant type). It was fixed to `participant` and re-checked. |
| PlantUML render | `java -jar plantuml.jar -tpng -o <scratchpad>` | All 10 rendered. PNGs were kept outside the repository. `component` and `state-expense` were inspected visually. The state diagram was corrected so approve and reject leave only from `ASSIGNED`, then re-validated. |
| Requirement ID coverage | Manual comparison of FR-001..012 and NFR-001..005 with spec.md (2026-10-29) | All present. NFR-006 and AC-011 added. |
| Maven build, JUnit, security, performance | **Not run**. No code exists. | — |
