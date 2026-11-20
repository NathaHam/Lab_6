# SplitSmart — web prototype

An interactive demo of SplitSmart's core journey: dashboard → group → add expense → approve/reject →
record payment → report. Built with Next.js 15 (App Router, server actions), React 19, Tailwind CSS 4,
Prisma 6 and SQLite.

> **Prototype, not production.** The intended production system is described in
> `../specs/001-splitsmart-expense-sharing/design/final/`. This app deliberately simplifies it:
>
> - **Demo sign-in.** The "Demo user" dropdown in the header picks who you are (a cookie). There are
>   no passwords, MFA or secure sessions.
> - **Notifications** are in-app only. No email or push is sent.
> - **Payments** are records only. No money moves and no payment provider is contacted.
> - Group creation, invitations and receipt upload are not implemented.

## Run it

```bash
cd prototype
npm run db:setup     # apply migrations, generate Prisma Client, insert demo data (safe to re-run)
npm run dev          # http://localhost:3000
```

The database is `prisma/dev.db` (SQLite, set by `DATABASE_URL` in `.env`; see `.env.example`).

| Command | What it does |
|---|---|
| `npm run db:migrate` | Apply pending migrations (`prisma migrate deploy`). Never resets data. |
| `npm run db:seed` | Insert any missing demo rows. Idempotent: never duplicates, never deletes, leaves rows you changed alone. |
| `SEED_RESTORE=1 npm run db:seed` | Also restore the demo-owned rows (ids starting `seed-`) to their original state, e.g. to re-run a demo. Data created in the app is not touched. |
| `npm run db:studio` | Browse the data in Prisma Studio. |
| `npm test` | Unit tests for money parsing, share allocation and balances (Vitest). |
| `npm run lint` / `npm run build` | ESLint / production build (includes a type check). |

The seed runs with Node's built-in TypeScript support (Node ≥ 22.18), so no extra packages are needed.

## Demo script

1. **Dashboard** (as Alex Rivera): totals owed and owing, group balances, approvals waiting for you,
   recent activity.
2. **Groups → Maple St. Apartment**: who owes whom, members with their net balances, and expense and
   payment tabs (filter by status).
3. **+ Add expense**: description, amount, date, payer, participants, and an **equal** or **percentage**
   split with a live preview of each share. Choose a reviewer other than yourself. The expense is saved as
   *Pending review* and other members get an in-app notice.
4. **Approvals**: switch the demo user to the reviewer, then approve (shares enter balances) or reject
   (a reason is required, and balances are unaffected).
5. **Record payment** (or **Settle** next to a debt): pick a debt involving you. Partial payments are
   allowed; overpayments are rejected. The group balance updates immediately.
6. **Reports**: filter by inclusive date range, group, activity type and expense status. Includes
   summary totals and current balances.

## Rules implemented (from the spec)

- Money is stored as **integer cents**, and percentages as integer basis points (33.33% = 3333). Input
  with more than 2 decimals is rejected, never rounded.
- Shares always add up exactly to the total. Leftover cents go to the **largest remainder**, with ties
  broken **alphabetically by name**. If two people with an identical name tie for a cent, the expense
  is rejected (fail closed).
- Percentages must total **exactly 100%**. $0 expenses are allowed; negative amounts are rejected.
- Pending and rejected expenses never affect balances. Only the **designated reviewer** (never the
  submitter) can decide, and the decision is a compare-and-set, so it is decided once.
- Balances are pairwise and derived from approved expenses and payments. Only the debtor or creditor
  can record a payment, for 0 < amount ≤ current debt, inside a transaction. Concurrent payments for a
  group are serialized.
- Expense and payment forms carry a command ID, so a double submit creates one record.
- All database access is server-side (`src/lib/db.ts` is marked `server-only`). Every group read and
  write checks membership.

## Code map

| Path | Purpose |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/` | Data model and migrations |
| `prisma/seed.ts` | Idempotent demo data |
| `src/lib/split.ts`, `balances.ts`, `money.ts` | Pure domain logic (shared by the server, the seed and the form preview) |
| `src/lib/data.ts` | Server-side read queries with membership checks |
| `src/lib/actions.ts` | Server actions: add expense, review, record payment, demo user switch |
| `src/app/**` | Pages: dashboard, groups, expense detail, approvals, reports, notifications |
| `src/components/**` | UI components (forms are client components; everything else renders on the server) |
