import { describe, expect, it } from "vitest";

import { LedgerError, balances, createLedger } from "../src/ledger.ts";
import type { Expense, SplitRule } from "../src/ledger.ts";

function expense(paidBy: string, amountMinor: number, split: SplitRule): Expense {
  return {
    date: "2026-05-02",
    description: "test",
    paidBy,
    amount: { amountMinor, currency: "EUR" },
    split,
  };
}

const even = (...members: string[]): SplitRule => ({ kind: "even", members });

function catchError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("expected the action to throw");
}

describe("createLedger", () => {
  it("lists members in order of first appearance", () => {
    const ledger = createLedger("EUR", [
      expense("chloe", 900, even("ana", "chloe")),
      expense("ben", 300, even("ben", "dev")),
    ]);
    expect(ledger.members).toEqual(["chloe", "ana", "ben", "dev"]);
  });

  it("names the index of the first invalid expense", () => {
    const thrown = catchError(() =>
      createLedger("EUR", [expense("ana", 100, even("ana")), expense("ben", 0, even("ana"))]),
    );
    expect(thrown).toBeInstanceOf(LedgerError);
    expect(thrown).toMatchObject({ message: "amount must be greater than zero", expenseIndex: 1 });
  });

  it.each([
    ["2026-02-30", "not a calendar date"],
    ["02/05/2026", "not a calendar date"],
  ])("rejects the date %s", (date, message) => {
    expect(() => createLedger("EUR", [{ ...expense("ana", 100, even("ana")), date }])).toThrow(
      message,
    );
  });

  it("rejects an expense in another currency", () => {
    const usd = { ...expense("ana", 100, even("ana")), amount: { amountMinor: 100, currency: "USD" } };
    expect(() => createLedger("EUR", [usd])).toThrow(
      "currency USD does not match the ledger currency EUR",
    );
  });

  it("reports split problems as ledger errors with the expense index", () => {
    const thrown = catchError(() =>
      createLedger("EUR", [expense("ana", 100, even("ana")), expense("ana", 100, even("ben", "ben"))]),
    );
    expect(thrown).toBeInstanceOf(LedgerError);
    expect(thrown).toMatchObject({ expenseIndex: 1 });
  });

  it("rejects empty payer and member names", () => {
    expect(() => createLedger("EUR", [expense(" ", 100, even("ana"))])).toThrow("paid_by is empty");
    expect(() => createLedger("EUR", [expense("ana", 100, even("ana", ""))])).toThrow(
      "empty member name",
    );
  });
});

describe("balances", () => {
  it("credits the payer and debits each share", () => {
    const ledger = createLedger("EUR", [expense("ana", 900, even("ana", "ben", "chloe"))]);
    expect(balances(ledger)).toEqual([
      { member: "ana", amountMinor: 600 },
      { member: "ben", amountMinor: -300 },
      { member: "chloe", amountMinor: -300 },
    ]);
  });

  it("sums to zero when a split leaves a remainder", () => {
    const ledger = createLedger("EUR", [
      expense("ana", 1000, even("ana", "ben", "chloe")),
      expense("ben", 1001, { kind: "weighted", weights: [
        { member: "chloe", weight: 2 },
        { member: "ana", weight: 1 },
      ] }),
    ]);
    const net = balances(ledger);
    expect(net.reduce((sum, { amountMinor }) => sum + amountMinor, 0)).toBe(0);
    expect(net).toEqual([
      { member: "ana", amountMinor: 1000 - 334 - 333 },
      { member: "ben", amountMinor: 1001 - 333 },
      { member: "chloe", amountMinor: -333 - 668 },
    ]);
  });
});
