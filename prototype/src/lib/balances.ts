// Pairwise balances (FR-008), derived only from APPROVED expenses and payments.
// Each non-payer participant owes their share to the payer; a payment from A to B
// reduces what A owes B. Pure functions over plain data.

export type BalanceExpense = {
  payerId: string;
  shares: { userId: string; shareCents: number }[];
};
export type BalancePayment = { payerId: string; recipientId: string; amountCents: number };

/** A debt: `fromId` owes `toId` `amountCents` (> 0). */
export type Debt = { fromId: string; toId: string; amountCents: number };

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Net pairwise debts. Expenses passed in must already be filtered to APPROVED. */
export function computeDebts(expenses: BalanceExpense[], payments: BalancePayment[]): Debt[] {
  // net[low|high] > 0 means low owes high.
  const net = new Map<string, number>();
  const add = (debtor: string, creditor: string, cents: number) => {
    if (debtor === creditor || cents === 0) return;
    const key = pairKey(debtor, creditor);
    const sign = debtor < creditor ? 1 : -1;
    net.set(key, (net.get(key) ?? 0) + sign * cents);
  };

  for (const e of expenses) {
    for (const s of e.shares) add(s.userId, e.payerId, s.shareCents);
  }
  for (const p of payments) add(p.recipientId, p.payerId, p.amountCents); // counter-posting

  const debts: Debt[] = [];
  for (const [key, value] of net) {
    if (value === 0) continue;
    const [low, high] = key.split("|");
    debts.push(
      value > 0
        ? { fromId: low, toId: high, amountCents: value }
        : { fromId: high, toId: low, amountCents: -value },
    );
  }
  return debts.sort((a, b) => b.amountCents - a.amountCents);
}

/** How much `fromId` currently owes `toId` (0 if nothing or the reverse). */
export function debtBetween(debts: Debt[], fromId: string, toId: string): number {
  return debts.find((d) => d.fromId === fromId && d.toId === toId)?.amountCents ?? 0;
}

/** Net position per user: positive = is owed money, negative = owes money. */
export function netByUser(debts: Debt[]): Map<string, number> {
  const net = new Map<string, number>();
  for (const d of debts) {
    net.set(d.toId, (net.get(d.toId) ?? 0) + d.amountCents);
    net.set(d.fromId, (net.get(d.fromId) ?? 0) - d.amountCents);
  }
  return net;
}
