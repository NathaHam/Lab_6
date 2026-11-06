# SplitSmart — Final Decision Record

**Status**: Final design package. Human review required (Constitution IX).
IDs used here: **HD** = approved human decision, **AD** = adopted proposal element (approved through HD-01 to HD-05), **OD** = open decision, **RJ** = rejected alternative. The cross-review IDs (`cross-review/decision-log.md` DR-xx) are cross-referenced.

## 1. Approved human decisions

All HD items were approved by the user in `design/consolidation-instructions.md` (repository commit `63c5c16`). Items marked *source rule* restate the customer requirement or the 2026-10-29 clarifications. They are not new policy.

| ID | Decision | Context | Consequences | DR |
|---|---|---|---|---|
| HD-01 | **The Spec Kit proposal is the MVP baseline**: four layers (Swing presentation → application → domain → infrastructure), one deployable server, no microservices or frameworks without a requirement. | Two proposals. The cross-review found Spec Kit simpler and more coherent. | Smaller design. Claude's extra detail is adopted only where HD-03 says so. | — |
| HD-02 | **A thin Swing client calls a shared application server.** Clients never connect to the database or hold database or provider credentials. The server is the trust boundary. | Direct database access from a desktop client cannot enforce NFR-001 or keep the outbox running (CR-01). | Authorization, the outbox dispatcher and secrets all live on the server. The Swing client needs a transport adapter (OD-24). This is the seam for full-product clients. | DR-01 |
| HD-03 | **Claude elements adopted**: immutable IDs and value objects that encode invariants; stable command IDs and idempotency; optimistic versions; unique source-posting constraints; the concurrency scenarios; the security and session threat treatment. | Cross-review §6 and §11. | See AD-01 to AD-07. Value objects are used only where they enforce a rule. | — |
| HD-04 | **The append-only ledger is the financial source of truth.** Balances are derived from the ledger. A projection is optional, atomic and rebuildable, and is added only on performance evidence. | Spec Kit ADR, cross-review DR-22. | No mutable balance totals as truth. OD-22 decides whether a projection is needed. | DR-22 |
| HD-05 | **Provider-neutral ports** for email and private receipt storage. A **transactional outbox** provides durable notification delivery. | FR-005, FR-007, NFR-001. | No provider is chosen (OD-17, OD-19). Email is at-least-once with idempotency keys. Exactly-once delivery is not claimed. | DR-18, DR-20 |
| HD-06 | **Per-expense reviewer designation is authoritative** in the Swing MVP. A standing group reviewer is only a prefill that the manager confirms for each expense. Multiple levels are full product, behind the `ReviewPolicy` seam. | FR-006. Fixes CR-07 (Claude standing-reviewer ambiguity). | The `ReviewerAssignment` is stored on each expense. The group default is never checked when authorizing a decision. | DR-08 |
| HD-07 | **Only submission notices are mandatory.** Approval and rejection notices are not MVP behaviour. They need a product decision (OD-13). | FR-007. Fixes CR-08. | There is no `EXPENSE_DECIDED` notice type in the MVP. | DR-11 |
| HD-08 | **Lifecycle**: pending and rejected expenses never post. Approval posts exactly once, in the same transaction as the decision. Terminal records are never edited or reopened. | FR-006, FR-008, NFR-006. | Correction and resubmission policy stays open (OD-09). | DR-23 |
| HD-09 | **Money rules** *(source rule)*: `BigDecimal`, exact minor units, exactly 100%, largest remainder, alphabetical ties, the payer's self-share is not a debt, negative expenses rejected, zero accepted. | Constitution V, FR-003, FR-004. | One integer allocation algorithm (design.md §4). | — |
| HD-10 | **Fail closed on identical-name ties** that would change an allocation. No user-ID, join-order, locale or collation tie-break is used. | FR-004, CR-02. | Some valid expenses are rejected until OD-01 is decided. The UI explains the reason. | DR-04 |
| HD-11 | **The database vendor is not selected.** The design states the capabilities a store must provide. | CR-04. | data-model.md §8 lists them. The vendor-specific schema is written after OD-23. | DR-02 |
| HD-12 | **Swing does not satisfy FR-012 or NFR-005** *(source rule)*. | Constitution, Customer Requirements section. | Full-product clients need their own design and parity tests. | DR-24 |

## 2. Adopted proposal elements

