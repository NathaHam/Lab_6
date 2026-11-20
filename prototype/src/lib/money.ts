// Money helpers. All amounts are integer cents; no floating-point math on money.

export const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000.00 prototype bound

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}

/** "12.5" -> 1250. Rejects (never rounds) input with more than 2 decimals. */
export function parseAmountToCents(
  raw: string,
): { ok: true; cents: number } | { ok: false; error: string } {
  const input = raw.trim().replace(/[$,\s]/g, "");
  if (input === "") return { ok: false, error: "Enter an amount." };
  if (input.startsWith("-")) return { ok: false, error: "Amount cannot be negative." };
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(input);
  if (!match) {
    return /^\d+\.\d{3,}$/.test(input)
      ? { ok: false, error: "Use at most 2 decimal places (cents)." }
      : { ok: false, error: "Enter a valid amount, e.g. 42.50." };
  }
  const whole = Number(match[1]);
  const frac = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + frac;
  if (!Number.isSafeInteger(cents) || cents > MAX_AMOUNT_CENTS) {
    return { ok: false, error: "Amount is above the prototype limit of $1,000,000." };
  }
  return { ok: true, cents };
}

/** "33.33" -> 3333 basis points. Up to 2 decimals, 0–100. */
export function parsePercentToBasisPoints(
  raw: string,
): { ok: true; bp: number } | { ok: false; error: string } {
  const input = raw.trim().replace(/%$/, "");
  if (input === "") return { ok: false, error: "Enter a percentage." };
  if (input.startsWith("-")) return { ok: false, error: "Percentages cannot be negative." };
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(input);
  if (!match) return { ok: false, error: "Use a number with at most 2 decimals." };
  const bp = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (bp > 10_000) return { ok: false, error: "A percentage cannot exceed 100." };
  return { ok: true, bp };
}

export function formatBasisPoints(bp: number): string {
  const whole = Math.floor(bp / 100);
  const frac = bp % 100;
  return frac === 0 ? `${whole}%` : `${whole}.${String(frac).padStart(2, "0")}%`;
}
