# SplitSmart — Test Approach

**Status**: Planned. **No test has been written or run.** No Maven build exists. Results must come from real executions that a human reviews (Constitution VI, IX).

## 1. Layers

| Layer | Scope | Tooling | Runs |
|---|---|---|---|
| Domain unit | Value objects, `ShareAllocator`, `Expense` state machine, ledger and debt rules, policies | JUnit 5, no I/O, no Swing | `mvn test` in `domain` |
| Application | Use cases with in-memory fakes for repositories and ports, a fixed `Clock`, `AccessPolicy` | JUnit 5 | `mvn test` in `application` |
| Integration | Repository adapters, constraints, transactions, isolation and locking on the **selected** store (OD-23) | JUnit 5 + the store's test instance | `mvn verify` |
| Contract | `ReceiptStore`, `EmailGateway`, `PasswordHasher`, `SecretCipher` adapters against one shared abstract test suite. Client and server DTO mapping. | JUnit 5 abstract test classes | `mvn verify` |
| Acceptance | AC-001 to AC-011 scenarios through the application boundary or API adapter | JUnit 5 `@Tag("acceptance")` | `mvn verify` |
| Security | Authentication, MFA, sessions, authorization matrix, logging hygiene | JUnit 5 `@Tag("security")` + specialist review | `mvn verify`, plus review |
| Performance | NFR-003 under the approved profile | JUnit 5 harness `@Tag("performance")` | Separate profile |
| Swing boundary | Presenters with a fake `ServerGateway`. Minimal wiring smoke tests. | JUnit 5 (headless where possible) | `mvn test` in `swing-client` |
| Diagrams | PlantUML syntax and render check | PlantUML CLI, pinned version | CI step (§8) |

## 2. Money and split tests (T-MNY), FR-004, NFR-002

- **T-MNY-01..15**: vectors V1–V15 from design.md §4.3, written as a `@ParameterizedTest`.
- **T-MNY-20** `MoneyTest`: rejects excess precision, scales up exactly, rejects arithmetic across currencies, round-trips minor units, `equals` and `compareTo` agree.
- **T-MNY-21**: a build check that fails if `float` or `double` appears in money packages (for example an ArchUnit-style or source scan rule).
- **T-MNY-30 (property, seeded)**: for random M in [0, bound], n in [1, 50], random weights:
  - Σ shares = M;
  - each share is base or base+1;
  - the extra units go to the largest remainders;
  - remainder ties go in name order;
  - a participant with remainder 0 never receives an extra unit;
  - results are identical when the participant input order is permuted, except for `AmbiguousAllocation` cases, which must be stable.

  The seed is logged so a failure can be reproduced.
- **T-MNY-31**: identical-name runs that do not cross the cut never throw. Runs that do cross the cut always throw.
- **T-MNY-40**: the percentage total must be exactly 100. Negative values are rejected. A scale above the configured maximum is rejected. 0% is accepted (interim OD-04). Startup fails if `maxScale` is missing.
- **T-MNY-41**: with no currency catalogue configured, group creation fails closed.

## 3. Lifecycle, review and ledger (T-EXP, T-LED), FR-003, FR-006, FR-008

- **T-EXP-01**: a submitted expense is `PENDING_REVIEW`, `UNASSIGNED` and has no ledger rows.
- **T-EXP-02**: designation rejects the submitter, non-members and non-managers. A group default is only prefilled: without a `designateReviewer` call, the default reviewer **cannot** approve.
- **T-EXP-03**: only the assigned reviewer can approve or reject. Others, including the manager and the submitter, are denied and nothing changes.
- **T-EXP-04**: approve posts exactly the non-payer, nonzero shares. The payer's share is never posted (V11). A zero expense posts nothing (V4).
- **T-EXP-05**: reject posts nothing. The status and the outcome are visible (NFR-004).
- **T-EXP-06**: `APPROVED` and `REJECTED` have no outgoing transitions.
- **T-EXP-07**: negative amounts, no participants, duplicate participants and non-member participants are rejected.
- **T-LED-01**: `net(A→B)` is antisymmetric. Balances come only from ledger rows.
- **T-LED-02**: when a projection is enabled, the projection equals a full rebuild after random command sequences.
- **T-LED-03**: privilege test. The server database role cannot UPDATE or DELETE ledger, payment or review rows (integration).

## 4. Payments (T-PAY), FR-009

- **T-PAY-01**: a partial payment reduces the debt by exactly its amount and is in history.
- **T-PAY-02**: a payment equal to the debt settles it to 0.
- **T-PAY-03**: an overpayment is rejected with `OverpaymentRejected(outstanding)`. There is no payment row, no ledger row and no balance change.
- **T-PAY-04**: zero and negative payments are rejected (interim OD-07).
- **T-PAY-05**: a third party (neither payer nor recipient) is denied (interim OD-06).
- **T-PAY-06**: payer = recipient, a non-member, or a wrong currency or scale is rejected.

## 5. Transactions, idempotency and concurrency (T-TX, T-IDEM, T-CON), NFR-006

