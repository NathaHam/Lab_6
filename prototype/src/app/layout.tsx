import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getPendingReviewCount, getUnreadNotificationCount } from "@/lib/data";
import { DesktopNav, MobileNav } from "@/components/nav";
import { UserSwitcher } from "@/components/user-switcher";
import { Avatar } from "@/components/ui";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "SplitSmart", template: "%s · SplitSmart" },
  description: "SplitSmart prototype: share expenses, approve them, and settle up.",
};

export const viewport: Viewport = { themeColor: "#0f766e", width: "device-width", initialScale: 1 };

// Every page reads the demo-user cookie and live data.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [users, currentUser] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getCurrentUser(),
  ]);
  const [approvals, unread] = currentUser
    ? await Promise.all([getPendingReviewCount(currentUser.id), getUnreadNotificationCount(currentUser.id)])
    : [0, 0];

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div
          role="note"
          className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-950"
        >
          <strong>Prototype demo.</strong> Sign-in is simulated, notifications are in-app only, and payments are
          records only. Nothing here is secure or connected to email or bank services.
        </div>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-sm text-white">
                S/
              </span>
              <span className="hidden sm:inline">SplitSmart</span>
            </Link>
            <DesktopNav approvals={approvals} />
            <div className="ml-auto flex items-center gap-2">
              {currentUser && (
                <Link
                  href="/notifications"
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                  aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              )}
              {currentUser && (
                <>
                  <span className="hidden sm:inline-flex">
                    <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
                  </span>
                  <UserSwitcher users={users} currentUserId={currentUser.id} />
                </>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-12">
          {currentUser ? children : <NoData />}
        </main>
        <MobileNav approvals={approvals} />
      </body>
    </html>
  );
}

function NoData() {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <h1 className="text-xl font-bold">No demo data yet</h1>
      <p className="mt-2 text-sm text-slate-600">
        The SQLite database has no users. From the <code className="rounded bg-slate-100 px-1">prototype/</code>{" "}
        folder run:
      </p>
      <pre className="mt-4 rounded-lg bg-slate-900 p-3 text-left text-sm text-slate-100">npm run db:setup</pre>
      <p className="mt-3 text-xs text-slate-500">This applies migrations and inserts demo data (safe to run more than once).</p>
    </div>
  );
}
