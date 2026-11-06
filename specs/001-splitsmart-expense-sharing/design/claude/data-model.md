# SplitSmart — Data Model (Claude independent proposal)

**Status**: Draft proposal, AI-generated. Requires human review.

**Database technology is deliberately not chosen** (ADR-013, OQ-06). The
tables below are a **logical**, technology-neutral schema. Types are logical
types:

| Logical type | Meaning |
|---|---|
| `uuid` | Identifier |
| `text(n)` | String of at most n characters |
| `decimal(p,s)` | Exact decimal, mapped to `BigDecimal` |
| `date` | Calendar date with no time zone |
| `instant` | UTC timestamp |
| `int`, `bool`, `bytes` | Integer, boolean, raw bytes |

Any chosen store must support the constraints listed here (§6).

## 1. Money storage convention [PROPOSAL, ADR-003]

- Amounts are stored as `amount decimal(18, 4)` with `currency_code text(3)`.
  The value always has exactly the currency's minor-unit scale; the column
  is wide enough for currencies with up to 4 minor digits.
- A domain rule `amount.scale() == minorUnitDigits(currency)` is enforced in
  `Money`. The adapter normalises scale on read with `setScale(digits)`, and
  this throws if precision would be lost.
- **Alternative under review:** store `amount_minor bigint` (integer minor
  units) together with the currency. Both forms are exact. The decimal form
  is easier to read in ad-hoc queries; the integer form avoids decimal
  dialect differences. Final choice depends on the database (OQ-06).
- Money is never stored or transported as a floating-point column or JSON
  number. DTOs carry `BigDecimal`, and wire formats use strings.

## 2. Entity-relationship summary

```
user_account 1──* session
user_account 1──1 mfa_enrollment
user_account 1──* recovery_code
user_account 1──* email_verification_token
group 1──* membership *──1 user_account
group 1──* invitation
group 1──* expense 1──* expense_share *──1 user_account
expense 1──* review_record
expense 0..1──1 receipt_ref
group 1──* payment
group 1──* ledger_entry      (source → expense | payment)
group 1──* pair_balance
user_account 1──* notification  ──* email_outbox_message
processed_command (per user)
```

## 3. Tables

### 3.1 `user_account` (aggregate root `UserAccount`)

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| email_normalized | text(254) | NOT NULL, **UNIQUE** |
| email_display | text(254) | NOT NULL |
| email_verified_at | instant | NULL until verified |
| display_name | text(100) | NOT NULL, non-blank |
| password_hash | text(255) | NOT NULL (`pbkdf2-sha256$iter$salt$hash`) |
| status | text(24) | `PENDING_VERIFICATION` \| `PENDING_MFA` \| `ACTIVE` \| `LOCKED` |
| failed_auth_count | int | NOT NULL default 0 |
| locked_until | instant | NULL |
| created_at | instant | NOT NULL |
| version | int | NOT NULL (optimistic lock) |

**Invariant:** `status = ACTIVE` requires `email_verified_at IS NOT NULL`,
plus a confirmed `mfa_enrollment` and at least one issued `recovery_code`
batch.

### 3.2 Credential tables

**`mfa_enrollment`**

| Column | Type | Constraints |
|---|---|---|
| user_id | uuid | PK, FK |
| secret_ciphertext | bytes | NOT NULL (AES-GCM) |
| secret_nonce | bytes | NOT NULL |
| key_id | text(64) | NOT NULL (supports key rotation, OQ-30) |
| confirmed_at | instant | NULL until confirmed |
| last_accepted_step | int | NOT NULL default −1 (replay protection) |

**`recovery_code`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| batch_id | uuid | NOT NULL |
| code_hash | text(255) | NOT NULL |
| used_at | instant | NULL |
| invalidated_at | instant | NULL |

Index: `(user_id) WHERE used_at IS NULL AND invalidated_at IS NULL`.

**`email_verification_token`**

| Column | Type | Constraints |
|---|---|---|
| token_hash | bytes(32) | PK (SHA-256) |
| user_id | uuid | FK |
| expires_at | instant | NOT NULL |
| used_at | instant | NULL |

