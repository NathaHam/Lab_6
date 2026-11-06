# SplitSmart — Cross-Review Decision Log

**Purpose:** Record human decisions needed to reconcile the Spec Kit and Claude Code proposals. This file is a decision register/template, not a record of approvals. No decision below is approved merely because a proposal recommends it.

## 1. Decision record template

Copy this block for each decision:

| Field | Entry |
|---|---|
| Decision ID | DR-__ |
| Question | |
| Source requirement / constitution | |
| Proposal A position | |
| Proposal B position | |
| Options considered | |
| Human decision | Pending |
| Rationale / rejected alternatives | |
| Owner / approver | |
| Date | |
| Affected files / diagrams / tests | |
| Follow-up action and due point | |

## 2. Consolidated decision register

| ID | Decision required | Source / impact | Proposal A | Proposal B | Recommendation for human review | Owner | Timing |
|---|---|---|---|---|---|---|---|
| DR-01 | Approve deployment topology: thin Swing client + shared service, or alternative | NFR-001, FR-007, FR-012 evolution; authorization and durable email | Recommends Java service boundary | Recommends server topology B; rejects direct DB client for real users | Approve shared service for multi-user MVP; client must not hold DB credentials. | Product owner + technical lead + security | Before architecture baseline |
| DR-02 | Select persistence technology and transaction guarantees | Financial correctness, auditability, NFR-003 | Relational DB; PostgreSQL candidate | Technology-neutral; defer vendor | Select only after verifying ACID transactions, unique constraints, row locks or compare-and-set, migrations, backup/restore. PostgreSQL is a candidate, not an accepted source fact. | Technical lead + operations | Before persistence implementation |
| DR-03 | Supported currency catalogue and authoritative minor-unit scale | FR-003/004, NFR-002 | Currency-specific scale; source/metadata open | ISO 4217 parameterized; decimal(18,4) proposal | Approve supported codes, metadata source/version, scale and amount bounds. Validate storage can represent every supported currency exactly. | Product owner/finance + technical lead | Before schema/API and financial tests |
| DR-04 | Identical participant-name remainder ties | FR-004; spec explicitly leaves unresolved | No invented ID tie-break; block ambiguous tie | Fail closed; human decision remains open | Choose a deterministic policy (e.g. approved unique-name constraint or an explicitly approved stable secondary key). Until then, fail closed whenever ordering affects allocation. | Product owner | Before allocator acceptance |
| DR-05 | Alphabetical collation and display-name snapshot rules | FR-004 | Alphabetical order; case/accent/locale open | Proposes Locale.ROOT Collator and name snapshot | Decide normalization, case, accents, locale and snapshot timing; do not accept the proposed collation without approval. | Product owner + technical lead | Before allocator test vectors |
| DR-06 | Percentage precision and whether 0% participant shares are valid | FR-004/NFR-002 | Precision open; nonnegative percentages | Proposes max scale 2 and strictly positive shares | Do not silently impose B's >0 restriction. Approve precision and zero-share policy; retain exact 100% total. | Product owner/finance | Before split input/API design |
| DR-07 | Per-group or cross-group pairwise balance/payment-cap scope | FR-008/009 wording | Group-scoped model | Per-group default proposed; OQ-04 open | Decide explicitly; document how personal balances across groups/currencies are displayed and how payment caps are computed. | Product owner/finance | Before balance/payment contract |
| DR-08 | Per-expense reviewer designation vs standing group default | FR-006 | Exactly one manager-designated reviewer per expense | Per-expense reviewer plus optional standing reviewer default; OQ-12 open | The per-expense assignment is authoritative. A standing default may prefill but must be copied/confirmed per expense. | Product owner | Before MVP review workflow |
| DR-09 | Full-product multiple review-level semantics | FR-006 full product | Multi-level capability acknowledged | MultiLevelPolicy extension; sequential/parallel open | Decide sequential vs parallel, who configures levels, rejection behavior, reviewer replacement, and when all approvals are complete. | Product owner | Before full-product design |
| DR-10 | Signed-out definition and submission-time recipient snapshot | FR-007 | Snapshot sign-in state; exact session definition open | FULL session/timeouts proposed as placeholders; OQ-18 | Define active session across devices, expiry, offline/closed app, and exact snapshot instant; do not adopt placeholder timeouts without approval. | Product owner + security + technical lead | Before notification implementation |
| DR-11 | Submission notification recipient semantics and optional decision notices | FR-007 | In-app + email signed-out; review outcome notices not required by source | Same submission notice; prose includes outcome notices while OQ-15 leaves unsettled | Notify “other members” on submission as specified; clarify whether submitter sees an in-app copy under “all group members.” Treat approval/rejection notices as optional and off until approved. | Product owner | Before notification contract |
| DR-12 | Payment authorization, confirmation, and correction | FR-009 | Open question | Payer or recipient proposed; no confirmation/correction proposed | Decide who may record a payment, whether recipient confirmation is required, and how mistakes are corrected without rewriting history. | Product owner | Before payment use case |
| DR-13 | Zero/negative payment behavior | FR-009 edge validation; not explicitly clarified in source | Positive payment proposed | Reject <=0 proposed | Record explicit validation rule; reject zero/negative is a reasonable recommendation but not a customer fact. | Product owner/finance | Before payment tests |
| DR-14 | Report event date, timezone, and current vs as-of balance | FR-010/011, inclusive range | Open | Expense/payment date, current balance + period net change proposed; date semantics OQ-23/36 | Define date field per record type, timezone/calendar boundary, and whether balance summary is current or as-of end date. | Product owner | Before report contract/UI |
| DR-15 | Removed-member historical access and unresolved financial items | FR-002/NFR-001 | Default deny until policy decision | No access proposed; open OQ-10/11 | Decide history/notification visibility, pending reviewer reassignment, and balances involving removed members. | Product owner + privacy/security | Before membership removal implementation |
| DR-16 | Invitation identity, channel, expiry, duplicates and revocation | FR-002 | Open | Invite by email/no expiry proposed; OQ-26 | Approve identity matching, account creation flow, expiration, duplicate invite and race handling. | Product owner + security | Before invitation implementation |
| DR-17 | Manager multiplicity and transfer | FR-002 | Open | Sole creator-manager proposed; last manager cannot be removed | Decide multiple managers, transfer, self-removal and last-manager safeguards. | Product owner | Before group management implementation |
| DR-18 | Receipt provider, formats, size, scanning, metadata and retention | FR-005/NFR-001 | Provider-neutral private store | Content-addressed store, ImageIO/metadata-stripping proposal | Keep private authorized access; approve format/size/scanning, upload compensation, metadata, deletion and retention. | Product owner + security + operations | Before receipt integration |
| DR-19 | Authentication algorithms, key custody, sessions, lockout and recovery | FR-001/NFR-001; Constitution V/IX | Adaptive hash, TOTP, protected secret; policy open | PBKDF2/TOTP/AES-GCM and timeout/lockout proposals | Security reviewer must approve algorithms/parameters, TOTP replay/window, recovery code lifecycle, key management, rate limits and session revocation. | Security owner | Before authentication implementation |
| DR-20 | Email provider/content/retry/monitoring | FR-001/007 | Provider-neutral port; retry open | Provider-neutral gateway; retry schedule proposed | Approve provider, sender, verification and expense templates, data minimization, retry/alert ownership. | Operations + product + security | Before email integration |
| DR-21 | NFR-003 normal operating profile | NFR-003 | Environment not supplied | OQ-33; profile to be defined | Specify hardware, network, concurrency, workload mix, data distribution, deployment and client/server measurement boundary. | Product owner + operations + technical lead | Before performance acceptance |
| DR-22 | Projection strategy and reconciliation | NFR-003, FR-008/009 | Projection only if measured need | Pair-balance projection recommended | Start from ledger-derived queries; add a projection only if measured performance requires it, updated atomically and rebuildable. | Technical lead + operations | Before projection implementation |
| DR-23 | Expense edit/withdraw/resubmission/correction | FR-003/006/008 audit | Rejected expense correction open | New linked expense proposed; pending edits unsupported proposal | Preserve submitted/reviewed financial history. Decide correction and withdrawal lifecycle before UI supports it. | Product owner | Before edit/correction UI |
| DR-24 | Full-product web/mobile technology and support matrix | FR-012/NFR-005 | Shared application boundary | Shared API; client tech open | Plan web-primary, Android, iOS separately; define browsers/OS, notifications and parity acceptance. | Product owner + technical lead | Before full-product design |

