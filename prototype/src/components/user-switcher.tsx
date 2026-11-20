"use client";

import { useTransition } from "react";
import { switchDemoUser } from "@/lib/actions";

// PROTOTYPE ONLY: switching identity with a dropdown stands in for real sign-in.
export function UserSwitcher({
  users,
  currentUserId,
}: {
  users: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-xs font-medium text-slate-500 lg:inline">Demo user</span>
      <select
        aria-label="Switch demo user (prototype sign-in)"
        className="max-w-[9.5rem] rounded-lg border border-slate-300 bg-white py-1.5 pl-2 pr-7 text-sm font-medium text-slate-800 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:opacity-60 sm:max-w-none"
        defaultValue={currentUserId}
        disabled={pending}
        onChange={(e) => {
          const fd = new FormData();
          fd.set("userId", e.target.value);
          startTransition(() => switchDemoUser(fd));
        }}
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-slate-500">Switching…</span>}
    </label>
  );
}
