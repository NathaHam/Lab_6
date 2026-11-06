# SplitSmart — Final Architecture

**Status**: Final design package. Human review required (Constitution IX). No code, build or test exists yet.
Requirements: [requirements.md](requirements.md). Decisions: [decisions.md](decisions.md).

## 1. Context

SplitSmart lets people in groups record shared expenses, have them reviewed, track who owes whom, record payments, and view reports. The first deliverable is a **Java Swing desktop MVP** (FR-001 to FR-011). The customer's **web-primary, Android and iOS** product (FR-012, NFR-005) is full-product scope.

Binding constraints (Constitution v1.0.0): Java 21, Maven, Swing presentation only, object-oriented design, business logic outside the GUI, `BigDecimal` for money, JUnit 5, PlantUML, traceability, human review.

Diagrams: [use-case](diagrams/use-case.puml), [component](diagrams/component.puml), [deployment](diagrams/deployment.puml).

## 2. Actors and external systems

| Actor or system | Role | Trust |
|---|---|---|
| Member, Manager, Designated reviewer, Invitee | People using the Swing client | Untrusted input. Identity is proven to the server for each request. |
| Swing client | Presentation only | **Untrusted.** Holds no business authority, database credentials or provider keys. |
| Application server | Use cases, domain rules, authorization, outbox dispatcher | **Trusted boundary** (HD-02) |
| Database (vendor open, OD-23) | Source records, ledger, outbox | Reachable only from the server |
| Receipt store (provider open, OD-17) | Private image objects | Reachable only from the server. No public URLs. |
| Email provider (open, OD-19) | Verification and expense emails | Outbound only, through the outbox |
| Key-management facility (open, OD-18) | Keys for encrypting TOTP secrets | Server only |

## 3. Trust boundaries

1. **Client ↔ server**: an encrypted, server-authenticated channel (transport choice OD-24). Each request carries an opaque session token. The server derives the acting user from the session. User IDs supplied by the client are never trusted as identity.
2. **Server ↔ data stores**: only the server holds credentials. Least-privilege database account.
3. **Server ↔ providers**: provider-neutral ports. Provider responses are untrusted. Payloads are kept minimal and contain no secrets.
4. **Per-resource authorization** inside the server: every use case calls `AccessPolicy` before reading or writing. Receipt reads are authorized the same way.

## 4. Layers and dependency direction

```
swing-client ──uses──▶ contract (DTOs, operation interfaces)
server: api-adapter ──▶ application ──▶ domain
        infrastructure adapters ──implement──▶ application ports
```

| Layer | Responsibilities | Must not |
|---|---|---|
| **Presentation (Swing)** | Views, presenters, input formatting, a `CommandId` per user intent, display of status and errors | Hold financial, authorization or persistence rules. Use `float` or `double` for money. |
| **Application** | Use-case services (design.md §3), `AccessPolicy`, transaction (`UnitOfWork`) boundaries, idempotency, outbox intents, ports | Depend on Swing or on a vendor library |
| **Domain** | Value objects, aggregates, `ShareAllocator`, `ReviewPolicy`, debt rules, ledger semantics | Do I/O, or depend on any other layer |
| **Infrastructure** | Repository adapters, password hasher, TOTP verifier, secret cipher, session store, receipt store, email gateway, outbox dispatcher, clock, ID generator, API adapter | Contain business rules |

Dependencies point inward only. The domain has no dependencies. Proposed Maven modules (OD-28): `contract`, `domain`, `application`, `server` (infrastructure, API adapter, bootstrap), `swing-client` (depends on `contract` only). One deployable server: no microservices (RJ-02).

## 5. Deployment

See [deployment.puml](diagrams/deployment.puml). Swing client on each user's desktop → one application server instance (the MVP needs no horizontal scaling) → database, receipt store, email provider and key management, all behind the server. The outbox dispatcher runs inside the server process, so emails do not depend on a desktop client staying open.

A second server instance would be safe because the outbox uses leases and the ledger uses version checks. It is not required for the MVP.

## 6. Request and response flow

1. The presenter builds a command DTO with a `CommandId` and sends it through `ServerGateway` (a client-side transport adapter).
2. The API adapter checks the session token and builds a `Principal`. Requests without a full (MFA-complete) session are rejected, except for sign-up, verification and sign-in steps.
3. The application service: checks idempotency (`processed_command`) → authorizes with `AccessPolicy` → loads aggregates → applies domain rules → writes in one `UnitOfWork` → records the processed command → commits.
4. The response is a result DTO or a typed error (design.md §12). Money travels as exact decimal strings plus the currency code (no binary floats).
5. Retrying with the same `CommandId` returns the stored result.

