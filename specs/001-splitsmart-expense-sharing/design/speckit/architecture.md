# SplitSmart Architecture Proposal

**Status:** Independent design proposal; human review required  
**Scope:** Java Swing desktop MVP architecture, with a non-delivered evolution path to the full product  
**Source of truth:** `UserRequirement.md` for customer outcomes, `spec.md` for testable requirements, and `.specify/memory/constitution.md` for binding implementation constraints

## 1. Executive summary

SplitSmart needs shared, authorized group data across separately signed-in people, email delivery, and persistent account recovery. A desktop-only database would not support those outcomes for multiple users. The proposed MVP therefore uses a Java Swing desktop client connected to a Java 21 application service over an authenticated, encrypted network boundary. A relational database is the proposed system of record. Receipt bytes and outbound email are behind provider-neutral ports; their providers are not selected here.

The desktop client is only a presentation adapter. Use cases and domain rules execute in the service and remain independently testable. The relational transaction that approves an expense both changes its lifecycle and posts its balance entries; a similar atomic transaction validates and records a payment. Persistent notification and email work is dispatched after the business transaction through an outbox.

This is a proposal, not evidence that the workspace already contains this architecture. The inspected workspace has no Maven project, Java source, tests, persistence configuration, deployment configuration, or existing diagrams. The central-service topology and database choice require human approval before implementation.

## 1.1 Technical context and constitution gate

| Planning field | Current evidence / proposal |
|---|---|
| Language/version | Java 21 is binding in the constitution; no Maven source project is present to verify its configuration |
| Build/dependencies | Maven is binding; no `pom.xml` or wrapper exists. No third-party dependency is selected by this design |
| Presentation | Java Swing for the desktop MVP only |
| Storage | No database is established by the repository. Relational storage is proposed; PostgreSQL is a proposed shared-service candidate |
| Verification | JUnit 5 is binding; no tests or Maven test configuration exist |
| Target | Swing desktop client plus a proposed shared service for multi-user MVP behavior; web/Android/iOS remain full-product scope |
| Performance | NFR-003: at least 95% of ordinary group/balance/report views under 2 seconds at 50 members and 10,000 recorded expenses |
| Key constraints | Business rules outside Swing; exact `BigDecimal` money; currency scale/rounding and deterministic remainder allocation explicit; no FX/offline sync; PlantUML; human review |
| Project layout | Unknown because no Java source tree exists. Layered package/module placement must be based on the actual Maven project when supplied |

**Initial and post-design constitution gate:** Pass as a design proposal. Java 21, Maven, Swing presentation-only, object-oriented separation, exact money arithmetic, JUnit 5, PlantUML, traceability, and human review are explicitly preserved. No additional framework is required. PostgreSQL, server topology, security algorithms, receipt policy, and delivery providers remain proposed or undecided rather than being represented as constitution-approved facts. No source-level build or test gate can be evaluated until the project exists.

## 2. Scope and evidence labels

- **Source fact** means explicitly required or clarified by the source files.
- **Recommendation** means a design proposal, not a source requirement.
- **Human decision** means a material point not established by the sources and not silently resolved here.

### Source facts

- The constitution binds the project to Java 21, Maven, Java Swing for the desktop MVP, JUnit 5, exact `BigDecimal` money arithmetic, PlantUML, separation of GUI and business rules, requirement traceability, and human review.
- The spec requires verified-email/password/authenticator-app authentication with recovery codes; manager-controlled invitations; approved-expense-only balance changes; partial payments capped at debt; in-app notices and email to members signed out at submission; filtered reports; and a 95th-percentile-under-two-seconds target for ordinary views at the stated volume.
- FR-012 and NFR-005 remain web, Android, and iOS full-product commitments. A Swing client does not meet them.
- Each group has one currency. Foreign-exchange conversion and offline synchronization are out of scope.

### Recommendations

- Treat the Swing app as an untrusted client and enforce authentication, authorization, validation, and all financial rules in the application service.
- Use a layered design: presentation, application, domain, and infrastructure. Dependencies point inward.
- Use a relational system of record and explicit database transactions for financial state changes. PostgreSQL is the proposed shared-service database; it is not established by the repository.
- Keep financial postings append-only and derive pairwise net balances from postings, with an optional transactionally maintained read projection for performance.
- Use a transactional outbox for notifications and email; isolate storage and delivery providers behind ports.

## 3. System boundary, actors, and trust boundaries

### Actors

| Actor | Capabilities in scope |
|---|---|
| Account holder | Register, verify email, authenticate with password and authenticator code, use recovery codes, view authorized group activity, submit expenses, record permitted payments, and view reports |
| Group manager | Create/manage a group, invite or remove members, and designate the one MVP reviewer for an expense |
| Invitee | Accept an invitation before gaining access to group data |
| Expense submitter | Submit expense details, participants, split, and optional receipt; cannot review their own expense |
| Designated reviewer | Approve or reject an assigned pending expense |
| Group member | Receive and view group activity notices and authorized group information |
| Human product/security reviewer | Resolve the questions in [open-questions.md](./open-questions.md) and approve this AI-generated design before acceptance |

