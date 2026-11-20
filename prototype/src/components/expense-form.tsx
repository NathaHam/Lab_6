"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { createExpense, type FormState } from "@/lib/actions";
import { formatCents, parseAmountToCents, parsePercentToBasisPoints, formatBasisPoints } from "@/lib/money";
import { allocateEqual, allocatePercentage } from "@/lib/split";
import type { MemberSummary } from "@/lib/data";
import { Avatar } from "./ui";
import { Spinner } from "./submit-button";

type Props = {
  groupId: string;
  members: MemberSummary[];
  currentUserId: string;
  defaultReviewerId: string;
  today: string;
  commandId: string;
};

/** Spread 100% across n people in 0.01% steps, e.g. 3 -> 33.34, 33.33, 33.33. */
function evenPercentages(ids: string[]): Record<string, string> {
  const n = ids.length;
  if (n === 0) return {};
  const base = Math.floor(10_000 / n);
  let extra = 10_000 - base * n;
  const out: Record<string, string> = {};
  for (const id of ids) {
    const bp = base + (extra-- > 0 ? 1 : 0);
    out[id] = (bp / 100).toFixed(2).replace(/\.00$/, "");
  }
  return out;
}

export function ExpenseForm({ groupId, members, currentUserId, defaultReviewerId, today, commandId }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(createExpense, {});
  const fe = state.fieldErrors ?? {};

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [payerId, setPayerId] = useState(currentUserId);
  const [participantIds, setParticipantIds] = useState<string[]>(members.map((m) => m.id));
  const [method, setMethod] = useState<"EQUAL" | "PERCENTAGE">("EQUAL");
  const [percents, setPercents] = useState<Record<string, string>>(() => evenPercentages(members.map((m) => m.id)));
  const [reviewerId, setReviewerId] = useState(defaultReviewerId);

  const reviewers = members.filter((m) => m.id !== currentUserId);
  const selected = members.filter((m) => participantIds.includes(m.id));
  const parsedAmount = parseAmountToCents(amount);

  const toggle = (id: string) =>
    setParticipantIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  // Live preview using the same allocator the server uses.
  const preview = (() => {
    if (!parsedAmount.ok) return { kind: "idle" as const, message: amount ? parsedAmount.error : "Enter an amount to preview shares." };
    if (selected.length === 0) return { kind: "error" as const, message: "Choose at least one participant." };
    const participants = selected.map((m) => ({ id: m.id, name: m.name }));
    let totalBp = 0;
    if (method === "PERCENTAGE") {
      const bp: Record<string, number> = {};
      for (const m of selected) {
        const p = parsePercentToBasisPoints(percents[m.id] ?? "");
        if (!p.ok) return { kind: "error" as const, message: `${m.name}: ${p.error}` };
        bp[m.id] = p.bp;
        totalBp += p.bp;
      }
      const result = allocatePercentage(parsedAmount.cents, participants, bp);
      return result.ok
        ? { kind: "ok" as const, shares: result.shares, totalBp }
        : { kind: "error" as const, message: result.error, totalBp };
    }
    const result = allocateEqual(parsedAmount.cents, participants);
    return result.ok ? { kind: "ok" as const, shares: result.shares, totalBp: 10_000 } : { kind: "error" as const, message: result.error };
  })();

  const percentTotal = (() => {
    let total = 0;
    for (const m of selected) {
      const p = parsePercentToBasisPoints(percents[m.id] ?? "");
      if (p.ok) total += p.bp;
    }
    return total;
  })();

  return (
    <form
      className="grid grid-cols-1 gap-6 lg:grid-cols-5"
      noValidate
      onSubmit={(e) => {
        // Submit manually (not via the form action prop) so React doesn't reset the controlled fields.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="commandId" value={commandId} />
      <input type="hidden" name="splitMethod" value={method} />

      <div className="space-y-6 lg:col-span-3">
        <fieldset className="card space-y-4 p-5">
          <legend className="sr-only">Expense details</legend>
          <div>
            <label htmlFor="description" className="label">
              Description
            </label>
            <input
              id="description"
              name="description"
              className="input"
              placeholder="e.g. Groceries at Whole Foods"
              maxLength={120}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={fe.description ? true : undefined}
              aria-describedby={fe.description ? "description-error" : undefined}
              autoFocus
            />
            {fe.description && <FieldError id="description-error">{fe.description}</FieldError>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className="label">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
                <input
                  id="amount"
                  name="amount"
                  inputMode="decimal"
                  autoComplete="off"
                  className="input money pl-7"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={fe.amount || (amount && !parsedAmount.ok) ? true : undefined}
                  aria-describedby="amount-help"
                />
              </div>
              <p id="amount-help" className={`mt-1 text-xs ${fe.amount || (amount && !parsedAmount.ok) ? "text-rose-700" : "text-slate-500"}`}>
                {fe.amount ?? (amount && !parsedAmount.ok ? parsedAmount.error : "Exact to the cent; $0 is allowed.")}
              </p>
            </div>
            <div>
              <label htmlFor="expenseDate" className="label">
                Date
              </label>
              <input
                id="expenseDate"
                name="expenseDate"
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={fe.expenseDate ? true : undefined}
              />
              {fe.expenseDate && <FieldError>{fe.expenseDate}</FieldError>}
            </div>
          </div>
          <div>
            <label htmlFor="payerId" className="label">
              Paid by
            </label>
            <select id="payerId" name="payerId" className="input" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === currentUserId ? `${m.name} (you)` : m.name}
                </option>
              ))}
            </select>
            {fe.payerId && <FieldError>{fe.payerId}</FieldError>}
          </div>
        </fieldset>

        <fieldset className="card p-5">
          <legend className="sr-only">Split</legend>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Split between</h2>
            <div role="radiogroup" aria-label="Split method" className="inline-flex rounded-lg bg-slate-100 p-1">
              {(["EQUAL", "PERCENTAGE"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    method === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {m === "EQUAL" ? "Equally" : "By percentage"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-3 text-xs">
            <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => setParticipantIds(members.map((m) => m.id))}>
              Select everyone
            </button>
            <button type="button" className="font-medium text-slate-500 hover:underline" onClick={() => setParticipantIds([])}>
              Clear
            </button>
            {method === "PERCENTAGE" && (
              <button
                type="button"
                className="ml-auto font-medium text-brand-700 hover:underline"
                onClick={() => setPercents((p) => ({ ...p, ...evenPercentages(selected.map((m) => m.id)) }))}
              >
                Spread evenly
              </button>
            )}
          </div>

          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {members.map((m) => {
              const checked = participantIds.includes(m.id);
              const share = preview.kind === "ok" ? preview.shares.find((s) => s.userId === m.id) : undefined;
              return (
                <li key={m.id} className={`flex items-center gap-3 px-3 py-2.5 ${checked ? "" : "opacity-60"}`}>
                  <input
                    id={`p-${m.id}`}
                    type="checkbox"
                    name="participantIds"
                    value={m.id}
                    checked={checked}
                    onChange={() => toggle(m.id)}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-700"
                  />
                  <label htmlFor={`p-${m.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <Avatar name={m.name} color={m.avatarColor} size="sm" />
                    <span className="truncate text-sm text-slate-800">
                      {m.name}
                      {m.id === payerId && <span className="ml-1 text-xs text-slate-500">(payer)</span>}
                    </span>
                  </label>
                  {method === "PERCENTAGE" && checked && (
                    <div className="relative w-24">
                      <input
                        aria-label={`Percentage for ${m.name}`}
                        name={`percent_${m.id}`}
                        inputMode="decimal"
                        className="input money py-1.5 pr-7 text-right"
                        value={percents[m.id] ?? ""}
                        onChange={(e) => setPercents((p) => ({ ...p, [m.id]: e.target.value }))}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-500">%</span>
                    </div>
                  )}
                  <span className="money w-20 text-right text-sm font-medium text-slate-900">
                    {checked && share ? formatCents(share.shareCents) : checked ? "—" : ""}
                  </span>
                </li>
              );
            })}
          </ul>

          {method === "PERCENTAGE" && (
            <p className={`mt-2 text-right text-xs font-medium ${percentTotal === 10_000 ? "text-emerald-700" : "text-amber-700"}`}>
              Total: {formatBasisPoints(percentTotal)} {percentTotal === 10_000 ? "✓" : "(must be exactly 100%)"}
            </p>
          )}
          {(fe.participants || fe.split) && <FieldError>{fe.participants ?? fe.split}</FieldError>}
          {preview.kind === "error" && !fe.split && <p className="mt-2 text-sm text-rose-700">{preview.message}</p>}
        </fieldset>
      </div>

      <aside className="space-y-4 lg:col-span-2">
        <div className="card p-5 lg:sticky lg:top-20">
          <h2 className="font-semibold text-slate-900">Review &amp; submit</h2>
          <div className="mt-3">
            <label htmlFor="reviewerId" className="label">
              Reviewer
            </label>
            <select
              id="reviewerId"
              name="reviewerId"
              className="input"
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              aria-invalid={fe.reviewerId ? true : undefined}
            >
              {reviewers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.role === "MANAGER" ? " (manager)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {fe.reviewerId ?? "The expense stays pending, and out of balances, until this person approves it. You can't review your own expense."}
            </p>
          </div>

          <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Total</dt>
              <dd className="money font-semibold">{parsedAmount.ok ? formatCents(parsedAmount.cents) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Participants</dt>
              <dd>{selected.length}</dd>
            </div>
            {preview.kind === "ok" && preview.shares.some((s) => s.receivedExtraCent) && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                The total doesn&apos;t divide evenly, so leftover cents go to the largest remainders (ties
                alphabetical):{" "}
                {preview.shares
                  .filter((s) => s.receivedExtraCent)
                  .map((s) => members.find((m) => m.id === s.userId)?.name)
                  .join(", ")}
                .
              </p>
            )}
            {preview.kind === "idle" && <p className="text-xs text-slate-500">{preview.message}</p>}
          </dl>

          {state.error && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {state.error}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Submitting…" : "Submit for review"}
            </button>
            <Link href={`/groups/${groupId}`} className="btn-ghost">
              Cancel
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Other members get an in-app notice. (Prototype: no email is sent.) Receipt upload is not part of this prototype.
          </p>
        </div>
      </aside>
    </form>
  );
}

function FieldError({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <p id={id} className="mt-1 text-xs text-rose-700">
      {children}
    </p>
  );
}
