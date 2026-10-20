import { describe, expect, it } from "vitest";

import { UnknownCurrencyError, currency } from "../src/currencies.ts";

describe("currency", () => {
  it.each([
    ["EUR", 2],
    ["GBP", 2],
    ["USD", 2],
  ])("knows the minor-unit exponent of %s", (code, exponent) => {
    expect(currency(code).exponent).toBe(exponent);
  });

  it("rejects a code that is not in the table and lists the supported codes", () => {
    expect(() => currency("XXX")).toThrow(UnknownCurrencyError);
    expect(() => currency("XXX")).toThrow('unknown currency "XXX"; supported: EUR, GBP, USD');
  });

  it("is case-sensitive, as ISO 4217 codes are upper case", () => {
    expect(() => currency("eur")).toThrow(UnknownCurrencyError);
  });
});
