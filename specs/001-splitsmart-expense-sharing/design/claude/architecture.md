# SplitSmart — Architecture (Claude independent proposal)

**Status**: Draft proposal, AI-generated. Requires review by a responsible human
before acceptance (Constitution IX). Nothing here is verified evidence.

**Date**: 2026-11-05 · **Feature**: `specs/001-splitsmart-expense-sharing`

Companion files: [design.md](design.md) · [data-model.md](data-model.md) ·
[decisions.md](decisions.md) · [traceability.md](traceability.md) ·
[open-questions.md](open-questions.md) ·
[design-review-checklist.md](design-review-checklist.md) · [diagrams/](diagrams/)

## 0. Statement labels

Every material statement in this design set carries one of these labels, or is
in a section that states its label:

| Label | Meaning |
|---|---|
| **[FACT]** | Stated in `UserRequirement.md`, `spec.md`, or the constitution, or observed in the repository. |
| **[ASSUMPTION]** | Taken as true for the design to proceed; needs confirmation. |
| **[PROPOSAL]** | A design recommendation from this document. Not accepted until a human approves it. |
| **[DECISION NEEDED]** | A human must choose. See [open-questions.md](open-questions.md). |

## 1. Inputs

### 1.1 Sources read in full [FACT]

| Source | Role |
|---|---|
| `UserRequirement.md` | Authoritative customer outcomes. |
| `.specify/memory/constitution.md` (v1.0.0) | Binding engineering rules. |
| `specs/001-splitsmart-expense-sharing/spec.md` | Clarified, testable interpretation (FR-001–FR-012, NFR-001–NFR-005, AC-001–AC-010). |

### 1.2 Repository inspection [FACT]

- Branch `main`, working tree clean when inspected.
- **No Maven configuration** (`pom.xml` absent), **no production code**,
  **no tests**, and **no project diagrams** outside other design proposals.
- The local machine has JDK 25 (Temurin), not JDK 21. The build must set
  `maven.compiler.release=21` so the result still targets Java 21
  (Constitution I).
- The repository has other AI-generated design material:
  `design/speckit/`, `plan.md`, and `design-prompts/`. **It was not opened**,
  so this proposal stays independent, as the task requires.

### 1.3 Missing inputs

| Missing input | Consequence for this design |
|---|---|
| Maven project, code, and tests | Module and package layout is a greenfield **[PROPOSAL]**. No existing code constrains it. |
| Database choice | Persistence is specified as logical constraints and ports only (ADR-013). |
| Email provider | `EmailGateway` port only. |
| Receipt storage provider, image formats, and size limits | `ReceiptStore` port and a validation policy object with undecided parameters. |
| Supported currency list | `CurrencyUnit` is parameterised by ISO 4217 code and minor-unit digits. The list is open (OQ-03). |
| Retention, deletion, and account-recovery policy | Not designed beyond recovery codes. See OQ-09. |
| Deployment environment for "normal operating conditions" (NFR-003) | The performance test design is parameterised (OQ-33). |

## 2. Scope boundary

| Scope | Contents | Status in this design |
|---|---|---|
| **Java Swing MVP** [FACT] | FR-001 to FR-011 and NFR-001 to NFR-004, with exactly one review level. | Designed in full. |
| **Full product** [FACT] | FR-012 and NFR-005 (web-primary product plus Android and iOS apps), and configurable multiple review levels in FR-006. | Designed as an **evolution path**: extension points and a server API boundary. **The Swing MVP does not satisfy FR-012 or NFR-005, and this design never claims it does.** |
| Excluded unless sources change [FACT, spec Assumptions] | Foreign exchange, offline entry and sync, report export or sharing. | Not designed. Nothing in the design prevents adding them later. |

## 3. System context

See [diagrams/context.puml](diagrams/context.puml) and
[diagrams/use-case.puml](diagrams/use-case.puml).

### 3.1 Actors [FACT, spec §Actors]

Actors are roles, not separate account types. One person can hold several
roles.

| Actor | Key capabilities |
|---|---|
| Individual user | Register, verify email, enroll MFA, sign in, view own data. |
| Group manager | Create group, invite and remove members, designate the reviewer. |
| Invited person | Accept or decline an invitation. |
| Expense submitter | Submit an expense with an optional receipt. |
| Designated reviewer | Approve or reject an expense that someone else submitted. |
| Expense participant / group member | View expenses, balances, notifications, and reports; record payments. |