| ID | Element | From | Where |
|---|---|---|---|
| AD-01 | Typed IDs (`UserId`, `GroupId`, `ExpenseId`, `PaymentId`, `InvitationId`, `CommandId`) and the value objects `Money`, `CurrencyUnit`, `Percentage`, `DateRange`, `EmailAddress`, `ParticipantName` | Claude | design.md §2, data-model.md §2 |
| AD-02 | One integer largest-remainder algorithm for equal and percentage splits, with an ambiguity check | Claude, with Spec Kit's rules | design.md §4 |
| AD-03 | `processed_command` table holding a command ID and request fingerprint. Same ID with different data is a conflict. | Claude, Spec Kit contract | design.md §9, data-model.md §5 |
| AD-04 | Optimistic `version` on aggregates, and `expectedVersion` on review commands | Claude | design.md §9 |
| AD-05 | Unique constraints on ledger source postings | Both | data-model.md §6 |
| AD-06 | Ledger serialization per group through a `LedgerHead` row, which is simpler than pair-lock ordering | Spec Kit simplicity applied to Claude's concurrency analysis | design.md §9.3 |
| AD-07 | Server-side opaque sessions, TOTP last-accepted-step replay check, encrypted TOTP secret with a key ID, hashed one-use recovery codes, rate limiting, secret-safe logs | Claude, parameters removed | design.md §10 |
| AD-08 | Application-boundary operation list and external-port contracts | Spec Kit `contracts/` | design.md §3, architecture.md §6 |
| AD-09 | Extra diagrams for notifications and payment settlement | Claude | diagrams/ |

## 3. Open decisions

None of these is approved. Each interim behaviour is the safe default that the design implements until the decision is made. A policy or configuration boundary isolates the decision where that is practical.

| ID | Question | Owner | Impact | Safe interim behaviour (boundary) | Gate | DR |
|---|---|---|---|---|---|---|
| OD-01 | How should remainder ties between identical names be resolved? | Product owner | FR-004 allocation | Reject the allocation when the cut falls inside a run of identical names (`TieBreakPolicy`) | Before allocator acceptance | DR-04 |
| OD-02 | Alphabetical collation: case, accents, locale, normalization, name snapshot timing | Product owner + tech lead | FR-004 order | Use the name snapshot taken at submission. Fold each name (Unicode NFKD, remove combining marks, Unicode case fold) and compare the folded forms by code point. Names whose folded forms are equal count as identical under OD-01 and fail closed. This interim order is not an approved collation. Frozen test vectors use only unambiguous ASCII names. (`NameOrdering`) | Before allocator test vectors are frozen | DR-05 |
| OD-03 | Currency catalogue, minor-unit metadata source, amount bounds, storage width | Product/finance + tech lead | NFR-002, schema | No currency enabled until configured. Group creation fails closed. (`SupportedCurrencies`) | Before schema, API and financial tests | DR-03 |
| OD-04 | Percentage input precision, and whether 0% shares are valid | Product/finance | FR-004 input | 0% accepted, because the source rejects only negatives. Maximum percentage scale is a required configuration value with no default. Startup fails if it is missing. (`PercentagePolicy`) | Before split UI and API | DR-06 |
| OD-05 | Per-group or cross-group balance netting and payment cap | Product/finance | FR-008, FR-009 | Per group. The payment cap is the debt within the group. The personal view lists each group separately. | Before the balance and payment contract | DR-07 |
| OD-06 | Who may record a payment, and is recipient confirmation needed? | Product owner | FR-009 authorization | Only the debtor or the creditor may record. No confirmation step. (`PaymentPolicy`) | Before the payment use case | DR-12 |
| OD-07 | Zero and negative payment rule | Product/finance | FR-009 validation | Reject both, with no change | Before payment tests | DR-13 |
| OD-08 | How are mistaken payments corrected or voided? | Product/finance | FR-009 history | Not supported. No edit or delete path exists. A future correction must be a new ledger record. | Before correction UI | DR-12 |
| OD-09 | Expense withdraw, edit, correction and resubmission | Product owner | FR-003, FR-006 | No edit. A user may submit a new expense. The `supersedes` link is reserved but unused. | Before edit UI | DR-23 |
| OD-10 | Reviewer reassignment, including when the designated reviewer is removed | Product owner | FR-006 | The manager may re-designate while the expense is pending and undecided, under a version check, with an audit record | Before the MVP review workflow | DR-08 |
| OD-11 | Full-product multi-level semantics: order, configuration, rejection, replacement | Product owner | FR-006 full product | Not built. `ReviewPolicy` seam and a `level` column only | Before full-product design | DR-09 |
| OD-12 | What does "signed out" mean? Sessions across devices, idle and absolute lifetimes | Product + security + tech lead | FR-007 recipients | Signed in means at least one fully authenticated, unexpired, unrevoked server session at the submission commit's snapshot. Otherwise the member is signed out. Lifetimes are security configuration with no approved values. | Before notification implementation | DR-10 |
| OD-13 | Does the submitter get their own notice? Are decision notices wanted? | Product owner | FR-007 | Notices go to other members only. The submitter sees the expense in activity. No decision notices. | Before the notification contract | DR-11 |
| OD-14 | Removed members: history access, open balances, pending items | Product + privacy | FR-002, NFR-001 | Deny all access after removal. Refuse removal while the member has a nonzero balance in the group or is payer, participant or designated reviewer of a pending expense. | Before membership removal | DR-15 |
| OD-15 | Invitation identity matching, channel, expiry, duplicates | Product + security | FR-002 | The invitation shows in-app to the account whose verified normalized email matches. No email invitation and no expiry. One pending invitation per group and email. | Before invitations | DR-16 |
| OD-16 | Several managers, manager transfer, last-manager rule | Product owner | FR-002 | The creator is the only manager. The manager cannot be removed. | Before group management | DR-17 |
| OD-17 | Receipt formats, size, scanning, metadata stripping, provider, retention, orphan cleanup | Product + security + ops | FR-005 | Private store. Authorized reads only. Uploads larger than a configured limit are rejected (startup fails if the limit is missing). Content is not decoded or transformed. Unreferenced objects are flagged for cleanup but not auto-deleted. | Before receipt integration | DR-18 |
| OD-18 | Password-hash algorithm and parameters, TOTP window, key custody and rotation, session lifetimes, rate limits, recovery-code count, account recovery | Security owner | FR-001, NFR-001 | Controls are required. All parameters are configuration that needs security approval. Release is blocked until approved. | Before authentication implementation | DR-19 |
| OD-19 | Email provider, sender, templates, retry schedule, alert ownership | Ops + product + security | FR-001, FR-007 | `EmailGateway` port with a test double. Retries are bounded and configurable. Final failure is visible to operators. | Before email integration | DR-20 |
| OD-20 | Report date fields, time zone, current or as-of balances | Product owner | FR-010, FR-011 | Expense date and payment date. Plain calendar dates. Balances labelled "current". | Before the report contract and UI | DR-14 |
| OD-21 | NFR-003 profile: hardware, network, concurrency, workload mix, data shape, measurement boundary | Product + ops + tech lead | NFR-003 | The test harness is parameterized. No pass is claimed until the profile is approved. | Before performance acceptance | DR-21 |
| OD-22 | Is a balance projection needed? | Tech lead + ops | NFR-003 | Ledger-derived queries. Projection off. | After the first NFR-003 measurement | DR-22 |
| OD-23 | Database vendor and isolation level | Tech lead + ops | NFR-006, all persistence | Logical model only. Vendor-specific DDL is not written. | Before persistence implementation | DR-02 |
| OD-24 | Client-server transport, serialization and API versioning | Tech lead + security | HD-02 | Conceptual operations only (design.md §3). Encrypted, server-authenticated transport is required. | Before the client adapter | — |
| OD-25 | Web and mobile technology and support matrix | Product + tech lead | FR-012, NFR-005 | Not designed. | Before full-product planning | DR-24 |
| OD-26 | Data retention, account deletion, audit and processed-command retention | Product + privacy | NFR-001 | Keep everything. No deletion path. | Before production data | spec open Q |
| OD-27 | Report export, custom fields, saved reports | Product owner | FR-011 | None (source excludes export) | Only if requested | spec open Q |
| OD-28 | Maven module layout, JPMS | Tech lead | Constitution I, III | Proposal: `contract`, `domain`, `application`, `server`, `swing-client` modules. No JPMS. | Before the code baseline | cross-review §6 |

