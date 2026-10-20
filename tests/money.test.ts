import { describe, expect, it } from "vitest";

import { MoneyError, formatAmount, formatMoney, parseAmount } from "../src/money.ts";

describe("parseAmount", () => {
  it.each([
    ["12.50", 1250],
    ["12.5", 1250],
    ["12", 1200],
    ["0.07", 7],
    ["0", 0],
  ])("parses %s EUR as %i minor units", (text, amountMinor) => {
    expect(parseAmount(text, "EUR")).toEqual({ amountMinor, currency: "EUR" });
  });

  it("rejects more decimal places than the currency has", () => {
    expect(() => parseAmount("12.505", "EUR")).toThrow(
      '"12.505" has 3 decimal places; EUR allows 2',
    );
  });

  it.each(["", "-1.00", "1,00", "1.", ".5", "1e3", " 1.00"])("rejects %j", (text) => {
    expect(() => parseAmount(text, "EUR")).toThrow(MoneyError);
  });

  it("rejects amounts too large to hold exactly", () => {
    expect(() => parseAmount("90071992547409.93", "EUR")).toThrow("too large");
  });
});

describe("formatAmount and formatMoney", () => {
  it.each([
    [1250, "12.50"],
    [7, "0.07"],
    [0, "0.00"],
    [-1250, "-12.50"],
    [-7, "-0.07"],
  ])("formats %i EUR minor units as %s", (amountMinor, text) => {
    expect(formatAmount({ amountMinor, currency: "EUR" })).toBe(text);
  });

  it("appends the currency code", () => {
    expect(formatMoney({ amountMinor: 3299, currency: "GBP" })).toBe("32.99 GBP");
  });

  it("round-trips with parseAmount", () => {
    for (const text of ["0.01", "9.99", "1000.00", "123456.78"]) {
      expect(formatAmount(parseAmount(text, "USD"))).toBe(text);
    }
  });
});
