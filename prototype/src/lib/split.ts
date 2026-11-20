// Share allocation (FR-004): largest-remainder method on integer cents.
// Leftover cents go to the largest fractional remainders; equal remainders are
// ordered alphabetically by participant name. If two participants with the
// SAME name would be split by that ordering, the allocation is rejected
// (fail closed, HD-10 / OD-01) instead of inventing a tie-break.
//
// Pure and dependency-free so it can be shared by server code and the seed script.

export type SplitParticipant = { id: string; name: string };

export type AllocatedShare = {
  userId: string;
  shareCents: number;
  percentBasisPoints: number | null;
  receivedExtraCent: boolean;
};

export type AllocationResult =
  | { ok: true; shares: AllocatedShare[] }
  | { ok: false; error: string };

export function allocateEqual(amountCents: number, participants: SplitParticipant[]): AllocationResult {
  return allocateWeighted(
    amountCents,
    participants.map((p) => ({ ...p, weight: 1 })),
    null,
  );
}

/** basisPoints: participant id -> basis points (10000 = 100%). Must total exactly 10000. */
export function allocatePercentage(
  amountCents: number,
  participants: SplitParticipant[],
  basisPoints: Record<string, number>,
): AllocationResult {
  let total = 0;
  for (const p of participants) {
    const bp = basisPoints[p.id];
    if (bp === undefined || !Number.isInteger(bp) || bp < 0) {
      return { ok: false, error: `Enter a valid percentage for ${p.name}.` };
    }
    total += bp;
  }
  if (total !== 10_000) {
    return {
      ok: false,
      error: `Percentages must total exactly 100% (currently ${(total / 100).toFixed(2)}%).`,
    };
  }
  return allocateWeighted(
    amountCents,
    participants.map((p) => ({ ...p, weight: basisPoints[p.id] })),
    basisPoints,
  );
}

function allocateWeighted(
  amountCents: number,
  participants: (SplitParticipant & { weight: number })[],
  basisPoints: Record<string, number> | null,
): AllocationResult {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    return { ok: false, error: "Amount must be zero or more." };
  }
  if (participants.length === 0) {
    return { ok: false, error: "Choose at least one participant." };
  }
  if (new Set(participants.map((p) => p.id)).size !== participants.length) {
    return { ok: false, error: "Each participant can only be listed once." };
  }
  const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight <= 0) return { ok: false, error: "At least one participant needs a share." };

  const rows = participants.map((p) => {
    const scaled = amountCents * p.weight; // exact: <= 1e8 * 1e4
    return {
      ...p,
      floor: Math.floor(scaled / totalWeight),
      remainder: scaled % totalWeight,
    };
  });
  const leftover = amountCents - rows.reduce((sum, r) => sum + r.floor, 0);

  const ordered = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );

  // Fail closed when the cut between "gets a cent" and "doesn't" falls between
  // two participants that cannot be told apart (same remainder, same name).
  if (leftover > 0 && leftover < ordered.length) {
    const last = ordered[leftover - 1];
    const next = ordered[leftover];
    if (
      last.remainder === next.remainder &&
      last.name.localeCompare(next.name, "en", { sensitivity: "base" }) === 0
    ) {
      return {
        ok: false,
        error: `Two participants are both named "${last.name}" and the leftover cent cannot be assigned fairly. Adjust the amount or split.`,
      };
    }
  }

  const extra = new Set(ordered.slice(0, leftover).map((r) => r.id));
  const shares = rows.map((r) => ({
    userId: r.id,
    shareCents: r.floor + (extra.has(r.id) ? 1 : 0),
    percentBasisPoints: basisPoints ? basisPoints[r.id] : null,
    receivedExtraCent: extra.has(r.id),
  }));
  return { ok: true, shares };
}
