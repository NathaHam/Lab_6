# SplitSmart — Architecture Decision Records (Claude independent proposal)

**Status values**:

| Status | Meaning |
|---|---|
| **Proposed** | Recommended by this AI-generated design. Awaits human approval. |
| **Decision needed** | A human must choose. No recommendation is binding. |
| **Accepted (source)** | Fixed by the constitution or the spec. Recorded here for completeness. |

No ADR in this file has been accepted by a human reviewer yet (Constitution IX).

---

## ADR-000 Technology baseline

- **Status:** Accepted (source: Constitution I–VII).
- **Context:** The constitution fixes Java 21, Maven, Swing for the desktop
  GUI, BigDecimal for money, JUnit 5, and PlantUML.
- **Options:** None. These are binding.
- **Consequences:**
  - The POM sets `maven.compiler.release=21`. The developer machine
    currently has JDK 25, which can compile for release 21.
  - These are *implementation* decisions. They do not satisfy FR-012 (web,
    Android, iOS).

## ADR-001 Layered ports-and-adapters with Maven modules and JPMS

- **Status:** Proposed.
- **Context:** Constitution III and IV require domain rules outside Swing,
  testable without a GUI, and no unnecessary frameworks. Future web and
  mobile clients must reuse the same rules.
- **Options:**
  1. **Single Maven module with package conventions.** Simplest, but
     nothing enforces dependency direction.
  2. **Single module plus an architecture-test library.** Enforces
     direction, but adds a dependency.
  3. **Multi-module build (domain, application, infrastructure, swing) plus
     JPMS `module-info` exports.** The compiler enforces direction, with no
     extra library.
- **Decision (proposed):** Option 3.
- **Consequences:**
  - (+) Swing cannot import infrastructure or domain internals.
  - (+) The server and web adapters slot in later.
  - (−) More POM boilerplate.
  - (−) JPMS requires care with test classpaths. Surefire handles this with
    module patching, so tests can live in the same module.

## ADR-002 Deployment topology for the multi-user Swing MVP

- **Status:** Decision needed (recommendation: B).
- **Context:**
  - The MVP is multi-user: groups, invitations, reviewers, and email to
    members who are signed out.
  - NFR-001 requires that users cannot view or change others' data.
  - Email retries must continue after the submitter closes the app.
  - FR-012 will later need web and mobile clients.
- **Options:**
  - **A. Fat client.** Each Swing app runs application, domain, and
    infrastructure in-process against a shared database.
    - (+) Least code.
    - (−) Every client holds DB credentials (breaks TB-1 and TB-2, so
      NFR-001 cannot be enforced).
    - (−) No process to retry email.
    - (−) "Signed out" detection becomes unreliable.
    - (−) Rework needed for the full product.
  - **B. Thin Swing client plus a SplitSmart application server.**
    - (+) Single trust boundary.
    - (+) Outbox dispatcher runs continuously.
    - (+) The same API later serves web and mobile.
    - (−) Requires a remote protocol and a server process. The protocol and
      library are OQ-28. JDK-only options exist, such as
      `com.sun.net.httpserver` with `java.net.http`, but need security
      review.
  - **C. Single-machine local app** (one shared desktop, local store).
    - (−) Does not support members on different devices or real email
      timing. Suitable only for demos.
- **Recommendation:** B for any deployment with real users. A or C only as
  the clearly labelled development and test composition.
- **Consequences:**
  - The application `api` must be serialisable as plain DTO records.
  - Authorization runs only on the server.
  - Swing tests use in-process composition.

## ADR-003 Money value object at the currency's minor-unit scale

- **Status:** Proposed.
- **Context:** Constitution V and NFR-002 require explicit and consistent
  scale. There is one currency per group. The supported currency list is
  unknown.
