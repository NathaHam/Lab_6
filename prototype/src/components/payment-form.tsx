"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { recordPayment, type FormState } from "@/lib/actions";
import { formatCents, parseAmountToCents } from "@/lib/money";
import type { Debt } from "@/lib/balances";
import type { MemberSummary } from "@/lib/data";
import { Avatar, EmptyState } from "./ui";
import { Spinner } from "./submit-button";

type Props = {
  groupId: string;
  members: MemberSummary[];
  currentUserId: string;
  /** Debts the current user may settle (they are the debtor or creditor). */
  debts: Debt[];
  initial?: { fromId: string; toId: string };
  today: string;
  commandId: string;
};

const centsToInput = (cents: number) => (cents / 100).toFixed(2);

export function PaymentForm({ groupId, members, currentUserId, debts, initial, today, commandId }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(recordPayment, {});
  const fe = state.fieldErrors ?? {};
  const byId = new Map(members.map((m) => [m.id, m]));

  const initialDebt =
    debts.find((d) => d.fromId === initial?.fromId && d.toId === initial?.toId) ?? debts[0];
  const [selectedKey, setSelectedKey] = useState(initialDebt ? `${initialDebt.fromId}>${initialDebt.toId}` : "");
  const selected = debts.find((d) => `${d.fromId}>${d.toId}` === selectedKey);
  const [amount, setAmount] = useState(initialDebt ? centsToInput(initialDebt.amountCents) : "");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");

  if (debts.length === 0) {
    return (
      <EmptyState
        icon="🎉"
        title="You're all settled up in this group"
        action={
          <Link href={`/groups/${groupId}`} className="btn-secondary">
            Back to group
          </Link>
        }
      >
        You don&apos;t owe anyone and nobody owes you, so there&apos;s nothing to record. In this prototype, only the person
        paying or being paid can record a payment. Switch demo user to settle someone else&apos;s debt.
      </EmptyState>
    );
  }

  const parsed = parseAmountToCents(amount);
  const remaining = selected && parsed.ok ? selected.amountCents - parsed.cents : null;
  const clientError =
    amount && !parsed.ok
      ? parsed.error
      : parsed.ok && parsed.cents === 0
        ? "A payment must be more than $0.00."
        : remaining !== null && remaining < 0
          ? `That's more than the ${formatCents(selected!.amountCents)} owed.`
          : null;
  const label = (id: string) => (id === currentUserId ? "You" : byId.get(id)?.name ?? "Unknown");

  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-6 lg:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="commandId" value={commandId} />
      <input type="hidden" name="payerId" value={selected?.fromId ?? ""} />
      <input type="hidden" name="recipientId" value={selected?.toId ?? ""} />

      <fieldset className="card p-5 lg:col-span-3">
        <legend className="sr-only">Which balance are you settling?</legend>
        <h2 className="font-semibold text-slate-900">Which balance are you settling?</h2>
        <p className="mt-1 text-sm text-slate-500">Balances involving you in this group.</p>
        <ul className="mt-4 space-y-2">
          {debts.map((d) => {
            const key = `${d.fromId}>${d.toId}`;
            const from = byId.get(d.fromId)!;
            const to = byId.get(d.toId)!;
            const checked = key === selectedKey;
            return (
              <li key={key}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    checked ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="debt"
                    value={key}
                    checked={checked}
                    onChange={() => {
                      setSelectedKey(key);
                      setAmount(centsToInput(d.amountCents));
                    }}
                    className="h-4 w-4 accent-brand-700"
                  />
                  <span className="flex items-center -space-x-1">
                    <Avatar name={from.name} color={from.avatarColor} size="sm" />
                    <Avatar name={to.name} color={to.avatarColor} size="sm" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-slate-800">
                    <strong>{label(d.fromId)}</strong> {d.fromId === currentUserId ? "owe" : "owes"}{" "}
                    <strong>{d.toId === currentUserId ? "you" : to.name}</strong>
                  </span>
                  <span className="money font-semibold">{formatCents(d.amountCents)}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {fe.debt && <p className="mt-2 text-sm text-rose-700">{fe.debt}</p>}
      </fieldset>

      <div className="card space-y-4 p-5 lg:col-span-2">
        <div>
          <label htmlFor="amount" className="label">
            Amount paid
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
            <input
              id="amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              className="input money pl-7"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={clientError || fe.amount ? true : undefined}
              aria-describedby="amount-help"
            />
          </div>
          <p id="amount-help" className={`mt-1 text-xs ${clientError || fe.amount ? "text-rose-700" : "text-slate-500"}`}>
            {clientError ??
              fe.amount ??
              (remaining !== null
                ? remaining === 0
                  ? "This settles the balance in full."
                  : `Partial payment: ${formatCents(remaining)} will remain.`
                : "Partial payments are fine; overpayments are rejected.")}
          </p>
          {selected && (
            <button
              type="button"
              className="mt-1 text-xs font-medium text-brand-700 hover:underline"
              onClick={() => setAmount(centsToInput(selected.amountCents))}
            >
              Pay full {formatCents(selected.amountCents)}
            </button>
          )}
        </div>
        <div>
          <label htmlFor="paymentDate" className="label">
            Date
          </label>
          <input
            id="paymentDate"
            name="paymentDate"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={fe.paymentDate ? true : undefined}
          />
          {fe.paymentDate && <p className="mt-1 text-xs text-rose-700">{fe.paymentDate}</p>}
        </div>
        <div>
          <label htmlFor="note" className="label">
            Note <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="note"
            name="note"
            className="input"
            maxLength={120}
            placeholder="e.g. Venmo, cash"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {state.error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Recording…" : "Record payment"}
          </button>
          <Link href={`/groups/${groupId}`} className="btn-ghost">
            Cancel
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          Prototype: this only records that a payment happened. No money is transferred and no payment provider is
          contacted.
        </p>
      </div>
    </form>
  );
}
