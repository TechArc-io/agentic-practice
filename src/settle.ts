import { balances } from "./ledger.ts";
import type { Ledger } from "./ledger.ts";
import type { Money } from "./money.ts";

/** One payment from a member who owes money to a member who is owed. */
export interface Transfer {
  readonly from: string;
  readonly to: string;
  readonly amount: Money;
}

interface Position {
  readonly member: string;
  remaining: number;
}

/**
 * Returns transfers that bring every balance to zero, using at most one fewer transfer
 * than there are members with a non-zero balance.
 * The largest debtor pays the largest creditor first; ties go to the name that sorts first,
 * so the same ledger always produces the same transfers.
 */
export function settle(ledger: Ledger): Transfer[] {
  const all = balances(ledger);
  const debtors: Position[] = all
    .filter(({ amountMinor }) => amountMinor < 0)
    .map(({ member, amountMinor }) => ({ member, remaining: -amountMinor }));
  const creditors: Position[] = all
    .filter(({ amountMinor }) => amountMinor > 0)
    .map(({ member, amountMinor }) => ({ member, remaining: amountMinor }));

  const transfers: Transfer[] = [];
  for (;;) {
    const debtor = largest(debtors);
    const creditor = largest(creditors);
    if (debtor === undefined || creditor === undefined) {
      return transfers;
    }
    const amountMinor = Math.min(debtor.remaining, creditor.remaining);
    transfers.push({
      from: debtor.member,
      to: creditor.member,
      amount: { amountMinor, currency: ledger.currency },
    });
    debtor.remaining -= amountMinor;
    creditor.remaining -= amountMinor;
  }
}

function largest(positions: readonly Position[]): Position | undefined {
  let best: Position | undefined;
  for (const position of positions) {
    if (position.remaining === 0) {
      continue;
    }
    if (
      best === undefined ||
      position.remaining > best.remaining ||
      (position.remaining === best.remaining && position.member < best.member)
    ) {
      best = position;
    }
  }
  return best;
}
