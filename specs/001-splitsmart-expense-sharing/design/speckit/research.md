# Design Research Notes

This note records factual reference findings used in the proposal. It does not import or review other generated designs. No external provider has been selected. These sources inform recommendations; they do not close SplitSmart product questions listed in [open-questions.md](./open-questions.md).

## 1. TOTP and recovery codes

### Findings

- RFC 6238 defines TOTP using a shared secret and time-step counter; the default time step is 30 seconds. It advises accepting only a limited clock-skew window and rejecting reuse of a successfully validated OTP.
- RFC 6238 requires the verifier to protect the long-lived shared key, recommends secure storage/encryption, and recommends limiting access to processes that require it.
- NIST SP 800-63B-4 treats saved recovery codes as look-up secrets: they must be single-use, securely delivered, and stored in hashed form. Short secrets require a salted password-hashing scheme and rate limiting.
- OWASP recommends a secure MFA reset process and highlights reauthentication and independent notification when factors are changed; the appropriate recovery path depends on application context.

### Design impact

The proposal protects TOTP seeds at rest, never logs submitted codes, rejects OTP replay, and treats recovery codes as one-time secrets whose verifiers are stored rather than plaintext. It leaves algorithm/configuration, delivery, rate-limit, recovery UX, and key custody for security-owner approval. Authenticator-app TOTP is source-required; the sources do not justify substituting a different factor without product approval.

### Primary references

- [RFC 6238 — TOTP: Time-Based One-Time Password Algorithm](https://datatracker.ietf.org/doc/html/rfc6238)
- [NIST SP 800-63B-4 — Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/)
- [NIST SP 800-63B-4 — Saved recovery codes](https://pages.nist.gov/800-63-4/sp800-63b/events/#savedrecovery)
- [OWASP Multifactor Authentication Cheat Sheet — Resetting MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html#resetting-mfa)

## 2. Atomic financial state and delivery

### Findings

- A PostgreSQL transaction groups database operations into an all-or-nothing boundary, with committed changes visible together. Constraints can enforce uniqueness and referential integrity at the database boundary.
- A database transaction does not make an external service operation atomic. AWS describes the dual-write failure case and the transactional-outbox approach: persist the business update and event in one transaction, deliver later, and make consumers idempotent because delivery may be duplicated.
- Idempotency-key behavior and key retention are specific to each external API. Stripe documents its own rules, including parameter matching and key pruning; these details are not universal guarantees.
- There is no general “exactly once” guarantee spanning the application database, network failures, and a third-party provider. The MVP's FR-009 is payment *recording*, not a request to process a money transfer with an external payment processor.

### Design impact

Approval/status, immutable ledger postings, projection update, audit, and outbox intent belong in one database transaction. Payment recording and its counter-posting commit atomically after a serialized debt recheck. External email is at-least-once and idempotent where possible; it cannot reverse an already committed expense/payment. No external payment processor is in scope unless product requirements change.

### Primary references

- [PostgreSQL — Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [AWS Prescriptive Guidance — Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
- [Stripe API — Idempotent requests](https://docs.stripe.com/api/idempotent_requests) (provider-specific example only; not a SplitSmart provider decision)

## 3. Shared relational database options

### Findings

- PostgreSQL is a client/server database with MVCC, transaction isolation, and explicit locking controls intended for concurrent multi-user work.
- SQLite is an embedded database and can be appropriate for local storage or some serialized/low-to-medium-traffic server uses. SQLite allows concurrent readers but serializes writes; a database file can return `SQLITE_BUSY` for conflicting write attempts.
- SQLite's own selection guidance favors a client/server database when application code and database are on separate physical devices or many writers need to write concurrently. The deciding trade-off is deployment and write concurrency, not whether the data are relational.

### Design impact

For a shared service used by separately authenticated group members, PostgreSQL is the proposed system of record. SQLite remains a credible local prototype option if the service topology and writer model are changed. This is a recommendation, not an accepted repository choice; project deployment and concurrency requirements are missing.

### Primary references

- [PostgreSQL — Introduction to MVCC](https://www.postgresql.org/docs/current/mvcc-intro.html)
- [PostgreSQL — Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL — Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [SQLite — Appropriate uses](https://www.sqlite.org/whentouse.html)
- [SQLite — Isolation](https://www.sqlite.org/isolation.html)
- [SQLite — Transactions](https://www.sqlite.org/lang_transaction.html)

## 4. Remaining questions are not research facts

Research does not determine the currency catalog/scale, duplicate-name split tie, invitation identity or expiry, removed-member visibility, receipt format/size/retention, email provider, security algorithm parameters, report balance semantics, performance environment, or deployment owner. These are SplitSmart product/operations decisions and remain listed in [open-questions.md](./open-questions.md). The design labels them rather than silently treating a research result as approval.