**`session`**

| Column | Type | Constraints |
|---|---|---|
| token_hash | bytes(32) | PK |
| user_id | uuid | FK |
| state | text(16) | `PASSWORD_OK` \| `FULL` |
| created_at | instant | NOT NULL |
| last_seen_at | instant | NOT NULL |
| idle_expires_at | instant | NOT NULL |
| absolute_expires_at | instant | NOT NULL |
| revoked_at | instant | NULL |

Index: `(user_id, state, revoked_at, idle_expires_at)`. This is used for the
FR-007 "signed out" test.

### 3.3 `group` and membership (aggregate root `Group`)

**`group`** (`app_group` if the store reserves `group`)

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| name | text(100) | NOT NULL |
| currency_code | text(3) | NOT NULL. Immutable after the first expense (OQ-34) |
| currency_minor_digits | int | NOT NULL, ≥ 0. Snapshot of the scale at creation |
| standing_reviewer_id | uuid | NULL, FK user (OQ-12) |
| created_by | uuid | FK |
| created_at | instant | NOT NULL |
| version | int | NOT NULL |

**`membership`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| group_id | uuid | FK |
| user_id | uuid | FK |
| role | text(8) | `MANAGER` \| `MEMBER` |
| joined_at | instant | NOT NULL |
| removed_at | instant | NULL |
| removed_by | uuid | NULL |

Constraints:

- **UNIQUE** `(group_id, user_id) WHERE removed_at IS NULL`: at most one
  active membership per user per group.
- At least one active `MANAGER` per group. This is enforced in the
  aggregate, and also by a check at commit if the store supports it.

Index: `(user_id, removed_at)`, used to find "my groups".

**`invitation`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| group_id | uuid | FK |
| invitee_email_normalized | text(254) | NOT NULL |
| invited_by | uuid | FK |
| status | text(10) | `PENDING` \| `ACCEPTED` \| `DECLINED` \| `REVOKED` |
| created_at | instant | NOT NULL |
| decided_at | instant | NULL |
| accepted_user_id | uuid | NULL |

Constraint: **UNIQUE** `(group_id, invitee_email_normalized) WHERE status = 'PENDING'`.

Expiry is OQ-26.

### 3.4 `expense` (aggregate root `Expense`)

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| group_id | uuid | FK, NOT NULL |
| submitter_id | uuid | FK, NOT NULL |
| payer_id | uuid | FK, NOT NULL |
| amount | decimal | NOT NULL, **≥ 0** |
| currency_code | text(3) | NOT NULL, = group.currency_code |
| expense_date | date | NOT NULL |
| description | text(500) | NOT NULL, non-blank |
| split_method | text(10) | `EQUAL` \| `PERCENTAGE` |
| status | text(8) | `PENDING` \| `APPROVED` \| `REJECTED` |
| reviewer_id | uuid | NULL (awaiting designation). CHECK `reviewer_id <> submitter_id` |
| submitted_at | instant | NOT NULL |
| decided_at | instant | NULL; NOT NULL iff status ≠ PENDING |
| supersedes_expense_id | uuid | NULL, FK expense (resubmission, OQ-13) |
| receipt_content_key | text(64) | NULL (SHA-256 hex) |
| receipt_media_type | text(32) | NULL |
| receipt_size_bytes | int | NULL |
| receipt_width_px, receipt_height_px | int | NULL |
| version | int | NOT NULL |

Indexes:

- `(group_id, expense_date)`, used by reports and lists (NFR-003);
- `(group_id, status, submitted_at)`, used by the review queue and lists;
- `(reviewer_id, status)`, used for "awaiting my review";
- `(payer_id)`, `(submitter_id)`.

### 3.5 `expense_share`

| Column | Type | Constraints |
|---|---|---|
| expense_id | uuid | PK part, FK |
| participant_id | uuid | PK part, FK |
| participant_name_snapshot | text(100) | NOT NULL (tie-order evidence, ADR-005) |
| percentage | decimal(7, 4) | NULL for EQUAL. NOT NULL, in (0, 100], for PERCENTAGE |
| share_amount | decimal | NOT NULL, ≥ 0 |
| allocation_rank | int | NOT NULL (position in the largest-remainder order, for audit) |
| received_extra_unit | bool | NOT NULL |

