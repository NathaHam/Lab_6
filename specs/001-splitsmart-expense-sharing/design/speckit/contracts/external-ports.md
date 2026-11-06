# Proposed External Port Contracts

Provider-neutral design contracts only. Providers and wire protocols are not selected.

## Receipt storage

### Store

- Input: authenticated upload context, authorized expense/group scope, byte stream, and minimal content metadata.
- Result: opaque receipt identifier and stored/unavailable result.
- Required behavior: private storage, no reliance on a filename or object key for authorization, explicit upload failure, cleanup/compensation for an orphaned object, and content validation once approved policy exists.
- Open policy: number of images, formats, maximum size/dimensions, scanning, retention, deletion, and provider.

### Retrieve

- Input: authenticated actor and receipt identifier.
- Required behavior: application checks active permission for the associated group on every retrieval before the adapter returns bytes; missing content is an explicit unavailable result. A direct object URL must not bypass authorization.

## Email delivery

### Enqueue

- Write a durable message intent within the transaction that creates the account verification, invitation (if email is approved), or expense notice.
- Expense notice recipients are other group members who were signed out at submission time, according to the final session-state definition.
- Payload must be minimal and must not contain receipt bytes, password, TOTP secret/code, recovery code, or unnecessary expense details.

### Deliver

- Input: stable outbox event/recipient/channel key and approved message template data.
- Result: accepted/delivered, transient failure, or permanent failure with a nonsecret diagnostic category.
- Required behavior: retry transient failures, avoid duplicate in-app/outbox records, preserve final failure visibility, and never roll back an already committed expense/payment.
- Provider idempotency and delivery semantics are provider-specific; no exactly-once external delivery guarantee is claimed.

## Credential/key protection

- Password storage adapter accepts a password only for hashing/verification; it never exposes a plaintext password to persistence or logging.
- TOTP secret protection adapter encrypts/decrypts only for enrollment/verification and obtains keys from an approved key-management facility.
- Recovery-code adapter stores a verifier, supports atomic one-time consumption, and never returns plaintext after initial code presentation.
- Exact algorithms, parameters, key custody, rotation, and failure handling require security approval before implementation.

## Persistence transaction boundary

The application requests one transaction-scoped unit of work for:

1. Expense approval decision + unique obligation postings + projection update (if enabled) + audit + outbox intent.
2. Expense rejection decision + audit + outcome notice intent without balance postings.
3. Payment debt recheck/lock + payment insert + counter-posting + projection update (if enabled) + audit.

The persistence implementation guarantees all-or-nothing commit for these database records, enforces foreign keys and uniqueness, and surfaces transaction conflicts to the application. External email/object storage is not part of the relational transaction; those interactions use explicit outbox/compensation handling.
