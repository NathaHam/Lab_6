import Link from "next/link";
import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/session";
import { getExpenseDetail } from "@/lib/data";
import { formatBasisPoints, formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { ReviewActions } from "@/components/review-actions";
import { Avatar, Flash, PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Expense" };

export default async function ExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ expenseId: string }>;
  searchParams: Promise<{ created?: string; reviewed?: string }>;
}) {
  const { expenseId } = await params;
  const sp = await searchParams;
  const user = await requireCurrentUser();
  const e = await getExpenseDetail(expenseId, user.id);
  const isReviewer = e.reviewerId === user.id;
  const myShare = e.shares.find((s) => s.userId === user.id);
  const owedToPayer = e.shares.filter((s) => s.userId !== e.payerId).reduce((sum, s) => sum + s.shareCents, 0);

  return (
    <>
      <PageHeader
        back={{ href: `/groups/${e.groupId}?tab=expenses`, label: e.group.name }}
        title={e.description}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.status} />
            <span>
              {e.group.emoji} {e.group.name} · {formatDate(e.expenseDate)}
            </span>
          </span>
        }
      />

      {sp.created && (
        <Flash>
          Expense submitted and waiting for <strong>{e.reviewer.name}</strong> to review it. It won&apos;t affect balances
          until it&apos;s approved. Other members received an in-app notice.
        </Flash>
      )}
      {sp.reviewed && (
        <Flash tone={sp.reviewed === "approved" ? "success" : "info"}>
          You {sp.reviewed} this expense.{" "}
          {sp.reviewed === "approved" ? "Shares are now included in group balances." : "It will not affect balances."}
        </Flash>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</p>
                <p className="money text-3xl font-bold text-slate-900">{formatCents(e.amountCents)}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Avatar name={e.payer.name} color={e.payer.avatarColor} size="sm" />
                Paid by <strong>{e.payer.id === user.id ? "you" : e.payer.name}</strong>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {e.splitMethod === "EQUAL" ? "Split equally" : "Split by percentage"} between {e.shares.length}{" "}
              {e.shares.length === 1 ? "person" : "people"}.{" "}
              {e.status === "APPROVED"
                ? `${formatCents(owedToPayer)} is owed to ${e.payer.name}.`
                : e.status === "PENDING"
                  ? "Nothing is owed until the reviewer approves it."
                  : "This expense was rejected and doesn't affect balances."}
            </p>
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">Shares</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium">Person</th>
                    {e.splitMethod === "PERCENTAGE" && <th className="px-3 py-2 text-right font-medium">Percent</th>}
                    <th className="px-3 py-2 text-right font-medium">Share</th>
                    <th className="px-5 py-2 text-right font-medium">Owes payer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {e.shares.map((s) => (
                    <tr key={s.userId} className={s.userId === user.id ? "bg-brand-50/40" : ""}>
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2">
                          <Avatar name={s.user.name} color={s.user.avatarColor} size="sm" />
                          {s.user.name}
                          {s.userId === user.id && <span className="text-xs text-slate-500">(you)</span>}
                        </span>
                      </td>
                      {e.splitMethod === "PERCENTAGE" && (
                        <td className="money px-3 py-2.5 text-right">{s.percentBasisPoints != null && formatBasisPoints(s.percentBasisPoints)}</td>
                      )}
                      <td className="money px-3 py-2.5 text-right font-medium">
                        {formatCents(s.shareCents)}
                        {s.receivedExtraCent && (
                          <span className="ml-1 text-xs text-slate-400" title="Received a leftover cent (largest remainder, ties alphabetical)">
                            +1¢
                          </span>
                        )}
                      </td>
                      <td className="money px-5 py-2.5 text-right text-slate-600">
                        {s.userId === e.payerId ? <span className="text-slate-400">payer</span> : formatCents(s.shareCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-5 py-2.5">Total</td>
                    {e.splitMethod === "PERCENTAGE" && <td className="px-3 py-2.5 text-right">100%</td>}
                    <td className="money px-3 py-2.5 text-right">{formatCents(e.shares.reduce((sum, s) => sum + s.shareCents, 0))}</td>
                    <td className="money px-5 py-2.5 text-right">{formatCents(owedToPayer)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold text-slate-900">Review</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Status">
                <StatusBadge status={e.status} />
              </Row>
              <Row label="Submitted by">{e.submitter.id === user.id ? "You" : e.submitter.name}</Row>
              <Row label="Reviewer">{e.reviewer.id === user.id ? "You" : e.reviewer.name}</Row>
              <Row label="Submitted">{e.submittedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</Row>
              {e.decidedAt && <Row label="Decided">{e.decidedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</Row>}
            </dl>
            {e.reviewNote && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium">Reviewer note:</span> {e.reviewNote}
              </p>
            )}

            {e.status === "PENDING" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {isReviewer ? (
                  <>
                    <p className="mb-3 text-sm text-slate-600">You&apos;re the designated reviewer. Approving adds the shares to balances.</p>
                    <ReviewActions expenseId={e.id} returnTo={`/expenses/${e.id}`} />
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    Only <strong>{e.reviewer.name}</strong> can approve or reject this expense.{" "}
                    <span className="text-slate-500">Tip: use the demo user switcher at the top to act as them.</span>
                  </p>
                )}
              </div>
            )}
          </section>

          {myShare && e.payerId !== user.id && (
            <section className="card p-5 text-sm">
              <p className="text-slate-500">Your share</p>
              <p className="money text-xl font-bold">{formatCents(myShare.shareCents)}</p>
              {e.status === "APPROVED" && (
                <Link href={`/groups/${e.groupId}/payments/new?from=${user.id}&to=${e.payerId}`} className="btn-secondary mt-3 w-full">
                  Settle up with {e.payer.name.split(" ")[0]}
                </Link>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}