## 3. Human decisions not yet approved

All DR-01 through DR-24 remain **Pending**. Proposal status labels such as “accepted by source” only mean the underlying rule comes from the source documents; they do not approve the architecture or authorize implementation.

## 4. Adoption record

| Area | Recommended disposition | Human decision |
|---|---|---|
| Layered architecture | Combine; use Spec Kit's simple four-layer baseline and Claude's value-object detail where useful | Pending |
| Deployment | Shared service + thin Swing client | Pending |
| Database | Defer vendor; PostgreSQL candidate | Pending |
| Money and split algorithm | Common BigDecimal + exact largest remainder; fail closed on unresolved identical-name tie | Pending |
| Ledger/payment transaction model | Combine append-only ledger, atomic transaction, uniqueness, idempotency and concurrency control | Pending |
| Security | Central server-side authorization; defer algorithms/parameters to security review | Pending |
| Notifications | Transactional outbox and persistent in-app notice; signed-out semantics unresolved | Pending |
| Receipts | Private provider-neutral storage; policy deferred | Pending |
| Reporting | Authorized bounded queries; date and balance semantics deferred | Pending |
| Full product | Shared service evolution; separate platform design and parity testing | Pending |

## 5. Sign-off

- Product owner: ____________________ Date: __________
- Technical lead: ___________________ Date: __________
- Security reviewer: ________________ Date: __________
- Operations/data owner: ____________ Date: __________
- Final disposition: ☐ Accept ☐ Accept with changes ☐ Reject ☐ Defer