### 3.2 External systems

| System | Purpose | Status |
|---|---|---|
| Email service | Verification email; expense notices to members who are signed out. | Provider undecided [DECISION NEEDED, OQ-07]. |
| Authenticator app on the user's device | Generates time-based one-time password (TOTP) codes. | Standard RFC 6238 apps [PROPOSAL, ADR-011]. |
| Persistent data store | Accounts, groups, expenses, payments, ledger, notifications. | Technology undecided [DECISION NEEDED, OQ-06]. |
| Receipt object store | Receipt image bytes. | Provider undecided [DECISION NEEDED, OQ-08]. |
| Full product only: web browser, Android and iOS apps, push services | FR-012 and NFR-005 clients. | Future work. |

### 3.3 Trust boundaries [PROPOSAL]

| ID | Boundary | Rule |
|---|---|---|
| **TB-1** | User device ↔ SplitSmart application core | Everything on the user's machine is **untrusted**: the Swing client, and later browsers and mobile apps. Authentication, authorization, validation, money calculation, and state transitions run on the trusted side. The client may *preview* split results, but only by calling the core. It never computes authoritative values. |
| **TB-2** | Application core ↔ data store and receipt store | Only the core holds credentials. User devices never connect to the database or receipt store directly. |
| **TB-3** | Application core ↔ email provider | Outbound only. Email content is minimised (OQ-17) and leaves the trust zone. |
| **TB-4** | Authenticator app ↔ user | The TOTP shared secret is shown once at enrollment. After that it lives encrypted in the data store. |

TB-1 drives the most important topology decision (ADR-002). If every Swing
client ran the core in-process and connected straight to a shared database,
each user's machine would hold database credentials. A user could then bypass
authorization entirely, which violates NFR-001. Email retries would also stop
whenever the submitter closed the app.

## 4. Architectural style [PROPOSAL, ADR-001]

The design uses **layered ports-and-adapters**. Dependencies point inward
only:

```
presentation (Swing)  ─┐
server API (future)   ─┼─► application ─► domain
infrastructure adapters ┘      ▲ (ports defined here, implemented by infrastructure)
```

| Layer | Responsibility | Must not |
|---|---|---|
| **Domain** (`com.splitsmart.domain`) | Entities, value objects, aggregates, invariants, money and allocation algorithms, the expense state machine, the approval policy, and the balance calculation. Pure Java with no I/O. | Depend on Swing, JDBC, the network, the clock (it receives time as an `Instant` or `LocalDate`), or any other layer. |
| **Application** (`com.splitsmart.application`) | Use-case services (commands and queries), authorization checks, transaction boundaries, idempotency, and outbox writes. Defines **ports**: repositories, `EmailGateway`, `ReceiptStore`, `Clock`, `IdGenerator`, `PasswordHasher`, `SecretCipher`, `UnitOfWork`. Exposes `api` DTO records and facade interfaces. | Depend on Swing or concrete infrastructure. |
| **Infrastructure** (`com.splitsmart.infrastructure`) | Adapters for the chosen database, email, and receipt store, plus crypto (PBKDF2, TOTP, AES-GCM), the outbox dispatcher, in-memory adapters for tests, and the composition roots. | Contain business rules. |
| **Presentation** (`com.splitsmart.presentation.swing`) | Swing views, presenters, view models, display formatting, and SwingWorker orchestration. | Compute shares or balances, decide authorization, or touch infrastructure. It talks only to `application.api` interfaces. |

### 4.1 Maven and JPMS layout [PROPOSAL, ADR-001]

| Maven module | JPMS module | Depends on | Exports |
|---|---|---|---|
| `splitsmart-domain` | `com.splitsmart.domain` | nothing | domain packages |
| `splitsmart-application` | `com.splitsmart.application` | domain | `application.api` to all; `application.port` to infrastructure only (qualified export) |
| `splitsmart-infrastructure` | `com.splitsmart.infrastructure` | application, domain | none (composition root only) |
| `splitsmart-swing` | `com.splitsmart.presentation.swing` | `application.api` only (through `requires com.splitsmart.application`) | none |
| `splitsmart-server` (only if ADR-002 option B is accepted) | `com.splitsmart.server` | application, infrastructure | none |