### External systems

- An email-delivery system sends verification messages, invitation messages if that channel is selected, and expense notices to members signed out at submission time. No provider is selected.
- A receipt-object store holds optional image bytes. No provider, format allowlist, maximum size, or malware-scanning policy is selected.
- A secret/key-management facility protects service secrets and encryption keys. Its operator and implementation are not established.
- A relational database stores accounts, group state, financial records, audit records, outbox records, and receipt metadata. PostgreSQL is proposed, not accepted by source.

### Trust boundaries

1. **Desktop device boundary:** Swing controls and client-side checks are not trusted for authorization or financial correctness. Credentials are sent only to the authenticated service boundary; sensitive values must not be written to client logs.
2. **Network boundary:** The proposed client-to-service connection is encrypted and authenticated. Session establishment, expiry, revocation, and transport details require implementation decisions; the service rechecks permissions on every protected use case.
3. **Service boundary:** Application/domain code is trusted to apply use-case authorization and invariants. Infrastructure adapters are treated as fallible and potentially duplicating delivery.
4. **Database boundary:** The service account has least privilege. Database access is not exposed to the desktop client. Transactions protect state transitions and balance postings.
5. **Receipt boundary:** Receipt bytes are private group data. A caller must be authorized at retrieval time; possession of an opaque object key alone is not authorization.
6. **Email boundary:** Email is an external disclosure channel. Notices contain only the minimum information required to identify the group and expense; full financial/receipt details are fetched after sign-in.

## 4. Major runtime components

| Component | Responsibility | Not responsible for |
|---|---|---|
| Swing desktop client | Login and recovery screens, group/expense/payment/report presentation, input collection, status and review outcome display | Split allocation, authorization decisions, balance calculation, persistence, or final validation |
| Application service | Authenticated use cases; authorization; coordinating domain operations, repositories, transaction boundaries, and delivery intents | Swing widgets or provider-specific transport/storage logic |
| Domain model | Account/group membership rules, invitation and expense state, split allocation, review decisions, payment limits, balance postings | GUI, SQL, network protocols, or external provider APIs |
| Persistence adapter | Map domain records to the proposed relational store; enforce unique keys/constraints; execute transaction-scoped writes and reads | Independent business-rule decisions |
| Receipt adapter | Store and retrieve image bytes through an opaque receipt reference | Deciding undocumented accepted formats or maximum sizes |
| Notification/outbox dispatcher | Persist in-app notices, send signed-out-member email, retry transient delivery failures, and suppress duplicate work | Changing expense approval or payment outcomes when a delivery fails |
| Audit adapter | Append actor, action, target, time, and outcome metadata for security-sensitive and financial transitions | Storing passwords, TOTP secrets, recovery codes, or receipt content in audit text |

The proposed application service may be a single Java 21 service deployment for the MVP. Splitting it into microservices is not justified by the known scale and is not proposed.

## 5. Layering and dependency direction

```text
Swing presentation ──> application use-case interfaces ──> domain
                                  ▲                          ▲
                                  │                          │
                     infrastructure adapters ───────────────┘
                     (SQL, receipt, email, clock, secrets)
```

- **Presentation:** Swing views and event handlers collect input, invoke an application boundary, and render returned state/errors. No view or listener computes money, decides approval authority, or mutates a balance.
- **Application:** Coordinates authentication, invitations, expense submission/review, payment, notification, and report queries. It performs actor/resource authorization at the use-case boundary and opens transactions through an infrastructure-neutral unit-of-work/repository boundary.
- **Domain:** Owns invariants and deterministic money/split operations. It depends only on Java/domain types and an injected clock or identifiers where needed; it is testable without Swing, a database, or network.
- **Infrastructure:** Implements repositories, transaction management, password/TOTP secret handling, receipt storage, email, outbox dispatch, and audit persistence. It depends on application/domain contracts, not the reverse.

## 6. Runtime workflows at a glance

1. **Account:** Register with an email and password; verify the email; enroll an authenticator app; issue recovery codes once. Sign-in requires verified email, password, and authenticator code (or a one-use recovery code for recovery as approved by product policy). The service authorizes every later use case.
2. **Invitation:** A manager creates an invitation; the invitee accepts; only acceptance creates active membership and group access. Delivery channel, expiration, and matching rules remain open.
3. **Expense:** A member submits a validated, immutable pending expense and optional receipt. The manager designates exactly one different group-member reviewer. The submitter sees pending status; notices are persisted for group members and email intents are created only for recipients recorded as signed out at submission.
4. **Review:** Only the designated reviewer may approve/reject. Rejection records the outcome and creates no balance postings. Approval atomically changes state and posts the expense's non-self obligations exactly once.
5. **Balance/payment:** Pairwise net positions are derived from approved expense postings and recorded payments. A payment is accepted only if it does not exceed the current positive obligation from payer to recipient; payment history and the debit to that obligation commit atomically.
6. **Reports:** A read use case applies inclusive start/end dates and requested group/member/activity filters, and returns authorized summaries. Whether balances are current or as-of-range remains a human decision.