- **Options:**
  1. **`BigDecimal` with an implicit scale.** Risks `2.5` ≠ `2.50` equality
     bugs.
  2. **`Money(BigDecimal, CurrencyUnit)`.** The scale always equals the
     minor digits, and excess input precision is rejected.
  3. **`long` minor units everywhere.** Exact, but the constitution
     explicitly asks for `BigDecimal`.
- **Decision (proposed):** Option 2. `BigInteger` minor units are used only
  *inside* the allocator (ADR-004) and converted back to `BigDecimal`
  immediately.
- **Consequences:**
  - (+) Deterministic equality.
  - (+) No silent rounding.
  - (−) Users must enter amounts within the currency's precision.
  - The currency list stays configurable (OQ-03).

## ADR-004 Integer largest-remainder allocation; alphabetical tie; fail closed on identical names

- **Status:**
  - Proposed (algorithm and alphabetical ordering are Accepted (source):
    FR-004).
  - The identical-name handling is a **Decision needed** (OQ-01).
- **Context:**
  - FR-004 requires shares that reconcile exactly, using the
    largest-remainder method with ties by participant name.
  - Identical names are explicitly unresolved in the spec.
- **Options for remainder computation:**
  1. `BigDecimal.divide` with a `MathContext`. Remainders become inexact
     for the equal split (1/3).
  2. **An integer numerator/denominator formulation** (design.md §3.2).
     Exact for both methods.
- **Options for identical names:**
  1. Invent a rule (user ID, join order). **Rejected here**, because the
     task forbids inventing one.
  2. **Fail closed** with `AmbiguousAllocationException` only when the
     ambiguity changes the outcome, behind a `TieBreakPolicy` seam.
  3. Require unique display names per group. That is a product decision
     that belongs to the humans.
- **Decision (proposed):** Formulation 2, and option 2 as an interim
  safeguard.
- **Consequences:**
  - (+) Exact, deterministic, and testable.
  - (−) Rare submissions are blocked until OQ-01 is decided.
  - The collation rule (case and accents) is OQ-02.

## ADR-005 Shares are computed and stored at submission

- **Status:** Proposed.
- **Context:** Names drive tie order, and names can change. Reviewers must
  see the exact shares they approve.
- **Options:**
  1. Recompute the shares at approval or display time.
  2. **Persist the shares plus a name snapshot at submission.**
- **Decision (proposed):** Option 2.
- **Consequences:**
  - (+) The reviewer approves exactly what is displayed.
  - (+) The audit trail is stable.
  - (−) A participant renamed during review keeps the old snapshot. This is
    acceptable and is shown in the expense detail.

## ADR-006 Append-only ledger plus per-group pair-balance projection

- **Status:**
  - Proposed.
  - The per-group balance scope is a **Decision needed** (OQ-04).
- **Context:**
  - FR-008 requires pairwise nets from approved expenses and payments only.
  - NFR-003 requires fast views at 10,000 expenses.
  - FR-009 needs an exact overpayment check.
- **Options:**
  1. Compute every time from expenses and payments. Simple, but slower,
     and the overpayment check would have to scan the full history.
  2. **Ledger entries plus a materialised `pair_balance` updated in the
     same transaction.**
  3. Store mutable balances only. Fast, but it loses its explanation and
     audit trail.
- **Decision (proposed):** Option 2. The ledger is the source of truth, and
  the projection is rebuildable.
- **Consequences:**
  - (+) O(1) overpayment check under a lock.
  - (+) The audit trail can be reconstructed.
  - (−) Two representations must agree. A reconciliation test and an admin
    check cover this.

## ADR-007 Payments as reverse obligations; strict cap at the outstanding debt

- **Status:** Proposed.
- **Context:** FR-009 allows partial payments, rejects overpayment, and
  requires history to be kept.
- **Options:**
  1. A separate payment table subtracted in queries.
  2. **A payment is posted as a ledger entry in the reverse direction.**
- **Decision (proposed):** Option 2, together with an immutable `payment`
  record.