Invariants, checked in the domain and verified by tests:

- `Σ share_amount = expense.amount`;
- for PERCENTAGE, `Σ percentage = 100`;
- there is at least one row per expense.

Index: `(participant_id, expense_id)`, used by the member filter and
personal summary.

### 3.6 `review_record`

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| expense_id | uuid | FK |
| level | int | NOT NULL, ≥ 1. **The MVP always writes 1.** Multiple levels are full product |
| reviewer_id | uuid | FK |
| decision | text(7) | `APPROVE` \| `REJECT` |
| reason | text(500) | NULL |
| decided_at | instant | NOT NULL |

Constraint: **UNIQUE** `(expense_id, level)`. In the MVP this means at most
one decision per expense.

Records are immutable.

### 3.7 `payment` (aggregate root `Payment`, immutable)

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| group_id | uuid | FK |
| payer_id | uuid | FK |
| recipient_id | uuid | FK. CHECK `payer_id <> recipient_id` |
| amount | decimal | NOT NULL, **> 0** (OQ-20) |
| currency_code | text(3) | = group currency |
| payment_date | date | NOT NULL |
| description | text(500) | NULL |
| recorded_by | uuid | FK |
| recorded_at | instant | NOT NULL |

Indexes: `(group_id, payment_date)`, `(payer_id)`, `(recipient_id)`.

There is no UPDATE or DELETE path. This preserves history (FR-009).

### 3.8 `ledger_entry` (append-only)

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| group_id | uuid | FK |
| owed_by | uuid | FK |
| owed_to | uuid | FK. CHECK `owed_by <> owed_to` |
| amount | decimal | NOT NULL, **> 0** (zero shares are not posted) |
| currency_code | text(3) | |
| source_type | text(8) | `EXPENSE` \| `PAYMENT` |
| source_id | uuid | NOT NULL |
| effective_date | date | NOT NULL (expense_date or payment_date) |
| posted_at | instant | NOT NULL |

Constraints (these prevent duplicate posting, ADR-008):

- **UNIQUE** `(source_type, source_id, owed_by, owed_to)`;
- for `source_type = 'PAYMENT'`: **UNIQUE** `(source_type, source_id)`.

Index: `(group_id, owed_by, owed_to)`, `(group_id, effective_date)`.

Semantics are in design.md §5.2. A payment from A to B is posted as
`owed_by = B, owed_to = A`.

### 3.9 `pair_balance` (projection)

| Column | Type | Constraints |
|---|---|---|
| group_id | uuid | PK part |
| low_user_id | uuid | PK part |
| high_user_id | uuid | PK part. CHECK `low_user_id < high_user_id` |
| net | decimal | NOT NULL. Positive means low owes high |
| currency_code | text(3) | |
| version | int | NOT NULL |
| updated_at | instant | NOT NULL |

Rows are created lazily the first time two users have a ledger entry.

**Invariant:** `net = Σ ledger(low→high) − Σ ledger(high→low)`. Verified by
the reconciliation test and the admin check.

### 3.10 Notifications

**`notification`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| recipient_id | uuid | FK |
| group_id | uuid | FK |
| expense_id | uuid | FK |
| type | text(24) | `EXPENSE_SUBMITTED` (MVP). `EXPENSE_DECIDED` is pending OQ-15 |
| created_at | instant | NOT NULL |
| read_at | instant | NULL |

Constraint: **UNIQUE** `(recipient_id, expense_id, type)`. This makes
notification creation idempotent.

Index: `(recipient_id, read_at, created_at)`.

**`email_outbox_message`**

