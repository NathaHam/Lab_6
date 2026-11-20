import Link from "next/link";
import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/session";
import { getUserGroups } from "@/lib/data";
import { AvatarStack, EmptyState, PageHeader, Pill, SignedMoney } from "@/components/ui";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage() {
  const user = await requireCurrentUser();
  const groups = await getUserGroups(user.id);

  return (
    <>
      <PageHeader title="Groups" subtitle="Everyone you share costs with, and where you stand in each group." />
      {groups.length === 0 ? (
        <EmptyState icon="👥" title="You're not in any groups yet">
          Group creation and invitations aren&apos;t part of this prototype. Switch to another demo user to explore.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="card flex h-full flex-col p-5 transition hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl" aria-hidden>
                    {g.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{g.name}</p>
                    <p className="line-clamp-2 text-sm text-slate-500">{g.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <AvatarStack users={g.members} max={5} />
                  <span className="text-xs text-slate-500">{g.members.length} members</span>
                  {g.role === "MANAGER" && <Pill tone="brand">Manager</Pill>}
                </div>
                <div className="mt-auto flex items-end justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs text-slate-500">Your balance</p>
                    <SignedMoney cents={g.net} className="text-lg" />
                  </div>
                  {g.pendingCount > 0 && <Pill tone="amber">{g.pendingCount} pending</Pill>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
