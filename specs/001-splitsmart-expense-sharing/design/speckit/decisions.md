# Architecture Decisions

These are design records, not approvals. The constitution requires human review. Status is one of `Proposed`, `Accepted by source`, or `Needs human decision`.

## ADR-001: Layered Java client and shared application service

- **Status:** Proposed
- **Context:** The desktop MVP uses Swing, but separate users need shared group data, email notices, account verification, and server-enforced authorization. A local-only Swing database would not serve that boundary.
- **Decision:** Use a Java 21 Swing presentation client and a shared Java 21 application service. The client calls service use cases over an authenticated encrypted connection. Keep presentation, application, domain, and infrastructure layers separate; dependencies point inward.
- **Alternatives considered:** (1) A single-user desktop-only database — rejected because it does not support shared multi-user state and remote email delivery. (2) Put rules in Swing handlers — rejected by the constitution and would prevent GUI-independent testing. (3) Microservices — rejected as unnecessary for the known MVP scope.
- **Consequences:** A backend service, deployment, network security, and API contract are needed even though the MVP presentation is desktop-only. This is a proposed topology, not a source-established repository fact.

## ADR-002: Relational system of record

- **Status:** Proposed
- **Context:** Expense approval, balance posting, and payment acceptance require atomic multi-record writes, unique idempotency constraints, and concurrent debt checks. The product is multi-user.
- **Decision:** Recommend a relational database, with PostgreSQL as the initial shared-service candidate. Keep domain/application code behind repository and transaction boundaries. SQLite remains a viable embedded/local prototype option but is not recommended as the shared multi-user system of record.
- **Alternatives considered:** SQLite — simpler local distribution, but a poor fit for a central multi-user service with concurrent financial writes. In-memory/file persistence — insufficient durability and transactional consistency. No database provider/version is established by the workspace.
- **Consequences:** Human approval is required for PostgreSQL, deployment/backup/restore, schema migration tooling, and operational ownership. Exact constraints and indexing should be finalized after the choice. See [research.md](./research.md).

## ADR-003: Group-scoped single currency and exact amounts

- **Status:** Needs human decision
- **Context:** Source requires one currency per group and exact reconciliation but does not state currency codes or precision policy. The constitution requires `BigDecimal`, explicit scale, rounding, and deterministic allocation.
- **Decision:** Proposed representation is `BigDecimal` plus currency code, with currency-specific minor-unit scale; reject values not exactly representable at that scale (`RoundingMode.UNNECESSARY`). Do not round user-entered expense/payment amounts. Convert valid amounts to integer minor units for allocation and ledger arithmetic.
- **Alternatives considered:** Hard-code two decimal places — simple but not justified by the unspecified supported currencies. Allow arbitrary decimal scale — conflicts with the currency minor-unit reconciliation requirement. Silent rounding input — can change customer-entered financial values.
- **Consequences:** Select supported currencies and source/maintenance policy for scale metadata before schema/API implementation. This record does not select currencies.

## ADR-004: Largest-remainder allocation and unresolved duplicate-name tie

- **Status:** Accepted by source (except duplicate-name tie, which needs human decision)
- **Context:** FR-004 specifies equal and percentage splits, exact total reconciliation, largest-remainder allocation, and alphabetical ties by participant name. The source explicitly leaves identical-name ties unresolved.
- **Decision:** Use exact `BigDecimal`/integer arithmetic in minor units. Equal split uses quotient and remainder; the residual units go by alphabetical participant name. Percentage split floors exact rational share amounts then allocates remaining minor units by descending exact fractional remainder, then alphabetical participant name. Do not invent an ID-based tie-break for identical names.
- **Alternatives considered:** Round each share independently — can leave a residual. Round half-up independently — can fail reconciliation. Use participant/account ID as tie-break — explicitly not authorized by source.
- **Consequences:** Allocation is deterministic where alphabetical order uniquely identifies the order. The identical-name equal-remainder case is a correctness blocker until the owner selects a rule. Percentage precision limits and locale/case normalization also need a decision.

## ADR-005: One designated reviewer for the MVP

- **Status:** Accepted by source
- **Context:** FR-006 requires exactly one manager-designated reviewer in the Swing MVP, not the submitter; configurable multiple required reviews belong to the full product.
- **Decision:** Store one reviewer assignment per pending MVP expense. Only that reviewer can approve/reject. Approval and posting are atomic; rejection posts no balances.
- **Alternatives considered:** Any group member can approve — contradicts spec. Allow submitter review — contradicts spec. Implement multi-level review in MVP — over-scopes the desktop MVP.
- **Consequences:** The manager must choose a different eligible member when the submitter is the manager. Full-product multi-level workflow will need an explicit review-policy model and client support; do not claim this MVP delivers it.

## ADR-006: Immutable financial postings and atomic transitions

