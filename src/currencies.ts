import { TallyError } from "./errors.ts";

/** An ISO 4217 currency and the number of decimal places in its minor unit. */
export interface Currency {
  readonly code: string;
  readonly exponent: number;
  readonly name: string;
}

const CURRENCIES: readonly Currency[] = [
  { code: "EUR", exponent: 2, name: "Euro" },
  { code: "GBP", exponent: 2, name: "Pound sterling" },
  { code: "USD", exponent: 2, name: "US dollar" },
];

const byCode = new Map(CURRENCIES.map((entry) => [entry.code, entry]));

export class UnknownCurrencyError extends TallyError {
  override name = "UnknownCurrencyError";
}

/** Looks up a currency by its ISO 4217 code. Throws UnknownCurrencyError for codes not in the table. */
export function currency(code: string): Currency {
  const found = byCode.get(code);
  if (found === undefined) {
    const supported = CURRENCIES.map((entry) => entry.code).join(", ");
    throw new UnknownCurrencyError(`unknown currency "${code}"; supported: ${supported}`);
  }
  return found;
}