## 4. Rejected alternatives

| ID | Alternative | Why rejected |
|---|---|---|
| RJ-01 | The Swing client connects directly to a shared database | Database credentials end up on user machines, authorization is bypassable and the outbox does not run reliably (HD-02) |
| RJ-02 | Microservices, or a framework without a requirement | Not justified at MVP scale (HD-01, Constitution III) |
| RJ-03 | Mutable stored balances as the source of truth | History cannot be audited or rebuilt (HD-04) |
| RJ-04 | User-ID, join-order, locale or database-collation tie-break for identical names | Invents policy (HD-10) |
| RJ-05 | `decimal(18,4)` columns, strictly positive percentages and 2-decimal percentages as requirements | Not in the source (OD-03, OD-04). They may return as approved configuration. |
| RJ-06 | PostgreSQL as an accepted choice | Vendor not selected (HD-11). It remains a candidate. |
| RJ-07 | Standing group reviewer as review authority | Contradicts per-expense designation (HD-06) |
| RJ-08 | Mandatory approval and rejection notices | Not required by the source (HD-07) |
| RJ-09 | `float` or `double` for money | Constitution V |
| RJ-10 | Spreading the payer's share over the other participants | Contradicts FR-003 and FR-008 |
| RJ-11 | Editing or reopening approved or rejected expenses, or editing payments | Rewrites financial history (HD-08) |
| RJ-12 | Claiming exactly-once email delivery | Not achievable with an external provider. The design is at-least-once with idempotency keys. |
| RJ-13 | Pair-row lock ordering as the MVP concurrency mechanism | More complex than a per-group ledger head at 50 members. It can be revisited if OD-22 measurements show contention. |
| RJ-14 | Fixed session timeouts or crypto parameters taken from the proposals | Not security-approved (OD-12, OD-18) |

## 5. Sign-off

Human review is required before acceptance (Constitution IX). Product owner, technical lead, security reviewer, operations owner: name, date, disposition.
