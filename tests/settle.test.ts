import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseLedgerCsv } from "../src/csv.ts";
import { balances, createLedger } from "../src/ledger.ts";
import type { Ledger } from "../src/ledger.ts";
import { settle } from "../src/settle.ts";

const fixture = (name: string): Ledger =>
  parseLedgerCsv(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));

const summary = (ledger: Ledger): string[] =>
  settle(ledger).map(({ from, to, amount }) => `${from}->${to} ${amount.amountMinor}`);

describe("settle", () => {
  it("settles the Lisbon trip with three transfers", () => {
    expect(summary(fixture("lisbon-trip.csv"))).toEqual([
      "ben->chloe 28667",
      "ana->chloe 7667",
      "ana->dev 4667",
    ]);
  });

  it("returns no transfers when every balance is zero", () => {
    expect(settle(fixture("settled.csv"))).toEqual([]);
  });

  it("brings every balance to zero", () => {
    for (const name of ["lisbon-trip.csv", "flat-share.csv"]) {
      const ledger = fixture(name);
      const net = new Map(balances(ledger).map(({ member, amountMinor }) => [member, amountMinor]));
      for (const { from, to, amount } of settle(ledger)) {
        net.set(from, (net.get(from) ?? 0) + amount.amountMinor);
        net.set(to, (net.get(to) ?? 0) - amount.amountMinor);
      }
      expect([...net.values()].every((value) => value === 0)).toBe(true);
    }
  });

  it("uses fewer transfers than members with a non-zero balance", () => {
    for (const name of ["lisbon-trip.csv", "flat-share.csv"]) {
      const ledger = fixture(name);
      const open = balances(ledger).filter(({ amountMinor }) => amountMinor !== 0).length;
      expect(settle(ledger).length).toBeLessThan(open);
    }
  });

  it("breaks ties by name, so member order in the file does not change the result", () => {
    const build = (members: string[]): Ledger =>
      createLedger(
        "EUR",
        members.map((paidBy) => ({
          date: "2026-05-02",
          description: "round",
          paidBy,
          amount: { amountMinor: 600, currency: "EUR" },
          split: { kind: "even", members: ["zoe", "yan", "xia", "wes"] },
        })),
      );
    expect(summary(build(["zoe", "yan"]))).toEqual(summary(build(["yan", "zoe"])));
    expect(summary(build(["zoe", "yan"]))).toEqual(["wes->yan 300", "xia->zoe 300"]);
  });

  it("produces identical output on repeated runs", () => {
    const ledger = fixture("flat-share.csv");
    expect(settle(ledger)).toEqual(settle(ledger));
  });
});
