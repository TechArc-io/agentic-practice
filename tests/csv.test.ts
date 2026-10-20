import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CsvError, formatLedgerCsv, parseLedgerCsv } from "../src/csv.ts";

const HEADER = "date,description,paid_by,amount,currency,split";
const lisbon = readFileSync(new URL("../fixtures/lisbon-trip.csv", import.meta.url), "utf8");

describe("parseLedgerCsv", () => {
  it("reads currency, members and expenses", () => {
    const ledger = parseLedgerCsv(lisbon);
    expect(ledger.currency).toBe("EUR");
    expect(ledger.members).toEqual(["ana", "ben", "chloe", "dev"]);
    expect(ledger.expenses).toHaveLength(5);
  });

  it("reads quoted fields with commas, doubled quotes and line breaks", () => {
    const text = `${HEADER}\n2026-05-03,"Dinner, ""Alfama""\nand port",ben,100.00,EUR,ana;ben\n`;
    expect(parseLedgerCsv(text).expenses[0]?.description).toBe('Dinner, "Alfama"\nand port');
  });

  it("reads weighted splits", () => {
    const text = `${HEADER}\n2026-05-04,Apartment,chloe,900.00,EUR,ana:2;ben:1\n`;
    expect(parseLedgerCsv(text).expenses[0]?.split).toEqual({
      kind: "weighted",
      weights: [
        { member: "ana", weight: 2 },
        { member: "ben", weight: 1 },
      ],
    });
  });

  it("accepts CRLF line endings and skips blank lines", () => {
    const text = `${HEADER}\r\n\r\n2026-05-04,Taxi,ana,12.00,EUR,ana;ben\r\n`;
    expect(parseLedgerCsv(text).expenses).toHaveLength(1);
  });

  it.each([
    ["", "ledger is empty"],
    ["date,amount\n", 'line 1: header must be "date,description,paid_by,amount,currency,split"'],
    [`${HEADER}\n`, "header but no expenses"],
    [`${HEADER}\n2026-05-04,Taxi,ana,12.00,EUR\n`, "line 2: expected 6 fields, found 5"],
    [`${HEADER}\n2026-05-04,Taxi,ana,12.005,EUR,ana\n`, "line 2: \"12.005\" has 3 decimal places"],
    [`${HEADER}\n2026-05-04,Taxi,ana,12.00,XXX,ana\n`, 'line 2: unknown currency "XXX"'],
    [`${HEADER}\n2026-05-04,Taxi,ana,12.00,EUR,ana:2;ben\n`, 'line 2: split entry "ben"'],
    [`${HEADER}\n2026-05-04,"Taxi,ana,12.00,EUR,ana\n`, "line 2: quoted field is not closed"],
  ])("rejects %j with a message naming the line", (text, message) => {
    expect(() => parseLedgerCsv(text)).toThrow(CsvError);
    expect(() => parseLedgerCsv(text)).toThrow(message);
  });

  it("maps ledger validation errors to the CSV line, counting quoted line breaks", () => {
    const text = `${HEADER}\n2026-05-04,"two\nlines",ana,12.00,EUR,ana\n2026-05-05,Bus,ben,0.00,EUR,ben\n`;
    expect(() => parseLedgerCsv(text)).toThrow("line 4: amount must be greater than zero");
  });

  it("rejects rows whose currency differs from the first row", () => {
    const text = `${HEADER}\n2026-05-04,Taxi,ana,12.00,EUR,ana\n2026-05-05,Bus,ben,3.00,USD,ben\n`;
    expect(() => parseLedgerCsv(text)).toThrow("line 3: currency USD does not match");
  });
});

describe("formatLedgerCsv", () => {
  it("writes what parseLedgerCsv reads", () => {
    const ledger = parseLedgerCsv(lisbon);
    expect(parseLedgerCsv(formatLedgerCsv(ledger))).toEqual(ledger);
  });

  it("reproduces a normalized file byte for byte", () => {
    expect(formatLedgerCsv(parseLedgerCsv(lisbon))).toBe(lisbon);
  });
});
