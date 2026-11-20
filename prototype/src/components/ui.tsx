import Link from "next/link";
import type { ReactNode } from "react";
import { formatCents } from "@/lib/money";

export function Avatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const sizes = { sm: "h-6 w-6 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-base" };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${sizes[size]}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ users, max = 4 }: { users: { id: string; name: string; avatarColor: string }[]; max?: number }) {
  const shown = users.slice(0, max);
  return (
    <div className="flex -space-x-2" title={users.map((u) => u.name).join(", ")}>
      {shown.map((u) => (
        <Avatar key={u.id} name={u.name} color={u.avatarColor} size="sm" />
      ))}
      {users.length > max && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700 ring-2 ring-white">
          +{users.length - max}
        </span>
      )}
    </div>
  );
}

const statusStyles: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending review", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  REJECTED: { label: "Rejected", className: "bg-rose-50 text-rose-800 ring-rose-600/20" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] ?? { label: status, className: "bg-slate-100 text-slate-700 ring-slate-500/20" };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}>
      {s.label}
    </span>
  );
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "brand" | "amber" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    brand: "bg-brand-50 text-brand-800",
    amber: "bg-amber-100 text-amber-900",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** Signed balance: positive = owed to you (green), negative = you owe (red). */
export function SignedMoney({ cents, className = "" }: { cents: number; className?: string }) {
  if (cents === 0) return <span className={`money text-slate-500 ${className}`}>settled</span>;
  return (
    <span className={`money font-semibold ${cents > 0 ? "text-emerald-700" : "text-rose-700"} ${className}`}>
      {cents > 0 ? "+" : "−"}
      {formatCents(Math.abs(cents))}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon = "✨",
  title,
  children,
  action,
}: {
  icon?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      <div className="mb-2 text-3xl" aria-hidden>
        {icon}
      </div>
      <p className="font-medium text-slate-800">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Flash({ tone = "success", children }: { tone?: "success" | "info" | "error"; children: ReactNode }) {
  const tones = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
  };
  const icons = { success: "✓", info: "ℹ", error: "!" };
  return (
    <div role="status" className={`mb-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <span aria-hidden className="font-bold">
        {icons[tone]}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "slate" | "green" | "red" | "amber";
}) {
  const tones = {
    slate: "text-slate-900",
    green: "text-emerald-700",
    red: "text-rose-700",
    amber: "text-amber-700",
  };
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`money mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