A parent POM pins `maven.compiler.release=21` and JUnit 5 (the
`junit-jupiter` BOM). Maven module dependencies plus JPMS exports **enforce
dependency direction at compile time**, with no extra architecture-testing
library. The only third-party dependencies proposed are JUnit 5 for tests and
whatever database driver and email client the humans choose. Dependency
injection is manual, in a composition root. No ORM or DI framework is
proposed (ADR-017).

## 5. Components

See [diagrams/components.puml](diagrams/components.puml).

| Component | Layer | Responsibilities | Main requirements |
|---|---|---|---|
| `AccountService` | application | Registration, email verification, MFA enrollment, sign-in, recovery codes, sessions | FR-001, NFR-001 |
| `AccessPolicy` | application | Single place that answers "may principal P do action A on resource R?" | NFR-001, FR-002, FR-006 |
| `GroupService` | application | Create group, invite, accept, decline, revoke, remove member, designate reviewer | FR-002, FR-006 |
| `ExpenseService` | application | Preview split, submit expense, attach receipt, query expenses | FR-003–FR-005, NFR-004 |
| `ReviewService` | application | Approve or reject; post ledger entries on approval | FR-006, FR-008 |
| `PaymentService` | application | Record payment with overpayment check; payment history | FR-009, FR-008 |
| `BalanceQueryService` | application | Pairwise net balances per group, and a personal cross-group view per currency | FR-008, NFR-002, NFR-003 |
| `NotificationService` | application | Create in-app notices and email outbox records; list and mark-read | FR-007 |
| `OutboxDispatcher` | infrastructure | Deliver queued email with retries and backoff | FR-007, FR-001 (verification email) |
| `ReportService` | application | Summaries and filtered reports | FR-010, FR-011, NFR-003 |
| `ShareAllocator` | domain | Exact largest-remainder allocation | FR-004, NFR-002 |
| `ApprovalPolicy` | domain | MVP `SingleReviewerPolicy`; full product `MultiLevelPolicy` | FR-006 |
| `BalanceCalculator` | domain | Pure fold of ledger entries into pairwise nets | FR-008 |
| Repository adapters | infrastructure | Persistence for the chosen technology, plus in-memory versions for tests | all |
| Swing presenters and views | presentation | UI only | all MVP FRs (presentation only) |

## 6. Deployment [PROPOSAL, ADR-002, DECISION NEEDED]

See [diagrams/deployment.puml](diagrams/deployment.puml).

**Recommended topology (option B):**

- **Desktop**: the Swing client (`splitsmart-swing`) runs on each user's
  machine. It contains only presentation code and a client-side
  implementation of the `application.api` facades that forwards calls to the
  server.
- **SplitSmart application server**: one JVM running the application and
  domain layers, all infrastructure adapters, the outbox dispatcher, and a
  remote API adapter (protocol and library are OQ-28).
- **Managed services**: the data store, receipt store, and email provider,
  reachable only from the server (TB-2, TB-3).

**Development and test composition:** the Swing client can be wired directly
to in-process application services with in-memory adapters, so a developer
can run it on one machine. This composition is **not** a supported
multi-user deployment, because it does not enforce TB-1. It must be labelled
that way in the UI title bar and in the documentation.

The full product (FR-012) adds web, Android, and iOS clients against the
**same server API**. That is why option B is the recommendation and not an
MVP-only shortcut.

## 7. Cross-cutting concerns

The sections below summarise each concern. Details are in
[design.md](design.md).

### 7.1 Money [PROPOSAL, ADR-003, ADR-004]

- `Money` is a `BigDecimal` paired with a `CurrencyUnit`. The scale always
  equals the currency's minor-unit digits. Input with more decimal places is
  **rejected, never rounded silently**.
- `float` and `double` are banned for money. Review checks this, and a
  source-scan test is proposed (design.md §12.6).
- Shares are allocated in integer minor units using the largest-remainder
  method. Ties go to the alphabetically earlier participant name. If the
  outcome would depend on two **identical** names, the allocation **fails
  closed** with an explicit error until humans choose a rule (OQ-01). This
  design does not invent a tie-break.