- **Consequences:**
  - (+) One summation rule for all entries.
  - (+) The overpayment check is `amount ≤ max(0, net(payer→recipient))`.
  - (−) Paying when no debt exists (a prepayment) is impossible by design.
    This follows the sources.

## ADR-008 Concurrency control and idempotency

- **Status:** Proposed.
- **Context:**
  - Concurrent approvals and payments can cause duplicate posting or
    overpayment.
  - Network retries in topology B can repeat a command.
- **Options:**
  1. A global lock. Simple, but it serialises everything.
  2. **Optimistic versions on aggregates plus pessimistic (or
     compare-and-set) locking on `pair_balance` rows in canonical order,
     plus unique ledger constraints, plus client `CommandId`s.**
  3. Serializable isolation everywhere. Correct, but depends on the store
     and risks retry storms.
- **Decision (proposed):** Option 2.
- **Consequences:**
  - (+) Correct under contention, with no deadlocks thanks to the lock
    order.
  - (−) The client must keep its `CommandId` for each intent.
  - (−) A `processed_command` retention policy is needed (OQ-09).

## ADR-009 Approval policy abstraction; MVP single designated reviewer

- **Status:**
  - Proposed.
  - MVP behaviour is Accepted (source): FR-006.
- **Context:**
  - In the MVP the manager designates exactly one reviewer, who is never
    the submitter.
  - The full product needs configurable levels.
- **Options:**
  1. Hard-code single-reviewer logic.
  2. **`ApprovalPolicy` interface with `SingleReviewerPolicy` now and
     `MultiLevelPolicy` later.**
- **Decision (proposed):** Option 2. A per-group standing reviewer is
  offered as a convenience, pending OQ-12.
- **Consequences:**
  - (+) Adding the full-product feature does not touch Expense invariants.
  - (−) A small abstraction cost now, justified by an identified
    requirement (Constitution III).

## ADR-010 Transactional outbox for email; persistent in-app notices

- **Status:** Proposed.
- **Context:**
  - FR-007 requires in-app notices for all recipients and email to those
    signed out at submission.
  - The email provider is undecided.
  - Email delivery must not break submission.
- **Options:**
  1. Send email synchronously inside submit. A provider outage then fails
     the submission, or the email is lost.
  2. **An outbox row in the submit transaction, with an asynchronous
     dispatcher that retries with backoff.**
  3. A message broker. This is an unnecessary framework for the MVP.
- **Decision (proposed):** Option 2.
- **Consequences:**
  - (+) At-least-once delivery.
  - (+) Submission is independent of the provider.
  - (−) The dispatcher needs a continuously running process, which is one
    reason for ADR-002 option B.
  - Retry parameters are OQ-27.

## ADR-011 Authentication with JDK cryptography

- **Status:**
  - Proposed. Requires sign-off from a security reviewer.
  - Factors are Accepted (source): FR-001.
- **Context:** FR-001 and NFR-001 require a verified email, a password, an
  authenticator-app TOTP, and recovery codes, with no unnecessary
  frameworks.
- **Options:**
  1. **JDK only: PBKDF2-HMAC-SHA256, RFC 6238 TOTP with HMAC-SHA1, AES-GCM
     secret encryption, SecureRandom.**
  2. An Argon2 or bcrypt library. Stronger memory-hardness, but adds a
     dependency.
  3. An external identity provider. Not in the sources, and it would add
     an undecided provider.
- **Decision (proposed):** Option 1, with self-describing hash strings so
  the algorithm can migrate to option 2 later.
- **Consequences:**
  - (+) No dependency.
  - (+) RFC test vectors are available.
  - (−) PBKDF2 is weaker than Argon2id against GPU attacks.
  - Key management (OQ-30) and lockout thresholds (OQ-29) need human
    decisions.

## ADR-012 Receipt storage behind a port, with mediated access

- **Status:**
  - Proposed.
  - The provider, formats, and size are a **Decision needed** (OQ-08).
