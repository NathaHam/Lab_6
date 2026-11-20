import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { requireCurrentUser } from "@/lib/session";
import { getGroupDebts, getGroupMembers } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { PaymentForm } from "@/components/payment-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Record payment" };

export default async function NewPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { groupId } = await params;
  const { from, to } = await searchParams;
  const user = await requireCurrentUser();
  const { group, members } = await getGroupMembers(groupId, user.id);
  const debts = (await getGroupDebts(groupId)).filter((d) => d.fromId === user.id || d.toId === user.id);

  return (
    <>
      <PageHeader
        back={{ href: `/groups/${group.id}`, label: group.name }}
        title="Record a payment"
        subtitle="Log money that changed hands outside SplitSmart. Balances update as soon as you save."
      />
      <PaymentForm
        groupId={group.id}
        members={members}
        currentUserId={user.id}
        debts={debts}
        initial={from && to ? { fromId: from, toId: to } : undefined}
        today={todayISO()}
        commandId={randomUUID()}
      />
    </>
  );
}