These run on the **selected store** at its configured isolation level.
- **T-TX-01**: inject a failure after the review record is written and before the ledger write. Both roll back, and the expense stays `PENDING_REVIEW`.
- **T-TX-02**: inject a failure after the payment row and before the counter-posting. Neither persists.
- **T-TX-03**: inject a failure after the expense insert and before the notification and outbox writes. Nothing persists.
- **T-IDEM-01**: replaying submit, approve or payment with the same `CommandId` returns the same result and creates no duplicate rows.
- **T-IDEM-02**: the same `CommandId` with different data returns `IdempotencyConflict`.
- **T-IDEM-03**: two concurrent identical commands produce one effect, and both callers receive the same result.
- **T-IDEM-04**: inserting a ledger row directly with a duplicate source key is rejected by the database.
- **T-CON-01**: two reviewers or two approve requests race. Exactly one terminal decision results, with at most one set of postings.
- **T-CON-02**: two payments that each fit and together exceed the debt race. Exactly one commits, and the other is rejected.
- **T-CON-03**: an approval and a payment in the same group race. Both serialize, and the final balance equals the serial result.
- **T-CON-04**: member removal races with a submission involving that member. Either the removal is blocked, or the submission fails `NotActiveMember`. No orphan state results.
- **T-CON-05**: accept and revoke of the same invitation race. Exactly one wins.
- **T-CON-06**: two dispatchers claim the same outbox row. Only one holds the lease, and an expired lease is re-claimed.

Each concurrency test uses barriers or latches to force the interleaving and repeats N times (N set in the CI profile).

## 6. Security (T-SEC), FR-001, NFR-001

- **T-SEC-01**: no group access before email verification and MFA enrollment.
- **T-SEC-02**: a correct password without the second factor gives only a `PARTIAL` session, which every non-auth operation rejects.
- **T-SEC-03**: a TOTP code is accepted once. A replay in the same or an earlier step is rejected. A concurrent replay is accepted at most once.
- **T-SEC-04**: a recovery code works once. Regenerating invalidates the old batch. Concurrent use succeeds at most once.
- **T-SEC-05**: duplicate email registration is rejected. Sign-in errors do not reveal whether an account exists.
- **T-SEC-06**: rate limiting triggers at the configured threshold (the threshold value comes from OD-18).
- **T-SEC-07**: sessions expire at their idle and absolute deadlines (fake clock) and are revoked on sign-out and password change.
- **T-SEC-08**: authorization matrix. Every service operation × {anonymous, partial, non-member, member, manager, assigned reviewer, removed member} gives the expected allow or deny. A resource in another group returns `NotFound`.
- **T-SEC-09**: log capture across all flows contains no password, TOTP secret or code, recovery code, session or verification token, or receipt bytes.
- **T-SEC-10**: stored TOTP secrets are ciphertext with a key ID. Password hashes pass `verify` and do not equal the input.
- **T-SEC-11**: the Swing client artifact contains no database URL, credentials or provider keys (build check).

Passing these tests is **not** a security assessment. A specialist review of OD-18 is still required.

## 7. Notifications, receipts and reports

- **T-NOT-01**: at submission, every other active member gets exactly one in-app notice. The submitter gets none (interim OD-13).
- **T-NOT-02**: a member with a valid `FULL` session gets no email. A member with no session, an expired session or a revoked session gets one outbox row (fake clock, interim OD-12).
- **T-NOT-03**: a resubmitted command does not duplicate notices or outbox rows.
- **T-NOT-04**: dispatcher behaviour. Transient failures retry with backoff. A permanent failure, or reaching the attempt limit, sets `FAILED`. The business state is unaffected. The notice still shows after the next sign-in.
- **T-NOT-05**: no `EXPENSE_DECIDED` notices exist in the MVP.
- **T-RCP-01**: upload limits are enforced, and startup fails if the limits are not configured.
- **T-RCP-02**: a non-member or removed member cannot read the receipt (`NotFound`). A member can.
- **T-RCP-03**: a receipt key from another user or group, or one that is already linked, is rejected at submit.
- **T-RCP-04**: store unavailable returns `ReceiptUnavailable`. The expense still displays.
- **T-RCP-05**: the orphan report lists unlinked uploads and deletes nothing.
- **T-RPT-01**: start and end dates are both included. Start after end gives `InvalidDateRange`. No match gives an empty report.
- **T-RPT-02**: group, member and activity-type filters exclude non-matching records. Totals are per group and currency.
- **T-RPT-03**: a report over groups the caller does not belong to is denied.

## 8. Swing boundary and diagrams

- **T-UI-01**: presenters display status, submitter, reviewer and outcome from DTOs. Money text is parsed exactly.
- **T-UI-02**: presenters contain no allocation or authorization logic (a dependency rule: the presenter packages do not import domain packages).
- **T-UI-03**: long calls run off the event dispatch thread (a presenter test with a fake executor).
- **T-DIA-01**: CI runs `java -jar plantuml.jar -checkonly -failfast2 design/final/diagrams/*.puml` with a pinned PlantUML version, then renders to SVG for human inspection against the prose. The validation done for this package is recorded in traceability.md §3.

## 9. NFR-003 measurement plan (T-PERF)

- **Fixed by the source**: 50 members, 10,000 expenses in one group, ≥95% of ordinary group, balance and report views within 2 s.
- **Parameters to approve (OD-21)**: server and client hardware, network latency and bandwidth, concurrent users, workload mix (which views count as "ordinary"), data distribution (participants per expense, payments count, status mix), warm or cold cache, and the measurement boundary (from the presenter request to the rendered DTO, or the server only).
- **Harness**: a seeded deterministic data generator, a warm-up phase, then ≥100 measured views per type. Report p95 and the pass ratio per view type.
- **Decision rule**: if the ledger-derived balance view fails with a margin, evaluate the projection (OD-22) and measure again.
- **T-PERF-01..03**: group view, balance view and report view.

## 10. Test data

Builders and fixtures with deterministic IDs and a fixed `Clock`. ASCII names for frozen vectors (OD-02). A configured test currency with 2 minor digits is test configuration only, not an approved catalogue entry. A fake `EmailGateway` records sends and can inject failures. A fake `ReceiptStore` is in memory.

## 11. Requirement-to-test summary

See traceability.md §1 for each requirement's test IDs.
