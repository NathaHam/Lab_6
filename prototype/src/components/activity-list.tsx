import Link from "next/link";
import type { ActivityItem } from "@/lib/data";
import { formatCents } from "@/lib/money";
import { formatDate, timeAgo } from "@/lib/dates";
import { StatusBadge } from "./ui";

export function ActivityList({ items, showGroup = true }: { items: ActivityItem[]; showGroup?: boolean }) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <Link
            href={item.kind === "expense" ? `/expenses/${item.id}` : `/groups/${item.groupId}?tab=payments`}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5"
          >
            <span
              aria-hidden
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
                item.kind === "expense" ? "bg-slate-100" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {item.kind === "expense" ? "🧾" : "⇄"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {item.kind === "expense" ? item.description : `${item.actorName} paid ${item.recipientName}`}
              </p>
              <p className="truncate text-xs text-slate-500">
                {item.kind === "expense" ? `Added by ${item.actorName}` : item.description}
                {showGroup && (
                  <>
                    {" · "}
                    {item.groupEmoji} {item.groupName}
                  </>
                )}
                {" · "}
                <span title={formatDate(item.date)}>{timeAgo(item.at)}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`money text-sm font-semibold ${item.kind === "payment" ? "text-emerald-700" : "text-slate-900"}`}>
                {formatCents(item.amountCents)}
              </span>
              {item.kind === "expense" ? (
                <StatusBadge status={item.status} />
              ) : (
                <span className="text-xs text-emerald-700">Payment</span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
