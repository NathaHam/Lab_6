import Link from "next/link";
import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/session";
import { getReport, getUserGroups, type ReportFilters } from "@/lib/data";
import { formatCents } from "@/lib/money";
import { formatDate, isValidISODate, todayISO } from "@/lib/dates";
import { EmptyState, Flash, PageHeader, SignedMoney, StatCard, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Reports" };

type SP = { from?: string; to?: string; group?: string; type?: string; status?: string };

function shiftDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireCurrentUser();
  const groups = await getUserGroups(user.id);

  const errors: string[] = [];
  const from = sp.from && isValidISODate(sp.from) ? sp.from : undefined;
  const to = sp.to && isValidISODate(sp.to) ? sp.to : undefined;
  if (sp.from && !from) errors.push("The start date isn't a valid date.");
  if (sp.to && !to) errors.push("The end date isn't a valid date.");
  if (from && to && from > to) errors.push("The start date must be on or before the end date.");

  const filters: ReportFilters = {
    from,
    to,
    groupId: groups.some((g) => g.id === sp.group) ? sp.group : undefined,
    type: sp.type === "expenses" || sp.type === "payments" ? sp.type : "all",
    status: sp.status === "all" ? "all" : "approved",
  };
  const report = errors.length === 0 ? await getReport(user.id, filters) : null;

  const today = todayISO();
  const monthStart = `${today.slice(0, 8)}01`;
  const presets = [
    { label: "This month", from: monthStart, to: today },
    { label: "Last 30 days", from: shiftDays(today, -29), to: today },
    { label: "Last 90 days", from: shiftDays(today, -89), to: today },
    { label: "All time", from: "", to: "" },
  ];
  const presetHref = (p: { from: string; to: string }) => {
    const q = new URLSearchParams();
    if (p.from) q.set("from", p.from);
    if (p.to) q.set("to", p.to);
    if (filters.groupId) q.set("group", filters.groupId);
    if (filters.type !== "all") q.set("type", filters.type);
    if (filters.status === "all") q.set("status", "all");
    const s = q.toString();
    return s ? `/reports?${s}` : "/reports";
  };

  const rows = report
    ? [
        ...report.expenses.map((e) => ({ kind: "expense" as const, date: e.expenseDate, sortAt: e.submittedAt.getTime(), e })),
        ...report.payments.map((p) => ({ kind: "payment" as const, date: p.paymentDate, sortAt: p.createdAt.getTime(), p })),
      ].sort((a, b) => b.date.localeCompare(a.date) || b.sortAt - a.sortAt)
    : [];

  const rangeLabel =
    from && to ? `${formatDate(from)} – ${formatDate(to)}` : from ? `Since ${formatDate(from)}` : to ? `Through ${formatDate(to)}` : "All time";

  return (
    <>
      <PageHeader title="Reports" subtitle="Expenses and payments in your groups, filtered by date and type." />

      <form method="get" className="card mb-6 p-4 sm:p-5" aria-label="Report filters">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div>
            <label htmlFor="from" className="label">
              From
            </label>
            <input id="from" name="from" type="date" className="input" defaultValue={sp.from ?? ""} />
          </div>
          <div>
            <label htmlFor="to" className="label">
              To
            </label>
            <input id="to" name="to" type="date" className="input" defaultValue={sp.to ?? ""} />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="group" className="label">
              Group
            </label>
            <select id="group" name="group" className="input" defaultValue={filters.groupId ?? ""}>
              <option value="">All my groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="type" className="label">
              Activity
            </label>
            <select id="type" name="type" className="input" defaultValue={filters.type}>
              <option value="all">Expenses &amp; payments</option>
              <option value="expenses">Expenses only</option>
              <option value="payments">Payments only</option>
            </select>
          </div>
          <div>
            <label htmlFor="status" className="label">
              Expense status
            </label>
            <select id="status" name="status" className="input" defaultValue={filters.status}>
              <option value="approved">Approved only</option>
              <option value="all">All statuses</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary">
            Apply filters
          </button>
          <Link href="/reports" className="btn-ghost">
            Reset
          </Link>
          <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:inline-block" />
          {presets.map((p) => (
            <Link
              key={p.label}
              href={presetHref(p)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {p.label}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Dates are inclusive. Expenses are filtered by expense date, payments by payment date.
        </p>
      </form>

      {errors.length > 0 && (
        <Flash tone="error">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </Flash>
      )}

      {report && (
        <>
          <p className="mb-3 text-sm font-medium text-slate-700">
            {rangeLabel}
            {filters.groupId && ` · ${groups.find((g) => g.id === filters.groupId)?.name}`}
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Approved expenses"
              value={formatCents(report.summary.approvedExpenseCents)}
              hint={`${report.summary.approvedExpenseCount} expense${report.summary.approvedExpenseCount === 1 ? "" : "s"}`}
            />
            <StatCard label="Your share" value={formatCents(report.summary.yourShareCents)} hint="of approved expenses" />
            <StatCard label="You paid for" value={formatCents(report.summary.youPaidCents)} hint="approved expenses you fronted" />
            <StatCard
              label="Payments"
              value={formatCents(report.summary.paymentCents)}
              tone="green"
              hint={`${report.summary.paymentCount} payment${report.summary.paymentCount === 1 ? "" : "s"} recorded`}
            />
          </div>
          {filters.status === "all" && report.summary.unapprovedCount > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {report.summary.unapprovedCount} pending or rejected expense(s) are listed but excluded from the totals.
            </p>
          )}

          <div className="mt-6">
            {rows.length === 0 ? (
              <EmptyState icon="🔍" title="No activity matches these filters">
                Try a wider date range or switch to &ldquo;All statuses&rdquo;.
              </EmptyState>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">Description</th>
                      <th className="px-4 py-2.5 font-medium">Group</th>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                      <th className="px-4 py-2.5 text-right font-medium">Your effect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) =>
                      r.kind === "expense" ? (
                        <tr key={`e-${r.e.id}`} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(r.date)}</td>
                          <td className="px-4 py-2.5">
                            <Link href={`/expenses/${r.e.id}`} className="font-medium text-slate-900 hover:underline">
                              {r.e.description}
                            </Link>
                            <p className="text-xs text-slate-500">Paid by {r.e.payer.name}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                            {r.e.group.emoji} {r.e.group.name}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={r.e.status} />
                          </td>
                          <td className="money px-4 py-2.5 text-right font-semibold">{formatCents(r.e.amountCents)}</td>
                          <td className="px-4 py-2.5 text-right text-xs">
                            <ExpenseEffect
                              status={r.e.status}
                              isPayer={r.e.payerId === user.id}
                              amountCents={r.e.amountCents}
                              myShare={r.e.shares.find((s) => s.userId === user.id)?.shareCents ?? 0}
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr key={`p-${r.p.id}`} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(r.date)}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-slate-900">
                              {r.p.payer.name} → {r.p.recipient.name}
                            </span>
                            {r.p.note && <p className="text-xs text-slate-500">{r.p.note}</p>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                            {r.p.group.emoji} {r.p.group.name}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                              Payment
                            </span>
                          </td>
                          <td className="money px-4 py-2.5 text-right font-semibold text-emerald-700">{formatCents(r.p.amountCents)}</td>
                          <td className="px-4 py-2.5 text-right text-xs">
                            {r.p.payerId === user.id ? (
                              <span className="text-slate-600">you paid</span>
                            ) : r.p.recipientId === user.id ? (
                              <span className="text-slate-600">you received</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Current balances</h2>
            <p className="mb-3 text-xs text-slate-500">Balances are always current, not limited to the date range above.</p>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {groups
                .filter((g) => !filters.groupId || g.id === filters.groupId)
                .map((g) => (
                  <li key={g.id} className="card flex items-center justify-between p-4">
                    <span className="text-sm font-medium">
                      {g.emoji} {g.name}
                    </span>
                    <SignedMoney cents={g.net} className="text-sm" />
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function ExpenseEffect({
  status,
  isPayer,
  amountCents,
  myShare,
}: {
  status: string;
  isPayer: boolean;
  amountCents: number;
  myShare: number;
}) {
  if (status !== "APPROVED") return <span className="text-slate-400">not in balances</span>;
  if (isPayer) return <span className="text-emerald-700">lent {formatCents(amountCents - myShare)}</span>;
  if (myShare > 0) return <span className="text-rose-700">owe {formatCents(myShare)}</span>;
  return <span className="text-slate-400">—</span>;
}
