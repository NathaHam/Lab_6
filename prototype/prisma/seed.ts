// Idempotent demo data for the SplitSmart prototype.
//
//   npm run db:seed                 # insert any missing demo rows; never duplicates,
//                                   # never deletes, leaves rows you changed alone
//   SEED_RESTORE=1 npm run db:seed  # also restore the demo-owned rows (fixed "seed-*"
//                                   # ids) to their original state, e.g. re-pend expenses
//                                   # you approved during a demo. Data you created in the
//                                   # app is never touched.
//
// Runs with Node's built-in TypeScript support (Node >= 22.18), no extra packages.
import prismaPkg from "@prisma/client";
import { allocateEqual, allocatePercentage } from "../src/lib/split.ts";
import type { SplitParticipant } from "../src/lib/split.ts";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();
const restore = process.env.SEED_RESTORE === "1";

const users = [
  { id: "seed-user-alex", name: "Alex Rivera", email: "alex@demo.splitsmart.test", avatarColor: "#0f766e" },
  { id: "seed-user-priya", name: "Priya Shah", email: "priya@demo.splitsmart.test", avatarColor: "#7c3aed" },
  { id: "seed-user-jordan", name: "Jordan Lee", email: "jordan@demo.splitsmart.test", avatarColor: "#c2410c" },
  { id: "seed-user-sam", name: "Sam Okafor", email: "sam@demo.splitsmart.test", avatarColor: "#1d4ed8" },
  { id: "seed-user-mei", name: "Mei Chen", email: "mei@demo.splitsmart.test", avatarColor: "#be185d" },
  { id: "seed-user-diego", name: "Diego Martínez", email: "diego@demo.splitsmart.test", avatarColor: "#4d7c0f" },
] as const;
type UserKey = "alex" | "priya" | "jordan" | "sam" | "mei" | "diego";
const uid = (k: UserKey) => `seed-user-${k}`;
const nameOf = (k: UserKey) => users.find((u) => u.id === uid(k))!.name;

const groups: {
  id: string;
  name: string;
  description: string;
  emoji: string;
  manager: UserKey;
  members: UserKey[];
}[] = [
  {
    id: "seed-group-apartment",
    name: "Maple St. Apartment",
    description: "Rent, utilities and groceries for unit 4B",
    emoji: "🏠",
    manager: "alex",
    members: ["alex", "priya", "jordan", "sam"],
  },
  {
    id: "seed-group-lisbon",
    name: "Lisbon Trip 2026",
    description: "Flights, stays and food for the October trip",
    emoji: "✈️",
    manager: "mei",
    members: ["mei", "alex", "diego", "priya"],
  },
  {
    id: "seed-group-lunch",
    name: "Friday Lunch Club",
    description: "Team lunches and coffee runs",
    emoji: "🍜",
    manager: "jordan",
    members: ["jordan", "alex", "mei", "sam", "diego"],
  },
];

type SeedExpense = {
  id: string;
  group: string;
  description: string;
  amountCents: number;
  date: string;
  payer: UserKey;
  submitter: UserKey;
  reviewer: UserKey;
  participants: UserKey[];
  percentages?: Partial<Record<UserKey, number>>; // basis points
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote?: string;
};

const A = "seed-group-apartment";
const L = "seed-group-lisbon";
const F = "seed-group-lunch";
const apt: UserKey[] = ["alex", "priya", "jordan", "sam"];
const trip: UserKey[] = ["mei", "alex", "diego", "priya"];

