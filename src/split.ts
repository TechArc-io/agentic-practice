import { TallyError } from "./errors.ts";

/** One member's part of an amount, in minor units. */
export interface Share {
  readonly member: string;
  readonly amountMinor: number;
}

export interface Weight {
  readonly member: string;
  readonly weight: number;
}

export class SplitError extends TallyError {
  override name = "SplitError";
}

/**
 * Splits an amount evenly. Units that do not divide evenly go one at a time to members
 * in the order given, so the shares always add up to the amount.
 */
export function splitEvenly(amountMinor: number, members: readonly string[]): Share[] {
  return splitByWeight(
    amountMinor,
    members.map((member) => ({ member, weight: 1 })),
  );
}

/**
 * Splits an amount in proportion to integer weights. Each member first gets the floor of
 * their exact share; the remaining units go one at a time in the order given.
 */
export function splitByWeight(amountMinor: number, weights: readonly Weight[]): Share[] {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new SplitError(`amount must be a non-negative integer of minor units, got ${amountMinor}`);
  }
  if (weights.length === 0) {
    throw new SplitError("cannot split an amount among no members");
  }
  const seen = new Set<string>();
  for (const { member, weight } of weights) {
    if (seen.has(member)) {
      throw new SplitError(`member "${member}" appears more than once in the split`);
    }
    seen.add(member);
    if (!Number.isSafeInteger(weight) || weight <= 0) {
      throw new SplitError(`weight for "${member}" must be a positive integer, got ${weight}`);
    }
  }

  const totalWeight = weights.reduce((total, { weight }) => total + weight, 0);
  if (!Number.isSafeInteger(amountMinor * totalWeight)) {
    throw new SplitError(`amount ${amountMinor} is too large to split exactly`);
  }

  const shares = weights.map(({ member, weight }) => ({
    member,
    amountMinor: Math.floor((amountMinor * weight) / totalWeight),
  }));
  // Each floor loses less than one unit, so the remainder is smaller than the member count.
  const remainder = amountMinor - shares.reduce((total, share) => total + share.amountMinor, 0);
  return shares.map((share, index) =>
    index < remainder ? { member: share.member, amountMinor: share.amountMinor + 1 } : share,
  );
}