## 7. Persistence and transaction boundaries

The logical model is in [data-model.md](data-model.md). Each command below is **one** database transaction. Either everything commits or nothing does.

| Command | Atomic writes | Serialization |
|---|---|---|
| Submit expense | expense, shares, notifications, email outbox rows, processed command, audit | Group version read (membership) |
| Designate reviewer | reviewer assignment, audit | Expense version |
| Approve | review record, status, ledger entries (non-self, nonzero), ledger head bump, projection if enabled, processed command, audit | Expense version + `LedgerHead(group)` |
| Reject | review record, status, processed command, audit (no ledger) | Expense version |
| Record payment | payment, one counter-posting, ledger head bump, projection if enabled, processed command, audit | `LedgerHead(group)`, with the debt re-checked after acquiring it |
| Invite, accept, decline, revoke, remove | invitation and membership, audit | Group version |
| Outbox claim / result | outbox row status and lease | Compare-and-set on the lease |

External calls (email, receipt storage) are **never** inside a database transaction. Receipts are uploaded first and referenced in the submit transaction. Emails are sent after commit by the dispatcher.

## 8. External ports

| Port | Contract summary |
|---|---|
| `ReceiptStore` | `put(bytes, mediaType) → ReceiptKey`, `get(key) → bytes or Unavailable`. Private. No authorization inside the adapter: the application authorizes first. |
| `EmailGateway` | `send(messageId, recipient, templateKey, params) → Accepted / Transient / Permanent`. `messageId` is the provider idempotency key where the provider supports one. |
| `SecretCipher` | Encrypts and decrypts TOTP secrets under a key ID from key management |
| `PasswordHasher` | `hash(password)`, `verify(password, hash)`, `needsRehash(hash)`. The algorithm is configured (OD-18). |
| `Clock`, `IdGenerator` | Deterministic in tests |
| `SupportedCurrencies` | Approved catalogue and minor-unit digits (OD-03) |
| Repositories, `UnitOfWork` | Transactional persistence. The vendor is open (OD-23). |

## 9. Failure handling

- **Validation or authorization failure**: typed error, no writes.
- **Version conflict or serialization failure**: the transaction rolls back. A review gets `StaleState` and the user re-reads. A payment is retried by the server a bounded number of times while it re-checks the debt, and then returns `Conflict`.
- **Crash after commit, before the response**: the client retries with the same `CommandId` and gets the stored result.
- **Email failure**: the business state is already committed. The outbox retries with backoff (schedule OD-19). After the limit the row becomes `FAILED` and is visible to operators. The in-app notice remains available.
- **Receipt store unavailable at upload**: the submission is refused before any expense write. At read time: `ReceiptUnavailable`, and the expense still displays.
- **Orphaned receipt object** (upload succeeded, submit failed): flagged for cleanup (OD-17).

## 10. Security summary

Details are in design.md §10.
- Verified email, password and authenticator-app TOTP on every sign-in, plus one-use recovery codes.
- Salted adaptive password hashing, a TOTP replay check, encrypted TOTP secrets with a key ID, hashed recovery codes, hashed session tokens.
- Server-side sessions with idle and absolute expiry and revocation.
- Rate limiting on sign-in, second factor, verification and recovery.
- Central `AccessPolicy` for every operation and receipt read.
- Audit records for security and financial events. Logs never contain passwords, secrets, codes, tokens or receipt bytes.
- All parameters need security approval (OD-18). No certification is claimed.

## 11. Evolution: MVP to full product

- **The shared server is the seam**: future web, Android and iOS clients would call the same application operations and `AccessPolicy`. That still requires its own client design, a public API contract (OD-24, OD-25), push notifications if wanted, and parity tests (AC-007).
- **Multi-level review**: the `ReviewPolicy` interface has the MVP implementation `SingleDesignatedReviewerPolicy`. The `level` column in `review_record` is reserved. The semantics are open (OD-11).
- Nothing in the MVP claims FR-012 or NFR-005 (HD-12).

## 12. Key trade-offs

| Choice | Benefit | Cost |
|---|---|---|
| Shared server instead of a direct-database client | Central authorization, protected secrets, durable outbox | A server must be run, and a transport is needed |
| Ledger-derived balances, no projection at first | One source of truth, nothing to reconcile | Query cost. Mitigated by indexes and measured under OD-22. |
| Per-group `LedgerHead` serialization | Simple, no deadlocks, correct overpayment checks | Financial writes in one group run one at a time (fine at 50 members) |
| Fail closed on identical names | No invented policy | Some valid expenses are refused until OD-01 |
| Provider-neutral ports | Provider choice deferred | Adapter and contract tests needed for each provider |