- **Status:** Proposed
- **Context:** Balances depend only on approved expenses and recorded payments. Concurrent/retried approval or payment must not duplicate or partially apply a financial change.
- **Decision:** Record immutable source expense/payment history and append-only `BalanceEntry` postings. Commit approval status, complete expense postings, projection update (if enabled), audit event, and outbox intent in one relational transaction. Commit payment and its counter-posting/projection/audit in one transaction. Enforce source uniqueness and recheck debt under serialization/locking for concurrent payments.
- **Alternatives considered:** Mutable balance as sole source — harder to audit/rebuild and vulnerable to lost updates. Update expense status then asynchronously post balances — can expose approved expense without balances. Best-effort duplicate detection in UI — does not protect concurrent requests.
- **Consequences:** Requires transaction-capable persistence, idempotency keys, conflict responses, and a reconciliation job/test. Corrections must be represented explicitly rather than deleting financial history.

## ADR-007: Credential and recovery protection

- **Status:** Needs human decision
- **Context:** FR-001/NFR-001 require verified email, password, authenticator-app MFA, and recovery codes. Credential algorithms, parameters, recovery process, and key custody are not specified.
- **Decision:** Proposed controls: store passwords using an approved salted adaptive password hash; encrypt TOTP seeds at rest with a managed key; generate high-entropy single-use recovery codes and store only verifiers; reveal recovery codes once; audit recovery use without logging secrets; rate-limit authentication and recovery attempts; require a fresh authorized session for sensitive credential changes.
- **Alternatives considered:** Plaintext/reversible password storage — unacceptable. Store raw recovery codes — unnecessary exposure. Put all authentication decisions in Swing — client is not a trusted security boundary.
- **Consequences:** Security owner must select algorithms, parameters, key-management mechanism, recovery/regeneration UX, account lockout/rate-limit policy, session lifetime/revocation, and privacy/retention. TOTP behavior should conform to a reviewed standard; see sourced facts in [research.md](./research.md).

## ADR-008: Provider-neutral receipt storage and access

- **Status:** Needs human decision
- **Context:** FR-005 requires an optional receipt image and display. Sources do not define provider, image format, maximum size, scanning, or retention.
- **Decision:** Store a private object behind a receipt-storage port; persist opaque object reference and minimal metadata. Validate actual content and authorization on read; never treat an object key as a bearer authorization token. Do not send image bytes via notification email.
- **Alternatives considered:** Store unrestricted bytes in a public directory — risks privacy and uncontrolled storage. Embed a provider-specific URL in the domain — couples core code to a yet-unselected vendor. Invent an accepted format/size policy — outside source authority.
- **Consequences:** Select provider, supported formats, size limits, content scanning, upload failure/cleanup behavior, access logging, and retention before implementation.

## ADR-009: Durable outbox for notices and email

- **Status:** Proposed
- **Context:** FR-007 requires persistent in-app notifications for group members and email to members signed out when expense submission occurs. External email delivery is not transactional with the database.
- **Decision:** Persist notification rows and email outbox intents in the same transaction as expense submission. Snapshot recipients and sign-in state at submission; deliver email asynchronously with stable idempotency keys and retry transient failures. Email carries minimal notice; application rechecks access before showing detail.
- **Alternatives considered:** Send email before database commit — can notify for an expense that never committed. Send email only in UI handler — loss on crash and difficult retry. Claim exactly-once provider delivery — not supportable without provider semantics.
- **Consequences:** External delivery is at-least-once and may be delayed. Choose email provider, retry/alert policy, recipient session definition, and notification behavior on membership removal. Do not let delivery failures undo a financial transition.

## ADR-010: Reports use bounded authorized queries

- **Status:** Needs human decision
- **Context:** FR-010/011 require expense, balance, and payment summaries with inclusive date range, group/member/activity filters. NFR-003 requires 95% of ordinary views under two seconds at 50 members and 10,000 expenses.
- **Decision:** Query only authorized group scopes and apply filters in the persistence query. Use indexes and pagination; introduce a transactionally updated balance projection only if measurement requires it. Preserve ledger as source of truth.
- **Alternatives considered:** Load all data into Swing and filter locally — inefficient and exposes more private data. Premature cache as authority — creates consistency risk. Export files — not required by the spec and remain out of scope.
- **Consequences:** Define view latency measurement environment, report date/time semantics, member filtering behavior, and whether a balance is current or as-of the selected end date. Do not claim the performance target is met until measured.

## ADR-011: Do not conflate Swing MVP with platform commitments

- **Status:** Accepted by source
- **Context:** FR-012/NFR-005 require web-primary, Android, and iOS, while the initial presentation commitment is Swing.
- **Decision:** Keep domain/application use cases independent of Swing so future platform adapters can use the same service. Treat web and mobile applications as full-product work outside this MVP.
- **Alternatives considered:** Call Swing a substitute for web/mobile — directly contradicts FR-012. Build all clients in this MVP — exceeds the explicit MVP scope.
- **Consequences:** Traceability marks FR-012/NFR-005 as full-product scope and does not treat desktop acceptance as satisfying them.

## ADR-012: PlantUML, JUnit 5, and human review

- **Status:** Accepted by source
- **Context:** These are binding constitution requirements.
- **Decision:** Maintain architecture/interaction diagram sources as PlantUML; verify business behavior with JUnit 5 and minimize GUI-dependent tests; require a responsible human to review this design and implementation evidence.
- **Alternatives considered:** None; these constraints are binding.
- **Consequences:** Diagram changes stay synchronized with prose and tests. This proposal is not accepted or test-verified until reviewed.
