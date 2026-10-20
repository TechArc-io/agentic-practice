import { describe, expect, it } from "vitest";

import { SplitError, splitByWeight, splitEvenly } from "../src/split.ts";

const total = (shares: readonly { amountMinor: number }[]): number =>
  shares.reduce((sum, share) => sum + share.amountMinor, 0);

describe("splitEvenly", () => {
  it("divides an amount that splits exactly", () => {
    expect(splitEvenly(900, ["ana", "ben", "chloe"])).toEqual([
      { member: "ana", amountMinor: 300 },
      { member: "ben", amountMinor: 300 },
      { member: "chloe", amountMinor: 300 },
    ]);
  });

  it("hands remainder units out one at a time in member order", () => {
    expect(splitEvenly(1000, ["ana", "ben", "chloe"]).map((s) => s.amountMinor)).toEqual([
      334, 333, 333,
    ]);
    expect(splitEvenly(1001, ["ana", "ben", "chloe"]).map((s) => s.amountMinor)).toEqual([
      334, 334, 333,
    ]);
  });

  it("gives the remainder to whoever is listed first, not to a fixed member", () => {
    expect(splitEvenly(1000, ["chloe", "ana", "ben"])[0]).toEqual({
      member: "chloe",
      amountMinor: 334,
    });
  });

  it("gives single units to the first members when the amount is smaller than the group", () => {
    expect(splitEvenly(2, ["ana", "ben", "chloe"]).map((s) => s.amountMinor)).toEqual([1, 1, 0]);
  });

  it("always reconciles to the original amount", () => {
    for (let amount = 0; amount < 500; amount += 7) {
      for (let size = 1; size <= 6; size += 1) {
        const members = Array.from({ length: size }, (_, index) => `m${index}`);
        expect(total(splitEvenly(amount, members))).toBe(amount);
      }
    }
  });

  it("rejects an empty group and duplicate members", () => {
    expect(() => splitEvenly(100, [])).toThrow("no members");
    expect(() => splitEvenly(100, ["ana", "ana"])).toThrow('"ana" appears more than once');
  });

  it("rejects negative and fractional amounts", () => {
    expect(() => splitEvenly(-100, ["ana"])).toThrow(SplitError);
    expect(() => splitEvenly(10.5, ["ana"])).toThrow(SplitError);
  });
});

describe("splitByWeight", () => {
  it("splits in proportion to the weights", () => {
    const weights = [
      { member: "ana", weight: 2 },
      { member: "ben", weight: 1 },
      { member: "chloe", weight: 2 },
      { member: "dev", weight: 1 },
    ];
    expect(splitByWeight(90000, weights).map((s) => s.amountMinor)).toEqual([
      30000, 15000, 30000, 15000,
    ]);
  });

  it("floors each share, then hands out the remainder in member order", () => {
    const weights = [
      { member: "priya", weight: 3 },
      { member: "tom", weight: 2 },
      { member: "sam", weight: 2 },
    ];
    const shares = splitByWeight(185000, weights);
    expect(shares.map((s) => s.amountMinor)).toEqual([79286, 52857, 52857]);
    expect(total(shares)).toBe(185000);
  });

  it("rejects weights that are not positive integers", () => {
    expect(() => splitByWeight(100, [{ member: "ana", weight: 0 }])).toThrow(
      'weight for "ana" must be a positive integer',
    );
    expect(() => splitByWeight(100, [{ member: "ana", weight: 1.5 }])).toThrow(SplitError);
  });

  it("refuses amounts whose weighted product would lose precision", () => {
    expect(() =>
      splitByWeight(Number.MAX_SAFE_INTEGER, [
        { member: "ana", weight: 1 },
        { member: "ben", weight: 1 },
      ]),
    ).toThrow("too large");
  });
});
