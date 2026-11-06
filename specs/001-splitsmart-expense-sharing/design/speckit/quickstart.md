# Validation Guide (Future Implementation)

This guide defines the intended verification sequence for the design. It is not currently runnable: the inspected workspace has no `pom.xml`, Maven wrapper, Java source, or tests. No build/test result is claimed. Once the approved project exists, run all commands from its Maven project root.

## Prerequisites before execution

1. A human reviewer has accepted or amended the design and resolved implementation blockers in [open-questions.md](./open-questions.md), particularly currency scale, duplicate-name split ties, database/deployment, and authentication policy.
2. The project provides Java 21, Maven build configuration, JUnit 5 dependencies, and a documented local test configuration.
3. Integration tests use an isolated test database and fake/test email and receipt adapters; they must never deliver real customer email or store real receipts.
4. Configure deterministic test time, test identity data, and unique per-run database state.

## Expected command entry points

```powershell
mvn test
```

The exact Maven profiles, integration-test selectors, performance-test commands, and application launch command cannot be specified until `pom.xml` and the project layout exist. Do not invent module names or test selectors.

## Verification scenarios

### 1. Account, MFA, and invitation

1. Register a user, verify the email, enroll an authenticator app, and complete sign-in with password plus authenticator code.
2. Use one recovery code successfully, then attempt to reuse it.
3. Create a group and invite another user.
4. Before acceptance, attempt to read group activity as the invitee and an unrelated account; both must be denied.
5. Accept the invitation as the intended identity; verify the new member gains only that group's authorized access.

**Expected:** verified users can authenticate with required factors; consumed recovery codes cannot be reused; invitation acceptance controls access.

### 2. Split and approval

1. Submit an equal split of 10.00 across three uniquely named participants. Verify shares reconcile to 10.00 and alphabetical order receives the residual cent.
2. Submit a percentage split whose percentages total exactly 100%; verify shares reconcile exactly.
3. Attempt a negative amount and a percentage total other than 100%; both are rejected.
4. Submit a zero-value expense; it enters pending review but changes no balance after approval.
5. Verify pending expense is excluded from all balances.
6. Attempt to approve as the submitter and as a non-designated reviewer; neither request changes state or balance.
7. Approve as the assigned reviewer; verify one complete posting set and a reconciled pairwise balance.
8. Reject another pending expense; verify no posting is created.
9. Exercise duplicate-name remainder ties only after the owner has approved an explicit rule.

**Expected:** exact split reconciliation; pending/rejected excluded; approved expense posts once; payer-participant share is not owed to self.

### 3. Notification delivery

1. Submit an expense while one recipient is signed in and another is signed out.
2. Verify an in-app notice is persisted for each other group member.
3. Verify an email outbox item is created only for the recipient identified as signed out at submission.
4. Simulate transient delivery failure and retry; ensure no duplicate notification and no change in expense/balance state.

**Expected:** channel selection follows the approved submission-time session policy and delivery failures do not undo business state.

### 4. Partial and overpayment settlement

1. Use an approved expense to create a positive pairwise debt.
2. Record a payment smaller than the debt; verify history and remaining balance.
3. Record payment of exactly the remaining debt; verify settlement.
4. Attempt an overpayment and repeat a request with the same idempotency key.
5. Attempt two concurrent payments whose combined amount is greater than the current debt.

**Expected:** valid partial/full payments reduce debt exactly; overpayment/concurrent stale write is rejected without partial mutation; retry is not duplicated.

### 5. Reporting and performance

1. Populate a group with expenses and payments on dates immediately before, at, and after the inclusive range boundaries.
2. Apply group/member/activity filters and verify only matching authorized records are included.
3. Verify an empty result is explicitly represented and invalid ranges are errors.
4. Run 100 ordinary group, balance, and report views for a 50-member group and 10,000 recorded expenses under the human-approved normal operating profile.

**Expected:** boundary/filter behavior matches the approved report semantics; at least 95 of 100 views complete under 2 seconds. Preserve raw timing, environment, load details, and result counts.

## Scope note

Web, Android, and iOS parity is a separate full-product validation obligation for FR-012/NFR-005. Passing the future Swing MVP scenarios does not satisfy those commitments.
