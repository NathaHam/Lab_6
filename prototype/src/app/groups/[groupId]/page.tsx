import Link from "next/link";
import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/session";
import { getGroupDetail } from "@/lib/data";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { Avatar, EmptyState, Flash, PageHeader, Pill, SectionTitle, SignedMoney, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Group" };

const tabs = [
  { key: "overview", label: "Balances & members" },
  { key: "expenses", label: "Expenses" },
  { key: "payments", label: "Payments" },
] as const;
type Tab = (typeof tabs)[number]["key"];

const statusFilters = [
  { key: "all", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ tab?: string; status?: string; paid?: string }>;
}) {
  const { groupId } = await params;
  const sp = await searchParams;
  const tab: Tab = tabs.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "overview";
  const statusFilter = statusFilters.some((s) => s.key === sp.status) ? sp.status! : "all";

  const user = await requireCurrentUser();
  const { group, members, debts, approvedTotal } = await getGroupDetail(groupId, user.id);
  const nameById = new Map(members.map((m) => [m.id, m]));
  const me = members.find((m) => m.id === user.id)!;
  const pendingCount = group.expenses.filter((e) => e.status === "PENDING").length;
  const myDebts = debts.filter((d) => d.fromId === user.id || d.toId === user.id);
  const expenses = statusFilter === "all" ? group.expenses : group.expenses.filter((e) => e.status === statusFilter);

  return (
    <>
      <PageHeader
        back={{ href: "/groups", label: "Groups" }}
        title={
          <span className="flex items-center gap-3">
            <span aria-hidden>{group.emoji}</span>
            <span className="min-w-0 break-words">{group.name}</span>
          </span>
        }
        subtitle={group.description}
        actions={
          <>
            <Link href={`/groups/${group.id}/payments/new`} className="btn-secondary">
              ⇄ Record payment
            </Link>
            <Link href={`/groups/${group.id}/expenses/new`} className="btn-primary">
              + Add expense
            </Link>
          </>
        }
      />

      {sp.paid && <Flash>Payment recorded. Balances below are updated.</Flash>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Your balance" value={<SignedMoney cents={me.netCents} className="text-2xl font-bold" />} />
        <StatCard label="Approved spending" value={formatCents(approvedTotal)} />
        <StatCard label="Pending review" value={pendingCount} tone={pendingCount > 0 ? "amber" : "slate"} hint="Not in balances yet" />
        <StatCard label="Members" value={members.length} />
      </div>

      <div role="tablist" aria-label="Group sections" className="mt-8 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            href={`/groups/${group.id}?tab=${t.key}`}
            scroll={false}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === t.key ? "border-brand-700 text-brand-800" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {t.key === "expenses" && <span className="ml-1.5 text-xs text-slate-400">{group.expenses.length}</span>}
            {t.key === "payments" && <span className="ml-1.5 text-xs text-slate-400">{group.payments.length}</span>}
          </Link>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === "overview" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section>
              <SectionTitle>Who owes whom</SectionTitle>
              {debts.length === 0 ? (
                <EmptyState icon="🎉" title="Everyone is settled up">
                  Approved expenses will create balances between members.
                </EmptyState>
              ) : (
                <ul className="card divide-y divide-slate-100">
                  {debts.map((d) => {
                    const from = nameById.get(d.fromId)!;
                    const to = nameById.get(d.toId)!;
                    const involvesMe = d.fromId === user.id || d.toId === user.id;
                    return (
                      <li key={`${d.fromId}-${d.toId}`} className={`flex items-center gap-3 px-4 py-3 ${involvesMe ? "bg-brand-50/40" : ""}`}>
                        <Avatar name={from.name} color={from.avatarColor} size="sm" />
                        <p className="min-w-0 flex-1 text-sm text-slate-700">
                          <strong className="font-semibold text-slate-900">{from.id === user.id ? "You" : from.name}</strong>{" "}
                          {from.id === user.id ? "owe" : "owes"}{" "}
                          <strong className="font-semibold text-slate-900">{to.id === user.id ? "you" : to.name}</strong>
                        </p>
                        <span className="money font-semibold text-slate-900">{formatCents(d.amountCents)}</span>
                        {involvesMe && (
                          <Link
                            href={`/groups/${group.id}/payments/new?from=${d.fromId}&to=${d.toId}`}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                          >
                            Settle
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {myDebts.length === 0 && debts.length > 0 && (
                <p className="mt-2 text-sm text-slate-500">You&apos;re settled up with everyone in this group.</p>
              )}
            </section>

            <section>
              <SectionTitle>Members</SectionTitle>
              <ul className="card divide-y divide-slate-100">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={m.name} color={m.avatarColor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {m.name} {m.id === user.id && <span className="text-slate-500">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">{m.email}</p>
                    </div>
                    {m.role === "MANAGER" && <Pill tone="brand">Manager</Pill>}
                    <div className="w-24 text-right text-sm">
                      <SignedMoney cents={m.netCents} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                + means the member is owed money overall; − means they owe. Inviting members isn&apos;t part of this prototype.
              </p>
            </section>
          </div>
        )}

        {tab === "expenses" && (
          <section>
            <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter by status">
              {statusFilters.map((s) => (
                <Link
                  key={s.key}
                  href={`/groups/${group.id}?tab=expenses${s.key === "all" ? "" : `&status=${s.key}`}`}
                  scroll={false}
                  aria-current={statusFilter === s.key ? "true" : undefined}
                  className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset transition ${
                    statusFilter === s.key ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
            {expenses.length === 0 ? (
              <EmptyState
                icon="🧾"
                title={statusFilter === "all" ? "No expenses yet" : "No expenses with this status"}
                action={
                  <Link href={`/groups/${group.id}/expenses/new`} className="btn-primary">
                    + Add the first expense
                  </Link>
                }
              />
            ) : (
              <ul className="card divide-y divide-slate-100 overflow-hidden">
                {expenses.map((e) => {
                  const myShare = e.shares.find((s) => s.userId === user.id)?.shareCents ?? 0;
                  return (
                    <li key={e.id}>
                      <Link href={`/expenses/${e.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5">
                        <div className="hidden w-14 shrink-0 text-center sm:block">
                          <p className="text-xs uppercase text-slate-500">{formatDate(e.expenseDate).split(" ")[0]}</p>
                          <p className="text-lg font-bold leading-tight text-slate-800">{Number(e.expenseDate.slice(8))}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
                          <p className="truncate text-xs text-slate-500">
                            <span className="sm:hidden">{formatDate(e.expenseDate)} · </span>
                            {e.payer.id === user.id ? "You" : e.payer.name} paid ·{" "}
                            {e.splitMethod === "EQUAL" ? "equal split" : "% split"} · {e.shares.length} people
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="money text-sm font-semibold">{formatCents(e.amountCents)}</span>
                          <StatusBadge status={e.status} />
                        </div>
                        <div className="hidden w-28 shrink-0 text-right text-xs md:block">
                          {e.status !== "APPROVED" ? (
                            <span className="text-slate-400">not in balances</span>
                          ) : e.payerId === user.id ? (
                            <span className="text-emerald-700">you lent {formatCents(e.amountCents - myShare)}</span>
                          ) : myShare > 0 ? (
                            <span className="text-rose-700">you owe {formatCents(myShare)}</span>
                          ) : (
                            <span className="text-slate-400">not involved</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {tab === "payments" && (
          <section>
            {group.payments.length === 0 ? (
              <EmptyState
                icon="⇄"
                title="No payments recorded"
                action={
                  <Link href={`/groups/${group.id}/payments/new`} className="btn-primary">
                    Record a payment
                  </Link>
                }
              >
                Record a payment when someone settles up, and balances update right away.
              </EmptyState>
            ) : (
              <ul className="card divide-y divide-slate-100">
                {group.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <Avatar name={p.payer.name} color={p.payer.avatarColor} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800">
                        <strong className="font-semibold">{p.payer.id === user.id ? "You" : p.payer.name}</strong> paid{" "}
                        <strong className="font-semibold">{p.recipient.id === user.id ? "you" : p.recipient.name}</strong>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {formatDate(p.paymentDate)}
                        {p.note && ` · ${p.note}`}
                      </p>
                    </div>
                    <span className="money text-sm font-semibold text-emerald-700">{formatCents(p.amountCents)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Prototype: payments are records only. No money moves and no bank or payment service is involved.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
