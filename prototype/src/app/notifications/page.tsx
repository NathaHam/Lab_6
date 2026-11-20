import Link from "next/link";
import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/session";
import { getNotifications } from "@/lib/data";
import { markAllNotificationsRead } from "@/lib/actions";
import { timeAgo } from "@/lib/dates";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireCurrentUser();
  const notifications = await getNotifications(user.id);
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="In-app notices when someone in your group adds an expense. (Prototype: no email or push notifications are sent.)"
        actions={
          unread > 0 && (
            <form action={markAllNotificationsRead}>
              <SubmitButton className="btn-secondary" pendingLabel="Marking…">
                Mark all as read
              </SubmitButton>
            </form>
          )
        }
      />
      {notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications">
          You&apos;ll be notified here when another member adds an expense to one of your groups.
        </EmptyState>
      ) : (
        <ul className="card divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                href={n.expenseId ? `/expenses/${n.expenseId}` : `/groups/${n.groupId}`}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 ${n.readAt ? "" : "bg-brand-50/50"}`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand-600"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.readAt ? "text-slate-700" : "font-medium text-slate-900"}`}>{n.message}</p>
                  <p className="text-xs text-slate-500">
                    {n.group.emoji} {n.group.name} · {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.readAt && <span className="sr-only">Unread</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
