import { currency } from "./currencies.ts";
import { TallyError } from "./errors.ts";

/** An amount as an integer count of the currency's minor unit: 1050 EUR cents is 10.50 EUR. */
export interface Money {
  readonly amountMinor: number;
  readonly currency: string;
}

export class MoneyError extends TallyError {
  override name = "MoneyError";
}

/** Parses a non-negative decimal string such as "12.5" into minor units of the given currency. */
export function parseAmount(text: string, currencyCode: string): Money {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (match?.[1] === undefined) {
    throw new MoneyError(`"${text}" is not a decimal amount such as 12.50`);
  }
  const whole = match[1];
  const fraction = match[2] ?? "";
  const { exponent } = currency(currencyCode);
  if (fraction.length > exponent) {
    throw new MoneyError(
      `"${text}" has ${fraction.length} decimal places; ${currencyCode} allows ${exponent}`,
    );
  }
  const amountMinor = Number(whole + fraction.padEnd(exponent, "0"));
  if (!Number.isSafeInteger(amountMinor)) {
    throw new MoneyError(`"${text}" is too large to represent exactly`);
  }
  return { amountMinor, currency: currencyCode };
}

/** Formats the amount without the currency code, for example "-12.50". */
export function formatAmount(value: Money): string {
  const { exponent } = currency(value.currency);
  const sign = value.amountMinor < 0 ? "-" : "";
  const digits = String(Math.abs(value.amountMinor)).padStart(exponent + 1, "0");
  return `${sign}${digits.slice(0, -exponent)}.${digits.slice(-exponent)}`;
}

/** Formats the amount followed by its currency code, for example "12.50 EUR". */
export function formatMoney(value: Money): string {
  return `${formatAmount(value)} ${value.currency}`;
}
