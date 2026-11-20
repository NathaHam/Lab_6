import Link from "next/link";
import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/session";
import { getAwaitingOthers, getPendingReviews } from "@/lib/data";
import { formatBasisPoints, formatCents } from "@/lib/money";
import { formatDate, timeAgo } from "@/lib/dates";
import { ReviewActions } from "@/components/review-actions";
import { Avatar, EmptyState, Flash, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ reviewed?: string }> }) {
  const { reviewed } = await searchParams;
  const user = await requireCurrentUser();
  const [reviews, awaiting] = await Promise.all([getPendingReviews(user.id), getAwaitingOthers(user.id)]);

  return (
    <>
      <PageHeader
        title="Approvals"
        subtitle="Expenses only count toward balances after their designated reviewer approves them."
      />
      {reviewed && (
        <Flash tone={reviewed === "approved" ? "success" : "info"}>
          Expense {reviewed}. {reviewed === "approved" ? "Group balances now include it." : "It won't affect balances."}
        </Flash>
      )}

      <section aria-labelledby="queue">
        <SectionTitle>
          <span id="queue">Assigned to you ({reviews.length})</span>
        </SectionTitle>
        {reviews.length === 0 ? (
          <EmptyState icon="✅" title="You're all caught up">
            No expenses are waiting for your review. Switch demo user to see other reviewers&apos; queues.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {reviews.map((e) => (
              <li key={e.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/expenses/${e.id}`} className="font-semibold text-slate-900 hover:underline">
                      {e.description}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {e.group.emoji} {e.group.name} · {formatDate(e.expenseDate)} · submitted {timeAgo(e.submittedAt)} by{" "}
                      {e.submitter.name}
                    </p>
                  </div>
                  <span className="money shrink-0 text-xl font-bold">{formatCents(e.amountCents)}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Paid by <strong>{e.payer.name}</strong> · {e.splitMethod === "EQUAL" ? "split equally" : "split by percentage"}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {e.shares.map((s) => (
                    <li key={s.userId} className="flex items-center gap-1.5 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2.5 text-xs text-slate-700">
                      <Avatar name={s.user.name} color={s.user.avatarColor} size="sm" />
                      {s.user.name.split(" ")[0]}
                      <span className="money font-semibold">{formatCents(s.shareCents)}</span>
                      {s.percentBasisPoints != null && <span className="text-slate-500">({formatBasisPoints(s.percentBasisPoints)})</span>}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto border-t border-slate-100 pt-4">
                  <ReviewActions expenseId={e.id} returnTo="/approvals" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="mine" className="mt-10">
        <SectionTitle>
          <span id="mine">Submitted by you, awaiting review ({awaiting.length})</span>
        </SectionTitle>
        {awaiting.length === 0 ? (
          <p className="text-sm text-slate-500">None right now.</p>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {awaiting.map((e) => (
              <li key={e.id}>
                <Link href={`/expenses/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
                    <p className="truncate text-xs text-slate-500">
                      {e.group.emoji} {e.group.name} · reviewer: {e.reviewer.name}
                    </p>
                  </div>
                  <span className="money text-sm font-semibold">{formatCents(e.amountCents)}</span>
                  <StatusBadge status={e.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
