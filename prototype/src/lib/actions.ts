"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { DEMO_USER_COOKIE, requireCurrentUser } from "./session";
import { parseAmountToCents, parsePercentToBasisPoints, formatCents } from "./money";
import { allocateEqual, allocatePercentage } from "./split";
import { computeDebts, debtBetween } from "./balances";
import { isValidISODate } from "./dates";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// ---------------------------------------------------------------------------
// Demo sign-in (PROTOTYPE ONLY — no authentication)
// ---------------------------------------------------------------------------

export async function switchDemoUser(formData: FormData) {
  const userId = str(formData, "userId");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const store = await cookies();
  store.set(DEMO_USER_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Add expense (FR-003, FR-004, FR-006, FR-007)
// ---------------------------------------------------------------------------

export async function createExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const groupId = str(formData, "groupId");
  const commandId = str(formData, "commandId") || null;

  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership) return { error: "You are not a member of this group." };

  // Idempotency: a re-submitted form returns the expense it already created.
  if (commandId) {
    const existing = await prisma.expense.findUnique({ where: { commandId } });
    if (existing) redirect(`/expenses/${existing.id}?created=1`);
  }

  const members = await prisma.membership.findMany({ where: { groupId }, include: { user: true } });
  const memberById = new Map(members.map((m) => [m.userId, m.user]));
  const fieldErrors: Record<string, string> = {};

  const description = str(formData, "description");
  if (!description) fieldErrors.description = "Add a short description.";
  else if (description.length > 120) fieldErrors.description = "Keep the description under 120 characters.";

  const amount = parseAmountToCents(str(formData, "amount"));
  if (!amount.ok) fieldErrors.amount = amount.error;

  const expenseDate = str(formData, "expenseDate");
  if (!isValidISODate(expenseDate)) fieldErrors.expenseDate = "Choose a valid date.";

  const payerId = str(formData, "payerId");
  if (!memberById.has(payerId)) fieldErrors.payerId = "Choose who paid.";

  const participantIds = formData.getAll("participantIds").map(String);
  if (participantIds.length === 0) fieldErrors.participants = "Choose at least one participant.";
  else if (participantIds.some((id) => !memberById.has(id)))
    fieldErrors.participants = "Participants must be members of this group.";
  else if (new Set(participantIds).size !== participantIds.length)
    fieldErrors.participants = "Each participant can only be listed once.";

  const reviewerId = str(formData, "reviewerId");
  if (!memberById.has(reviewerId)) fieldErrors.reviewerId = "Choose a reviewer from the group.";
  else if (reviewerId === user.id) fieldErrors.reviewerId = "You can't review your own expense.";

  const splitMethod = str(formData, "splitMethod");
  if (splitMethod !== "EQUAL" && splitMethod !== "PERCENTAGE") fieldErrors.splitMethod = "Choose a split method.";

  const basisPoints: Record<string, number> = {};
  if (splitMethod === "PERCENTAGE" && !fieldErrors.participants) {
    for (const id of participantIds) {
      const pct = parsePercentToBasisPoints(str(formData, `percent_${id}`));
      if (!pct.ok) {
        fieldErrors.split = `${memberById.get(id)!.name}: ${pct.error}`;
        break;
      }
      basisPoints[id] = pct.bp;
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !amount.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const participants = participantIds.map((id) => ({ id, name: memberById.get(id)!.name }));
  const allocation =
    splitMethod === "EQUAL"
      ? allocateEqual(amount.cents, participants)
      : allocatePercentage(amount.cents, participants, basisPoints);
  if (!allocation.ok) return { error: allocation.error, fieldErrors: { split: allocation.error } };

  let expenseId: string;
  try {
    // Expense, shares and in-app notices commit together (or not at all).
    expenseId = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          groupId,
          description,
          amountCents: amount.cents,
          expenseDate,
          splitMethod,
          status: "PENDING",
          payerId,
          submitterId: user.id,
          reviewerId,
          commandId,
          shares: { create: allocation.shares },
        },
      });
      const others = members.filter((m) => m.userId !== user.id);
      if (others.length > 0) {
        await tx.notification.createMany({
          data: others.map((m) => ({
            userId: m.userId,
            groupId,
            expenseId: expense.id,
            message: `${user.name} added "${description}" (${formatCents(amount.cents)})`,
          })),
        });
      }
      return expense.id;
    });
  } catch (error) {
    if (isUniqueViolation(error) && commandId) {
      const existing = await prisma.expense.findUnique({ where: { commandId } });
      if (existing) redirect(`/expenses/${existing.id}?created=1`);
    }
    console.error("createExpense failed", error);
    return { error: "Could not save the expense. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect(`/expenses/${expenseId}?created=1`);
}

// ---------------------------------------------------------------------------
// Approve / reject (FR-006): only the designated reviewer, only while PENDING.
// ---------------------------------------------------------------------------

export async function reviewExpense(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const expenseId = str(formData, "expenseId");
  const decision = str(formData, "decision");
  const note = str(formData, "note").slice(0, 280) || null;
  const returnTo = str(formData, "returnTo");

  if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Unknown decision." };
  if (decision === "REJECTED" && !note) {
    return { error: "Add a short reason so the submitter knows what to fix.", fieldErrors: { note: "Required when rejecting." } };
  }

  // Conditional update = compare-and-set: two concurrent decisions cannot both win.
  const result = await prisma.expense.updateMany({
    where: { id: expenseId, status: "PENDING", reviewerId: user.id },
    data: { status: decision, reviewNote: note, decidedAt: new Date() },
  });

  if (result.count === 0) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) return { error: "This expense no longer exists." };
    if (expense.status !== "PENDING") return { error: `This expense was already ${expense.status.toLowerCase()}.` };
    return { error: "Only the designated reviewer can approve or reject this expense." };
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, expenseId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  if (returnTo.startsWith("/")) redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}reviewed=${decision.toLowerCase()}`);
  return {};
}

// ---------------------------------------------------------------------------
// Record payment (FR-009): debtor or creditor only, 0 < amount <= current debt.
// ---------------------------------------------------------------------------

export async function recordPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCurrentUser();
  const groupId = str(formData, "groupId");
  const payerId = str(formData, "payerId");
  const recipientId = str(formData, "recipientId");
  const paymentDate = str(formData, "paymentDate");
  const note = str(formData, "note").slice(0, 120) || null;
  const commandId = str(formData, "commandId") || null;

  const membership = await prisma.membership.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership) return { error: "You are not a member of this group." };

  if (commandId) {
    const existing = await prisma.payment.findUnique({ where: { commandId } });
    if (existing) redirect(`/groups/${groupId}?tab=payments&paid=1`);
  }

  const fieldErrors: Record<string, string> = {};
  if (!payerId || !recipientId) fieldErrors.debt = "Choose who is paying whom.";
  else if (payerId === recipientId) fieldErrors.debt = "Payer and recipient must be different people.";
  else if (user.id !== payerId && user.id !== recipientId)
    fieldErrors.debt = "Prototype rule: only the person paying or the person being paid can record a payment.";

  const amount = parseAmountToCents(str(formData, "amount"));
  if (!amount.ok) fieldErrors.amount = amount.error;
  else if (amount.cents === 0) fieldErrors.amount = "A payment must be more than $0.00.";

  if (!isValidISODate(paymentDate)) fieldErrors.paymentDate = "Choose a valid date.";
  if (Object.keys(fieldErrors).length > 0 || !amount.ok) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    // Re-check the debt and insert inside one transaction, so two payments can't together
    // exceed what is owed. Payments for the same group are also queued in-process so a
    // concurrent request waits its turn and gets a clear answer instead of a lock timeout.
    // (Prototype: a single server process. Production uses a per-group ledger head lock.)
    await withGroupLock(groupId, () => prisma.$transaction(async (tx) => {
      const [expenses, payments] = await Promise.all([
        tx.expense.findMany({
          where: { groupId, status: "APPROVED" },
          select: { payerId: true, shares: { select: { userId: true, shareCents: true } } },
        }),
        tx.payment.findMany({ where: { groupId }, select: { payerId: true, recipientId: true, amountCents: true } }),
      ]);
      const owed = debtBetween(computeDebts(expenses, payments), payerId, recipientId);
      if (owed === 0) throw new PaymentRejected("There is no outstanding debt in that direction.");
      if (amount.cents > owed)
        throw new PaymentRejected(`That's more than the ${formatCents(owed)} currently owed. Overpayments are rejected.`);
      await tx.payment.create({
        data: {
          groupId,
          payerId,
          recipientId,
          amountCents: amount.cents,
          paymentDate,
          note,
          recordedById: user.id,
          commandId,
        },
      });
    }));
  } catch (error) {
    if (error instanceof PaymentRejected) return { error: error.message, fieldErrors: { amount: error.message } };
    if (isUniqueViolation(error)) redirect(`/groups/${groupId}?tab=payments&paid=1`);
    console.error("recordPayment failed", error);
    return { error: "Could not record the payment (another change may have happened). Please try again." };
  }

  revalidatePath("/", "layout");
  redirect(`/groups/${groupId}?tab=payments&paid=1`);
}

class PaymentRejected extends Error {}

const groupLocks = new Map<string, Promise<unknown>>();

/** Run `fn` after any in-flight work for the same group finishes (in-process mutex). */
async function withGroupLock<T>(groupId: string, fn: () => Promise<T>): Promise<T> {
  const previous = groupLocks.get(groupId) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(fn);
  groupLocks.set(groupId, run);
  try {
    return await run;
  } finally {
    if (groupLocks.get(groupId) === run) groupLocks.delete(groupId);
  }
}

// ---------------------------------------------------------------------------
// Notifications (in-app only)
// ---------------------------------------------------------------------------

export async function markAllNotificationsRead() {
  const user = await requireCurrentUser();
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}
