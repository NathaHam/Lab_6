import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import { requireCurrentUser } from "@/lib/session";
import { getGroupMembers } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { ExpenseForm } from "@/components/expense-form";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireCurrentUser();
  const { group, members } = await getGroupMembers(groupId, user.id);

  // Default reviewer: the group manager, unless that's you; then the first other member.
  const others = members.filter((m) => m.id !== user.id);
  const defaultReviewer = others.find((m) => m.role === "MANAGER") ?? others[0];

  return (
    <>
      <PageHeader
        back={{ href: `/groups/${group.id}`, label: group.name }}
        title="Add an expense"
        subtitle={`${group.emoji} ${group.name} · amounts in ${group.currencyCode}`}
      />
      {defaultReviewer ? (
        <ExpenseForm
          groupId={group.id}
          members={members}
          currentUserId={user.id}
          defaultReviewerId={defaultReviewer.id}
          today={todayISO()}
          commandId={randomUUID()}
        />
      ) : (
        <EmptyState icon="🙋" title="This group needs a second member">
          Every expense needs a reviewer other than the person who submits it.
        </EmptyState>
      )}
    </>
  );
}