- **Context:**
  - FR-005 makes the receipt image optional and requires it to be shown.
  - NFR-001 requires privacy.
  - The provider is not chosen.
- **Options:**
  1. Image bytes in the main data store.
  2. **A content-addressed `ReceiptStore` port, with metadata in the data
     store.**
  3. Public object URLs. Rejected for privacy.
- **Decision (proposed):** Option 2. Validation uses magic bytes plus a JDK
  `ImageIO` decode, and the image is re-encoded to strip metadata.
- **Consequences:**
  - (+) Swappable provider.
  - (+) Deduplication.
  - (−) The store is not transactional with the DB, so an orphan sweep is
    needed (retention is OQ-09).

## ADR-013 Persistence technology deferred

- **Status:** Decision needed.
- **Context:** The task forbids inventing a database. The design needs ACID
  transactions, unique constraints, locks or versions, and exact decimals
  (data-model.md §6).
- **Options:** Any store meeting data-model.md §6. Candidates are for the
  humans to name.
- **Decision (proposed):**
  - Repository ports with in-memory adapters for all tests now.
  - A real adapter once OQ-06 is decided, verified by the adapter contract
    test suite.
- **Consequences:**
  - (+) Domain and application work can start now.
  - (−) Isolation-level details (data-model.md §4) cannot be confirmed
    until the store is chosen.

## ADR-014 Reporting from operational tables via aggregate queries; no export

- **Status:** Proposed.
- **Context:**
  - FR-010 and FR-011 require summaries and filtered reports with an
    inclusive date range.
  - NFR-003 sets performance targets.
  - Export is not required.
- **Options:**
  1. **Query the operational tables using indexes.**
  2. A separate reporting store. Unnecessary at 10,000 expenses.
- **Decision (proposed):** Option 1.
- **Consequences:**
  - (+) Simple.
  - (+) Data is consistent with the balances.
  - (−) If the full product grows far beyond the NFR-003 volume, this may
    need to be revisited.

## ADR-015 Swing passive view plus presenter, with SwingWorker

- **Status:** Proposed.
- **Context:** Constitution IV requires business rules to stay out of
  handlers and be testable without the GUI. NFR-003 requires a responsive
  UI.
- **Options:**
  1. Logic in `ActionListener`s. Forbidden by the constitution.
  2. **Passive view plus presenter, with presenters calling the
     application facades.**
  3. A Swing application framework. An unnecessary framework.
- **Decision (proposed):** Option 2, with a `UiExecutor` abstraction so
  presenter tests can run synchronously.
- **Consequences:**
  - (+) Presenters are unit-testable.
  - (+) The EDT is never blocked.
  - (−) Some boilerplate per screen.

## ADR-016 Full-product evolution path (FR-012, NFR-005)

- **Status:**
  - Proposed.
  - Client technologies are a **Decision needed** (OQ-32).
- **Context:** The customer requires a web-primary product plus Android and
  iOS apps. The Swing MVP does not satisfy this requirement.
- **Options:**
  1. **Reuse the application server API (ADR-002 option B) for all
     clients.**
  2. A separate backend per platform. This duplicates the rules.
- **Decision (proposed):** Option 1, adding a push-notification channel
  adapter and `MultiLevelPolicy`.
- **Consequences:**
  - (+) One source of financial truth.
  - The AC suite must be re-run on each client for SC-006 and NFR-005.

## ADR-017 No DI, ORM, mocking, or property-testing frameworks in the MVP

- **Status:** Proposed.
- **Context:** Constitution III forbids unnecessary frameworks.
- **Options:**
  1. Adopt common frameworks.
  2. **Manual composition roots, hand-written fakes, and seeded
     parameterised tests.**
- **Decision (proposed):** Option 2. Revisit if a concrete need appears.
- **Consequences:**
  - (+) Small dependency surface.
  - (−) More hand-written fakes and repository mapping code.
