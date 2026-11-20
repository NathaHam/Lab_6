import Link from "next/link";
import { requireCurrentUser } from "@/lib/session";
import { getAwaitingOthers, getPendingReviews, getRecentActivity, getUserGroups } from "@/lib/data";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { ActivityList } from "@/components/activity-list";
import { ReviewActions } from "@/components/review-actions";
import { AvatarStack, EmptyState, Flash, PageHeader, SectionTitle, SignedMoney, StatCard } from "@/components/ui";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ reviewed?: string }>;
}) {
  const { reviewed } = await searchParams;
  const user = await requireCurrentUser();
  const [groups, reviews, awaiting, activity] = await Promise.all([
    getUserGroups(user.id),
    getPendingReviews(user.id),
    getAwaitingOthers(user.id),
    getRecentActivity(user.id),
  ]);

  const youOwe = groups.reduce((s, g) => s + g.youOwe, 0);
  const owedToYou = groups.reduce((s, g) => s + g.owedToYou, 0);
  const net = owedToYou - youOwe;
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName} 👋`}
        subtitle="Here's where you stand across your groups. Balances count approved expenses and recorded payments only."
        actions={
          groups[0] && (
            <Link href={`/groups/${groups[0].id}/expenses/new`} className="btn-primary">
              + Add expense
            </Link>
          )
        }
      />

      {reviewed && (
        <Flash>
          Expense {reviewed}.{" "}
          {reviewed === "approved" ? "Balances have been updated." : "It won't affect any balances."}
        </Flash>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="You are owed" value={formatCents(owedToYou)} tone={owedToYou > 0 ? "green" : "slate"} />
        <StatCard label="You owe" value={formatCents(youOwe)} tone={youOwe > 0 ? "red" : "slate"} />
        <StatCard
          label="Net balance"
          value={<SignedMoney cents={net} className="text-2xl font-bold" />}
          hint={net === 0 ? "You're all square" : net > 0 ? "Overall, others owe you" : "Overall, you owe others"}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <section aria-labelledby="pending-title">
            <SectionTitle
              action={
                reviews.length > 0 && (
                  <Link href="/approvals" className="text-sm font-medium text-brand-700 hover:underline">
                    View all
                  </Link>
                )
              }
            >
              <span id="pending-title">
                Waiting for your approval{" "}
                {reviews.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">{reviews.length}</span>}
              </span>
            </SectionTitle>
            {reviews.length === 0 ? (
              <EmptyState icon="✅" title="Nothing to review">
                When someone names you as the reviewer of an expense, it shows up here.
              </EmptyState>
            ) : (
              <ul className="space-y-3">
                {reviews.slice(0, 3).map((e) => (
                  <li key={e.id} className="card p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/expenses/${e.id}`} className="font-semibold text-slate-900 hover:underline">
                          {e.description}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {e.group.emoji} {e.group.name} · {formatDate(e.expenseDate)} · paid by {e.payer.name} · added by{" "}
                          {e.submitter.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {e.splitMethod === "EQUAL" ? "Split equally" : "Split by percentage"} between{" "}
                          {e.shares.map((s) => s.user.name.split(" ")[0]).join(", ")}
                        </p>
                      </div>
                      <span className="money shrink-0 text-lg font-bold">{formatCents(e.amountCents)}</span>
                    </div>
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <ReviewActions expenseId={e.id} returnTo="/" compact />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {awaiting.length > 0 && (
              <p className="mt-3 text-sm text-slate-600">
                You have {awaiting.length} expense{awaiting.length === 1 ? "" : "s"} awaiting someone else&apos;s review:{" "}
                {awaiting.map((e, i) => (
                  <span key={e.id}>
                    {i > 0 && ", "}
                    <Link href={`/expenses/${e.id}`} className="font-medium text-brand-700 hover:underline">
                      {e.description}
                    </Link>{" "}
                    <span className="text-slate-500">({e.reviewer.name.split(" ")[0]})</span>
                  </span>
                ))}
              </p>
            )}
          </section>

          <section aria-labelledby="activity-title">
            <SectionTitle>
              <span id="activity-title">Recent activity</span>
            </SectionTitle>
            {activity.length === 0 ? (
              <EmptyState icon="🧾" title="No activity yet">
                Expenses and payments from your groups will appear here.
              </EmptyState>
            ) : (
              <div className="card overflow-hidden">
                <ActivityList items={activity} />
              </div>
            )}
          </section>
        </div>

        <section aria-labelledby="groups-title" className="lg:col-span-2">
          <SectionTitle
            action={
              <Link href="/groups" className="text-sm font-medium text-brand-700 hover:underline">
                All groups
              </Link>
            }
          >
            <span id="groups-title">Your groups</span>
          </SectionTitle>
          {groups.length === 0 ? (
            <EmptyState icon="👥" title="You're not in any groups yet" />
          ) : (
            <ul className="space-y-3">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link href={`/groups/${g.id}`} className="card flex items-center gap-3 p-4 transition hover:border-brand-200 hover:shadow">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl" aria-hidden>
                      {g.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{g.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <AvatarStack users={g.members} />
                        {g.pendingCount > 0 && (
                          <span className="text-xs text-amber-700">{g.pendingCount} pending</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <SignedMoney cents={g.net} className="text-sm" />
                      <p className="text-[11px] text-slate-500">
                        {g.net > 0 ? "owed to you" : g.net < 0 ? "you owe" : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