| Column | Type | Constraints |
|---|---|---|
| id | uuid | PK (also the provider idempotency key) |
| kind | text(24) | `VERIFY_EMAIL` \| `INVITATION` \| `EXPENSE_SUBMITTED` |
| recipient_user_id | uuid | NULL (an invitation may target an email with no account) |
| recipient_email | text(254) | NOT NULL (snapshot at enqueue time) |
| notification_id | uuid | NULL, FK |
| payload_ref | text | Template key plus parameters. No secrets except the verification link token |
| status | text(8) | `PENDING` \| `SENDING` \| `SENT` \| `FAILED` |
| attempts | int | NOT NULL default 0 |
| next_attempt_at | instant | NOT NULL |
| lease_until | instant | NULL |
| last_error | text(500) | NULL |
| created_at, sent_at | instant | |

Index: `(status, next_attempt_at)`.

### 3.11 `processed_command`

| Column | Type | Constraints |
|---|---|---|
| command_id | uuid | PK |
| user_id | uuid | NOT NULL |
| command_type | text(40) | NOT NULL |
| result_ref | uuid | NULL |
| created_at | instant | NOT NULL |

Retention is OQ-09.

## 4. Aggregate and transaction boundaries [PROPOSAL]

| Command | Writes in **one** transaction | Locks or version checks |
|---|---|---|
| register | user_account, email_verification_token, email_outbox_message | unique email |
| verifyEmail / confirmMfa | user_account (+ mfa_enrollment, recovery_code) | user.version |
| signIn / second factor | session, user_account.failed_auth_count, mfa_enrollment.last_accepted_step | user.version (serialises TOTP replay checks) |
| createGroup | group, membership | — |
| invite / accept / decline / revoke / removeMember / setStandingReviewer | group, membership, invitation (+ outbox for invite) | group.version |
| uploadReceipt | none in the DB (ReceiptStore only) | — |
| submitExpense | expense, expense_share, notification×n, email_outbox_message×k, processed_command | membership read; idempotency PK |
| designateReviewer | expense | expense.version |
| approve | expense, review_record, ledger_entry×≤n−1, pair_balance×≤n−1 | expense.version; pair rows locked in key order; ledger unique |
| reject | expense, review_record | expense.version |
| recordPayment | payment, ledger_entry, pair_balance, processed_command | **pair row lock** (or version + retry) |
| dispatcher tick | email_outbox_message (claim, then result) | lease_until compare-and-set |

Cross-aggregate reads, such as checking membership while submitting an
expense, happen inside the same transaction. Membership removal and expense
submission both read the membership, so the store's isolation level must
prevent a removed member's submission from committing after the removal
committed. **[PROPOSAL]** Use at least snapshot or repeatable-read isolation
plus a version bump on `group`, or serializable isolation for these two
commands.

## 5. Index and volume check (NFR-003)

The target volume is 50 members per group and 10,000 expenses per group
[FACT]. Assuming about 5 participants per expense [ASSUMPTION], that gives
roughly 50,000 `expense_share` rows and about 40,000 `ledger_entry` rows per
group.

| Query | Access path |
|---|---|
| Group balances | `pair_balance` by `group_id`, at most 1,225 rows |
| Expense list page | `(group_id, status, submitted_at)` with a 50-row page |
| Report by date range | `(group_id, expense_date)` and `(group_id, payment_date)` with aggregate queries |
| Member filter | `expense_share(participant_id, expense_id)` joined to `expense` |
| Unread notifications | `(recipient_id, read_at, created_at)` |

## 6. Requirements on the eventual data store (ADR-013)

1. ACID transactions spanning several tables.
2. Unique constraints, including partial or filtered unique constraints, or
   an equivalent emulation.
3. Row-level pessimistic locking **or** compare-and-set on a version column.
4. Exact decimal or 64-bit integer types.
5. An isolation level that prevents the races in §4.
6. Encryption at rest and backups, with retention per OQ-09.

## 7. Full-product extensions (not MVP)

- `review_requirement(group_id, level, reviewer_selector)` configures
  multi-level review. `review_record.level` already allows more than one
  level.
- `device_push_token(user_id, platform, token)` stores mobile push tokens.
- No schema change is needed for the web or mobile clients themselves; they
  reuse the server API.
