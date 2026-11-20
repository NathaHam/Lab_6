import { describe, expect, it } from "vitest";
import { allocateEqual, allocatePercentage } from "./split";
import { computeDebts, debtBetween, netByUser } from "./balances";
import { parseAmountToCents, parsePercentToBasisPoints } from "./money";

const people = [
  { id: "c", name: "Cara" },
  { id: "a", name: "Alex" },
  { id: "b", name: "Blake" },
];
const total = (r: ReturnType<typeof allocateEqual>) => (r.ok ? r.shares.reduce((s, x) => s + x.shareCents, 0) : NaN);

describe("parseAmountToCents", () => {
  it("parses exact cents without floats", () => {
    expect(parseAmountToCents("12.5")).toEqual({ ok: true, cents: 1250 });
    expect(parseAmountToCents("$1,234.56")).toEqual({ ok: true, cents: 123456 });
    expect(parseAmountToCents("0")).toEqual({ ok: true, cents: 0 });
    expect(parseAmountToCents("0.1")).toEqual({ ok: true, cents: 10 });
  });
  it("rejects negatives, extra precision and junk", () => {
    expect(parseAmountToCents("-5").ok).toBe(false);
    expect(parseAmountToCents("1.005").ok).toBe(false);
    expect(parseAmountToCents("abc").ok).toBe(false);
    expect(parseAmountToCents("").ok).toBe(false);
  });
});

describe("parsePercentToBasisPoints", () => {
  it("parses up to two decimals", () => {
    expect(parsePercentToBasisPoints("33.33")).toEqual({ ok: true, bp: 3333 });
    expect(parsePercentToBasisPoints("100")).toEqual({ ok: true, bp: 10000 });
    expect(parsePercentToBasisPoints("100.01").ok).toBe(false);
    expect(parsePercentToBasisPoints("-1").ok).toBe(false);
  });
});

describe("allocateEqual", () => {
  it("reconciles exactly and gives leftover cents alphabetically on ties", () => {
    const r = allocateEqual(1000, people); // 333.33… each, 1 cent left
    expect(total(r)).toBe(1000);
    expect(r.ok && r.shares.find((s) => s.receivedExtraCent)?.userId).toBe("a"); // Alex
  });
  it("handles zero-value expenses", () => {
    const r = allocateEqual(0, people);
    expect(r.ok && r.shares.every((s) => s.shareCents === 0)).toBe(true);
  });
  it("rejects no participants and duplicates", () => {
    expect(allocateEqual(100, []).ok).toBe(false);
    expect(allocateEqual(100, [people[0], people[0]]).ok).toBe(false);
  });
  it("fails closed when identical names decide a leftover cent", () => {
    const r = allocateEqual(101, [
      { id: "x", name: "Sam" },
      { id: "y", name: "Sam" },
    ]);
    expect(r.ok).toBe(false);
  });
  it("allows identical names when no cent depends on order", () => {
    expect(allocateEqual(100, [{ id: "x", name: "Sam" }, { id: "y", name: "Sam" }]).ok).toBe(true);
  });
});

describe("allocatePercentage", () => {
  it("requires exactly 100%", () => {
    expect(allocatePercentage(1000, people, { a: 5000, b: 3000, c: 1000 }).ok).toBe(false);
  });
  it("uses largest remainders", () => {
    // 100.01 split 33.33 / 33.33 / 33.34 -> raw 3333.33, 3333.33, 3334.33 (cents)
    const r = allocatePercentage(10001, people, { a: 3333, b: 3333, c: 3334 });
    expect(total(r)).toBe(10001);
    expect(r.ok && Object.fromEntries(r.shares.map((s) => [s.userId, s.shareCents]))).toEqual({ a: 3333, b: 3333, c: 3335 });
  });
});

describe("balances", () => {
  it("counts only shares of non-payers, and payments reduce debts", () => {
    const debts = computeDebts(
      [{ payerId: "a", shares: [{ userId: "a", shareCents: 500 }, { userId: "b", shareCents: 500 }] }],
      [{ payerId: "b", recipientId: "a", amountCents: 200 }],
    );
    expect(debtBetween(debts, "b", "a")).toBe(300);
    expect(debtBetween(debts, "a", "b")).toBe(0);
    expect(netByUser(debts).get("a")).toBe(300);
  });
  it("Alice pays $60 split equally with Bob and Charlie", () => {
    const people = [
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
      { id: "charlie", name: "Charlie" },
    ];
    const split = allocateEqual(6000, people);
    if (!split.ok) throw new Error(split.error);
    const net = netByUser(computeDebts([{ payerId: "alice", shares: split.shares }], []));
    expect(net.get("alice")).toBe(4000);
    expect(net.get("bob")).toBe(-2000);
    expect(net.get("charlie")).toBe(-2000);
    expect([...net.values()].reduce((sum, cents) => sum + cents, 0)).toBe(0);
  });
  it("nets opposite debts between the same pair", () => {
    const debts = computeDebts(
      [
        { payerId: "a", shares: [{ userId: "b", shareCents: 1000 }] },
        { payerId: "b", shares: [{ userId: "a", shareCents: 400 }] },
      ],
      [],
    );
    expect(debts).toEqual([{ fromId: "b", toId: "a", amountCents: 600 }]);
  });
});
