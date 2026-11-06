# SplitSmart — Design Review Checklist (for the human reviewer)

**Purpose**: Constitution IX requires a responsible human to review this
AI-generated design. Tick each item, or record a finding.

- **Reviewer**: ____________
- **Date**: ____________
- **Outcome**: ☐ Accept ☐ Accept with changes ☐ Reject

## A. Source alignment

- [ ] A1. Every customer feature in `UserRequirement.md` appears in
  [traceability.md](traceability.md): accounts, groups, expenses with
  receipts, notifications, approval, balances, payments, reporting, and
  web/Android/iOS.
- [ ] A2. Every FR-001 to FR-012 and NFR-001 to NFR-005 has a design
  element and a proposed verification.
- [ ] A3. FR-012 and NFR-005 are marked full product. Nothing claims the
  Swing MVP satisfies them.
- [ ] A4. Multi-level approval is kept as a full-product capability
  (`ApprovalPolicy`, `review_record.level`) and is not dropped.
- [ ] A5. Conflicts C-1 to C-8 in [open-questions.md](open-questions.md)
  are acknowledged, and each has an owner.
- [ ] A6. No source document (UserRequirement, constitution, spec) was
  modified.

## B. Constitution compliance

- [ ] B1. Java 21 target via `maven.compiler.release=21`; Maven
  multi-module layout is acceptable (ADR-000, ADR-001).
- [ ] B2. Swing is presentation only. Presenters call `application.api`.
  No share, balance, or authorization logic sits in views or listeners
  (ADR-015).
- [ ] B3. Business operations are testable without constructing a GUI
  (design §12).
- [ ] B4. Money is always `BigDecimal` / `Money`. No `float` or `double` in
  any money path, DTO, storage mapping, or wire format.
- [ ] B5. Currency scale, rounding (none on input), and the remainder
  algorithm are explicit and deterministic (design §3).
- [ ] B6. All tests are proposed as JUnit 5. GUI-dependent tests are
  minimal.
- [ ] B7. All diagrams are PlantUML source in [diagrams/](diagrams/) and
  agree with the text.
- [ ] B8. No unnecessary frameworks are introduced (ADR-017). Any proposed
  dependency is justified.

## C. Financial correctness

- [ ] C1. Hand-check vectors E1 to E9 in design §3.3.
- [ ] C2. The `L < n` argument and the reconciliation postcondition are
  sound.
- [ ] C3. The payer's own share creates no debt. Payer-only expenses
  create none.
- [ ] C4. Zero expenses are accepted and post nothing.
- [ ] C5. Pending and rejected expenses never create ledger entries.
- [ ] C6. Payment cap: `amount ≤ max(0, net(payer→recipient))`, checked
  under a lock. Overpayment leaves the balance unchanged.
- [ ] C7. Ledger unique constraints prevent duplicate posting.
- [ ] C8. The identical-name case **fails closed** and does not invent a
  rule (OQ-01 is still open).
- [ ] C9. Cross-currency totals are never summed.

## D. Security and privacy

- [ ] D1. Trust boundaries TB-1 to TB-4 are acceptable. The ADR-002
  decision has been taken, or is explicitly deferred with its risk
  accepted.
- [ ] D2. Password hashing parameters, TOTP profile, recovery-code design,
  and session lifetimes are reviewed by a security reviewer (ADR-011,
  OQ-18, OQ-29, OQ-30).
- [ ] D3. Every service method calls `AccessPolicy`. A non-member gets
  NotFound with no existence leak.
- [ ] D4. Receipts are served only through an authorized call. No public
  URL. Metadata stripping is decided (OQ-08).
- [ ] D5. Email content is minimised (OQ-17). Logs redact secrets and
  personal data.
- [ ] D6. Retention and deletion policy is recorded as open (OQ-09), not
  invented.

## E. Robustness

- [ ] E1. Transaction boundaries (data-model §4) cover every command.
- [ ] E2. Optimistic versions, the pair-lock order, and idempotent
  `CommandId` handling are consistent.
- [ ] E3. The outbox dispatcher retry and failure handling is acceptable
  (OQ-27).
- [ ] E4. The membership-removal vs submission race is addressed
  (data-model §4).
- [ ] E5. The receipt orphan scenario is handled.

## F. Performance

- [ ] F1. The index plan (data-model §5) supports the NFR-003 views.
- [ ] F2. Swing performs no I/O on the EDT.
- [ ] F3. The performance test definition and its environment (OQ-33) are
  agreed.

## G. Honesty of the design set

- [ ] G1. Facts, assumptions, proposals, and decisions needed are labelled.
- [ ] G2. No database, email provider, receipt provider, currency list,
  retention policy, or identical-name tie-break was invented.
- [ ] G3. No claim that any test exists or passes.
- [ ] G4. Every open question has an impact, an owner, and a timing.
- [ ] G5. Files exist only under `design/claude/`.

## H. Diagram consistency spot-checks

- [ ] H1. The state diagram's states (`PENDING`, `APPROVED`, `REJECTED`)
  match design §4.3 and `expense.status`.
- [ ] H2. Sequence diagrams show authorization before data changes, and
  show the transaction scope.
- [ ] H3. The class diagram matches the aggregates in design §1.2 and the
  tables in data-model §3.
- [ ] H4. The deployment diagram shows option B, labels the dev
  composition, and marks full-product clients as future.
- [ ] H5. The use-case diagram's actors match spec §Actors.

## Findings

| # | Item | Severity | Finding | Action / owner |
|---|---|---|---|---|
| | | | | |