const expenses: SeedExpense[] = [
  // Apartment
  { id: "seed-exp-apt-rent-oct", group: A, description: "October rent", amountCents: 320000, date: "2026-10-01", payer: "alex", submitter: "alex", reviewer: "priya", participants: apt, percentages: { alex: 3000, priya: 3000, jordan: 2000, sam: 2000 }, status: "APPROVED" },
  { id: "seed-exp-apt-internet", group: A, description: "Internet — October", amountCents: 7999, date: "2026-10-05", payer: "priya", submitter: "priya", reviewer: "alex", participants: apt, status: "APPROVED" },
  { id: "seed-exp-apt-groceries-1", group: A, description: "Costco run", amountCents: 18743, date: "2026-10-12", payer: "jordan", submitter: "jordan", reviewer: "alex", participants: apt, status: "APPROVED" },
  { id: "seed-exp-apt-electric", group: A, description: "Electric bill", amountCents: 11420, date: "2026-10-28", payer: "sam", submitter: "sam", reviewer: "alex", participants: apt, status: "APPROVED" },
  { id: "seed-exp-apt-rent-nov", group: A, description: "November rent", amountCents: 320000, date: "2026-11-01", payer: "alex", submitter: "alex", reviewer: "priya", participants: apt, percentages: { alex: 3000, priya: 3000, jordan: 2000, sam: 2000 }, status: "APPROVED" },
  { id: "seed-exp-apt-cleaning", group: A, description: "Cleaning supplies", amountCents: 4250, date: "2026-11-09", payer: "priya", submitter: "priya", reviewer: "alex", participants: ["alex", "priya", "sam"], status: "REJECTED", reviewNote: "Already covered by the Costco run — please merge." },
  { id: "seed-exp-apt-groceries-2", group: A, description: "Trader Joe's groceries", amountCents: 9617, date: "2026-11-16", payer: "jordan", submitter: "jordan", reviewer: "alex", participants: apt, status: "PENDING" },
  { id: "seed-exp-apt-plants", group: A, description: "Balcony plants", amountCents: 6000, date: "2026-11-18", payer: "sam", submitter: "sam", reviewer: "priya", participants: ["priya", "sam"], status: "PENDING" },
  // Lisbon
  { id: "seed-exp-lis-airbnb", group: L, description: "Alfama apartment (5 nights)", amountCents: 98000, date: "2026-10-08", payer: "mei", submitter: "mei", reviewer: "alex", participants: trip, status: "APPROVED" },
  { id: "seed-exp-lis-dinner", group: L, description: "Seafood dinner at Cervejaria", amountCents: 21350, date: "2026-10-10", payer: "diego", submitter: "diego", reviewer: "mei", participants: trip, status: "APPROVED" },
  { id: "seed-exp-lis-tram", group: L, description: "Tram & metro passes", amountCents: 6400, date: "2026-10-09", payer: "alex", submitter: "alex", reviewer: "mei", participants: trip, status: "APPROVED" },
  { id: "seed-exp-lis-sintra", group: L, description: "Sintra day trip tickets", amountCents: 14000, date: "2026-10-11", payer: "priya", submitter: "priya", reviewer: "mei", participants: ["mei", "alex", "priya"], status: "APPROVED" },
  { id: "seed-exp-lis-fado", group: L, description: "Fado show", amountCents: 10000, date: "2026-10-12", payer: "mei", submitter: "mei", reviewer: "alex", participants: trip, percentages: { mei: 2500, alex: 2500, diego: 3500, priya: 1500 }, status: "PENDING" },
  // Lunch club
  { id: "seed-exp-fri-tacos", group: F, description: "Tacos for the team", amountCents: 8650, date: "2026-11-06", payer: "jordan", submitter: "jordan", reviewer: "mei", participants: ["jordan", "alex", "mei", "sam", "diego"], status: "APPROVED" },
  { id: "seed-exp-fri-coffee", group: F, description: "Coffee run", amountCents: 2310, date: "2026-11-12", payer: "alex", submitter: "alex", reviewer: "jordan", participants: ["alex", "mei", "sam"], status: "APPROVED" },
  { id: "seed-exp-fri-ramen", group: F, description: "Ramen Friday", amountCents: 10001, date: "2026-11-13", payer: "mei", submitter: "mei", reviewer: "alex", participants: ["jordan", "alex", "mei", "diego"], status: "PENDING" },
];

