import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "./db";
import { computeDebts, netByUser, type Debt } from "./balances";

// Read-side queries. Every group-scoped read checks that the acting user is a member.

export type MemberSummary = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: string;
};

export async function requireMembership(groupId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) notFound();
  return membership;
}

async function loadDebts(groupId: string): Promise<Debt[]> {
  const [expenses, payments] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId, status: "APPROVED" },
      select: { payerId: true, shares: { select: { userId: true, shareCents: true } } },
    }),
    prisma.payment.findMany({
      where: { groupId },
      select: { payerId: true, recipientId: true, amountCents: true },
    }),
  ]);
  return computeDebts(expenses, payments);
}

export { loadDebts as getGroupDebts };

export async function getUserGroups(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } },
          _count: { select: { expenses: { where: { status: "PENDING" } } } },
        },
      },
    },
    orderBy: { group: { name: "asc" } },
  });

  return Promise.all(
    memberships.map(async ({ group, role }) => {
      const debts = await loadDebts(group.id);
      const youOwe = debts.filter((d) => d.fromId === userId).reduce((s, d) => s + d.amountCents, 0);
      const owedToYou = debts.filter((d) => d.toId === userId).reduce((s, d) => s + d.amountCents, 0);
      return {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        description: group.description,
        role,
        members: group.memberships.map((m) => m.user),
        pendingCount: group._count.expenses,
        youOwe,
        owedToYou,
        net: owedToYou - youOwe,
      };
    }),
  );
}

export async function getGroupDetail(groupId: string, userId: string) {
  await requireMembership(groupId, userId);
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } },
      expenses: {
        include: { payer: true, submitter: true, reviewer: true, shares: true },
        orderBy: [{ expenseDate: "desc" }, { submittedAt: "desc" }],
      },
      payments: {
        include: { payer: true, recipient: true },
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!group) notFound();

  const debts = await loadDebts(groupId);
  const net = netByUser(debts);
  const members: (MemberSummary & { netCents: number })[] = group.memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatarColor: m.user.avatarColor,
    role: m.role,
    netCents: net.get(m.user.id) ?? 0,
  }));
  const approvedTotal = group.expenses
    .filter((e) => e.status === "APPROVED")
    .reduce((s, e) => s + e.amountCents, 0);

  return { group, members, debts, approvedTotal };
}

export async function getGroupMembers(groupId: string, userId: string) {
  await requireMembership(groupId, userId);
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
  });
  if (!group) notFound();
  const members: MemberSummary[] = group.memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatarColor: m.user.avatarColor,
    role: m.role,
  }));
  return { group, members };
}

export async function getExpenseDetail(expenseId: string, userId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      group: true,
      payer: true,
      submitter: true,
      reviewer: true,
      shares: { include: { user: true } },
    },
  });
  if (!expense) notFound();
  await requireMembership(expense.groupId, userId);
  expense.shares.sort((a, b) => a.user.name.localeCompare(b.user.name));
  return expense;
}

export async function getPendingReviews(userId: string) {
  return prisma.expense.findMany({
    where: { reviewerId: userId, status: "PENDING", group: { memberships: { some: { userId } } } },
    include: { group: true, payer: true, submitter: true, shares: { include: { user: true } } },
    orderBy: { submittedAt: "asc" },
  });
}

export async function getPendingReviewCount(userId: string) {
  return prisma.expense.count({ where: { reviewerId: userId, status: "PENDING" } });
}

export async function getAwaitingOthers(userId: string) {
  return prisma.expense.findMany({
    where: { submitterId: userId, status: "PENDING" },
    include: { group: true, reviewer: true },
    orderBy: { submittedAt: "desc" },
  });
}

export type ActivityItem =
  | {
      kind: "expense";
      id: string;
      at: Date;
      date: string;
      description: string;
      amountCents: number;
      status: string;
      groupId: string;
      groupName: string;
      groupEmoji: string;
      actorName: string;
    }
  | {
      kind: "payment";
      id: string;
      at: Date;
      date: string;
      description: string;
      amountCents: number;
      groupId: string;
      groupName: string;
      groupEmoji: string;
      actorName: string;
      recipientName: string;
    };

export async function getRecentActivity(userId: string, take = 8): Promise<ActivityItem[]> {
  const inMyGroups = { group: { memberships: { some: { userId } } } };
  const [expenses, payments] = await Promise.all([
    prisma.expense.findMany({
      where: inMyGroups,
      include: { group: true, submitter: true },
      orderBy: { submittedAt: "desc" },
      take,
    }),
    prisma.payment.findMany({
      where: inMyGroups,
      include: { group: true, payer: true, recipient: true },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);
  const items: ActivityItem[] = [
    ...expenses.map((e) => ({
      kind: "expense" as const,
      id: e.id,
      at: e.submittedAt,
      date: e.expenseDate,
      description: e.description,
      amountCents: e.amountCents,
      status: e.status,
      groupId: e.groupId,
      groupName: e.group.name,
      groupEmoji: e.group.emoji,
      actorName: e.submitter.name,
    })),
    ...payments.map((p) => ({
      kind: "payment" as const,
      id: p.id,
      at: p.createdAt,
      date: p.paymentDate,
      description: p.note ?? "Payment",
      amountCents: p.amountCents,
      groupId: p.groupId,
      groupName: p.group.name,
      groupEmoji: p.group.emoji,
      actorName: p.payer.name,
      recipientName: p.recipient.name,
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, take);
}

export async function getNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    include: { group: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export type ReportFilters = {
  from?: string;
  to?: string;
  groupId?: string;
  type: "all" | "expenses" | "payments";
  status: "approved" | "all";
};

export async function getReport(userId: string, filters: ReportFilters) {
  const myGroupIds = (await prisma.membership.findMany({ where: { userId }, select: { groupId: true } })).map(
    (m) => m.groupId,
  );
  // Only report on groups the user belongs to, even if another id is passed in the URL.
  const groupIds = filters.groupId ? myGroupIds.filter((id) => id === filters.groupId) : myGroupIds;
  const dateRange = { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) };

  const [expenses, payments] = await Promise.all([
    filters.type === "payments"
      ? []
      : prisma.expense.findMany({
          where: {
            groupId: { in: groupIds },
            expenseDate: dateRange,
            ...(filters.status === "approved" ? { status: "APPROVED" } : {}),
          },
          include: { group: true, payer: true, shares: true },
          orderBy: [{ expenseDate: "desc" }, { submittedAt: "desc" }],
        }),
    filters.type === "expenses"
      ? []
      : prisma.payment.findMany({
          where: { groupId: { in: groupIds }, paymentDate: dateRange },
          include: { group: true, payer: true, recipient: true },
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        }),
  ]);

  const approved = expenses.filter((e) => e.status === "APPROVED");
  const summary = {
    approvedExpenseCount: approved.length,
    approvedExpenseCents: approved.reduce((s, e) => s + e.amountCents, 0),
    yourShareCents: approved.reduce(
      (s, e) => s + (e.shares.find((sh) => sh.userId === userId)?.shareCents ?? 0),
      0,
    ),
    youPaidCents: approved.filter((e) => e.payerId === userId).reduce((s, e) => s + e.amountCents, 0),
    unapprovedCount: expenses.length - approved.length,
    paymentCount: payments.length,
    paymentCents: payments.reduce((s, p) => s + p.amountCents, 0),
  };

  return { expenses, payments, summary };
}