- Each group has exactly one currency, fixed when the group is created. There
  is no FX conversion. Cross-group totals are always shown per currency and
  never summed across currencies.

### 7.2 Persistence and transactions [PROPOSAL, ADR-013]

- **One application command is one transaction**, run through the
  `UnitOfWork` port.
- Aggregates use optimistic versioning.
- The pair-balance row is locked when payments are recorded and when
  expenses are approved.
- Ledger entries are append-only, and a unique constraint on their source
  prevents duplicate posting.
- Whatever data store the humans choose must provide ACID transactions,
  unique constraints, and either row locking or compare-and-set versioning.

### 7.3 Concurrency and idempotency [PROPOSAL, ADR-008]

- Mutating commands from clients carry a client-generated `CommandId` (UUID).
  The server stores processed command IDs, so retries are safe.
- The expense state machine makes approve and reject naturally idempotent.
- Concurrent payments on the same debtor/creditor pair are serialised by the
  pair-balance lock, so their combined amount cannot exceed the debt.

### 7.4 Security [PROPOSAL, ADR-011]

- Passwords are hashed with PBKDF2-HMAC-SHA256 from the JDK.
- TOTP follows RFC 6238 and is built with JDK `javax.crypto`.
- Ten single-use recovery codes are stored hashed.
- Sessions are server-side, opaque, and random, and only a session that has
  completed MFA can call business operations.
- All authorization goes through `AccessPolicy`. Queries about groups that a
  user may not see return "not found", so the existence of the group is not
  leaked.

### 7.5 Notifications [PROPOSAL, ADR-010]

- In-app notifications and email outbox records are written **in the same
  transaction** as the submitted expense.
- The dispatcher retries email with exponential backoff. Parameters are
  OQ-27.
- Email failure never affects the in-app notice or the expense itself.

### 7.6 Receipts [PROPOSAL, ADR-012]

- Image bytes live in the `ReceiptStore`, addressed by a content hash.
  Metadata lives in the data store.
- Access is only through `ExpenseService.getReceipt`, after a membership
  check. There are no public URLs.

### 7.7 Performance [PROPOSAL, NFR-003]

- A pair-balance projection keeps balance views O(pairs): at most 1,225 pairs
  for 50 members.
- Report queries are indexed by group and date.
- Expense lists are paginated.
- Receipts load lazily.
- Swing does all I/O off the Event Dispatch Thread (EDT).
- A dedicated performance test profile measures the 95th percentile (design.md §12.7).

### 7.8 Observability and audit [PROPOSAL]

- Logging uses `System.Logger` from the JDK.
- Passwords, TOTP secrets, recovery codes, tokens, and receipt bytes are
  never logged. Email addresses are masked in logs.
- Reviews, payments, and ledger entries are immutable and form the financial
  audit trail.

## 8. Future web and mobile evolution (full product, not MVP) [PROPOSAL, ADR-016]

1. The application layer is already transport-agnostic, so the server API
   adapter from ADR-002 becomes the shared backend for the web, Android, and
   iOS clients.
2. The web client is the primary product (FR-012). Android and iOS apps
   consume the same API. Push notifications are added as another
   notification channel adapter beside email.
3. Configurable multi-level review replaces `SingleReviewerPolicy` with
   `MultiLevelPolicy`. The data model already stores reviews by level
   (data-model.md §3.6).
4. NFR-005 acceptance means re-running the AC suite against each client
   (SC-006). The Swing MVP's results do not count as evidence for NFR-005.
5. Technology choices for the web and mobile clients are open (OQ-32).

## 9. Key risks

| Risk | Mitigation |
|---|---|
| The team builds option A (direct DB access from Swing) for speed and treats it as production. | ADR-002 makes the trade-off explicit, the dev composition is labelled, and a review checklist item covers it. |
| Identical-name tie blocks some expenses. | Fail closed with a clear message. OQ-01 is a priority decision. |
| Balance scope ambiguity (per group vs global) changes the overpayment rule. | OQ-04 is a priority decision. The design defaults to per group. |
| Email provider outage. | Outbox retries; in-app notice remains available. |
| Swing EDT blocking violates NFR-003. | SwingWorker policy; presenter tests; the performance profile measures end-to-end time. |
