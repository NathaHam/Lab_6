"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/groups", label: "Groups", icon: "👥" },
  { href: "/approvals", label: "Approvals", icon: "✓", badgeKey: "approvals" as const },
  { href: "/reports", label: "Reports", icon: "▤" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`) || (href === "/groups" && pathname.startsWith("/expenses"));
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold leading-5 text-white">
      {count}
    </span>
  );
}

export function DesktopNav({ approvals }: { approvals: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
            {item.badgeKey && <Badge count={approvals} />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ approvals }: { approvals: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                  active ? "text-brand-700" : "text-slate-500"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
                {item.badgeKey && approvals > 0 && (
                  <span className="absolute right-[22%] top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-4 text-white">
                    {approvals}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