Detailed behavior is in [design.md](./design.md), entity fields and invariants in [data-model.md](./data-model.md), and contracts in [contracts/](./contracts/).

## 7. Persistence, consistency, and performance

### Proposed persistence

The workspace does not establish a database. [ADR-002](./decisions.md#adr-002-relational-system-of-record) compares PostgreSQL for a shared multi-user service with SQLite for an embedded/single-host prototype. PostgreSQL is the recommendation, pending human approval.

### Transaction boundaries

- **Approve expense:** In one database transaction, lock/check the pending expense, verify the recorded reviewer and authorization, persist the review decision, transition to approved, create unique balance ledger postings, update any balance read projection, append audit data, and enqueue notification work. A uniqueness constraint on the posting's source expense prevents duplicate posting. Any failure rolls the entire transaction back.
- **Reject expense:** In one transaction, verify reviewer and pending status, record rejection and audit, and enqueue the outcome notice. No balance posting is written.
- **Record payment:** In one transaction, read/lock the pairwise net position, validate the current outstanding debt and amount, insert a unique payment, create its counter-posting, update the projection, and append audit. A concurrent payment must re-evaluate the debt after obtaining the lock; a rejected overpayment leaves all financial records unchanged.
- **Submit expense:** Persist pending expense, computed immutable shares, reviewer assignment, receipt reference, in-app notifications, email outbox intents, and audit metadata consistently. Receipt upload orchestration must not leave a publicly accessible orphan; exact storage cleanup/compensation is an adapter concern.

Delivery is at-least-once across the database/outbox/external provider boundary. Each delivery uses a stable idempotency key and receiver-side/provider deduplication where available; retries do not repeat financial transitions. Email delivery failure is surfaced operationally and retried without reverting an accepted expense.

### NFR-003 approach

- Index activity by group and event date; index membership and expense status for authorization and pending-review lists.
- Query report data by bounded group/date and requested filters; select only needed columns and paginate activity lists.
- Keep approval/payment writes narrow and indexed. Use a balance read projection only if measurement shows aggregate queries cannot meet the target; update it in the same financial transaction and periodically reconcile it to ledger postings.
- Validate the acceptance target using 100 ordinary group, balance, and report view measurements at 50 members and 10,000 recorded expenses. The target is at least 95 views under 2 seconds under a documented normal operating profile. The workspace supplies no hardware, dataset distribution, network profile, or hosting profile; these are required test inputs, not assumed.

## 8. Security, privacy, and audit

- The service verifies email ownership before enabling account use. Passwords are stored only as salted adaptive hashes; TOTP secrets are protected at rest; recovery codes are shown once, stored as non-reversible verifiers, individually one-use, and invalidated on use/regeneration. Exact algorithms, parameters, key custody, and recovery UX require approval (see [ADR-007](./decisions.md#adr-007-credential-and-recovery-protection)).
- Authenticate each use case and authorize group access from active membership and required role. UI hiding is not authorization. A removed/non-member account must not fetch private expenses, reports, notifications, or receipt bytes.
- Do not log passwords, authenticator codes/secrets, recovery codes, session credentials, or receipt contents. Restrict audit fields to actor, target, action, outcome, and timestamps.
- Audit registration/verification, recovery-code use/regeneration, invitation acceptance/revocation, membership removal, reviewer assignment, expense submission/review/posting, payment, and receipt access where policy approves. Do not make an audit event a substitute for source financial records.
- Store only necessary personal information. Encryption at rest, key rotation, retention, deletion, and backup requirements are open decisions.

## 9. Receipt, notification, and report boundaries

- Store receipt metadata in the relational record and image bytes in the selected private object store. Use an opaque identifier, validate actual content rather than trusting a filename, and authorize reads against the associated group on each request. Accepted formats, byte limits, scanning, retention, and deletion are deliberately unspecified.
- Write an in-app notification for each group member in the submission recipient snapshot. For members signed out at submission time, enqueue an email notice. Do not send receipts or sensitive financial detail through email by default. Deduplication and exact email-content policy require review.
- Reports expose only authorized activity. Date comparisons are inclusive per spec. The timestamp/date interpretation, time zone, and whether a balance report is current or historical are open decisions; see [open-questions.md](./open-questions.md).

## 10. Evolution toward web and mobile

The recommended application boundary is independent of Swing so a future web client and Android/iOS clients can call the same authorized use cases. Domain and application rules remain server-side and shared; new presentation adapters do not fork split, balance, or payment logic. FR-012 and NFR-005 are full-product commitments and are explicitly outside this Swing MVP. This proposal does not claim that a Swing client satisfies browser or mobile availability, nor does it design unrequested offline synchronization or report export.

## 11. Architecture artifacts

- [Detailed design](./design.md)
- [Data model](./data-model.md)
- [Decisions / ADRs](./decisions.md)
- [Requirement traceability](./traceability.md)
- [Open questions](./open-questions.md)
- [Review checklist](./design-review-checklist.md)
- [PlantUML diagrams](./diagrams/)
- [Conceptual contracts](./contracts/)
- [Validation guide](./quickstart.md)