const payments = [
  { id: "seed-pay-apt-jordan", group: A, payer: "jordan" as UserKey, recipient: "alex" as UserKey, amountCents: 64000, date: "2026-10-03", note: "October rent share" },
  { id: "seed-pay-apt-sam", group: A, payer: "sam" as UserKey, recipient: "alex" as UserKey, amountCents: 50000, date: "2026-10-04", note: "Rent (partial)" },
  { id: "seed-pay-lis-alex", group: L, payer: "alex" as UserKey, recipient: "mei" as UserKey, amountCents: 20000, date: "2026-10-20", note: "Airbnb — first half" },
  { id: "seed-pay-fri-sam", group: F, payer: "sam" as UserKey, recipient: "jordan" as UserKey, amountCents: 1730, date: "2026-11-07", note: "Tacos" },
];

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: u,
      update: restore ? { name: u.name, avatarColor: u.avatarColor } : {},
    });
  }

  for (const g of groups) {
    const data = { name: g.name, description: g.description, emoji: g.emoji, currencyCode: "USD" };
    await prisma.group.upsert({ where: { id: g.id }, create: { id: g.id, ...data }, update: restore ? data : {} });
    for (const m of g.members) {
      const role = m === g.manager ? "MANAGER" : "MEMBER";
      await prisma.membership.upsert({
        where: { groupId_userId: { groupId: g.id, userId: uid(m) } },
        create: { groupId: g.id, userId: uid(m), role },
        update: restore ? { role } : {},
      });
    }
  }

  let index = 0;
  for (const e of expenses) {
    index += 1;
    const participants: SplitParticipant[] = e.participants.map((k) => ({ id: uid(k), name: nameOf(k) }));
    const allocation = e.percentages
      ? allocatePercentage(
          e.amountCents,
          participants,
          Object.fromEntries(Object.entries(e.percentages).map(([k, bp]) => [uid(k as UserKey), bp!])),
        )
      : allocateEqual(e.amountCents, participants);
    if (!allocation.ok) throw new Error(`Seed expense ${e.id}: ${allocation.error}`);

    const submittedAt = daysAgo(expenses.length - index + 1);
    const data = {
      groupId: e.group,
      description: e.description,
      amountCents: e.amountCents,
      expenseDate: e.date,
      splitMethod: e.percentages ? "PERCENTAGE" : "EQUAL",
      status: e.status,
      payerId: uid(e.payer),
      submitterId: uid(e.submitter),
      reviewerId: uid(e.reviewer),
      reviewNote: e.reviewNote ?? null,
      submittedAt,
      decidedAt: e.status === "PENDING" ? null : new Date(submittedAt.getTime() + 3_600_000),
    };
    const existing = await prisma.expense.findUnique({ where: { id: e.id } });
    if (!existing || restore) {
      await prisma.$transaction(async (tx) => {
        await tx.expense.upsert({ where: { id: e.id }, create: { id: e.id, ...data }, update: data });
        await tx.expenseShare.deleteMany({ where: { expenseId: e.id } });
        await tx.expenseShare.createMany({
          data: allocation.shares.map((s) => ({ expenseId: e.id, ...s })),
        });
        // In-app notices for the other group members (prototype: no email is sent).
        const members = groups.find((g) => g.id === e.group)!.members;
        for (const m of members) {
          if (m === e.submitter) continue;
          await tx.notification.upsert({
            where: { userId_expenseId: { userId: uid(m), expenseId: e.id } },
            create: {
              userId: uid(m),
              groupId: e.group,
              expenseId: e.id,
              message: `${nameOf(e.submitter)} added "${e.description}"`,
              createdAt: submittedAt,
              readAt: e.status === "PENDING" ? null : submittedAt,
            },
            update: {},
          });
        }
      });
    }
  }

  for (const p of payments) {
    const data = {
      groupId: p.group,
      payerId: uid(p.payer),
      recipientId: uid(p.recipient),
      amountCents: p.amountCents,
      paymentDate: p.date,
      note: p.note,
      recordedById: uid(p.payer),
      createdAt: new Date(`${p.date}T18:00:00Z`),
    };
    await prisma.payment.upsert({ where: { id: p.id }, create: { id: p.id, ...data }, update: restore ? data : {} });
  }

  const counts = {
    users: await prisma.user.count(),
    groups: await prisma.group.count(),
    expenses: await prisma.expense.count(),
    payments: await prisma.payment.count(),
  };
  console.log(`SplitSmart demo data ready${restore ? " (demo rows restored)" : ""}:`, counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
