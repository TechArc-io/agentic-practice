import { currency } from "./currencies.ts";
import { TallyError } from "./errors.ts";
import type { Money } from "./money.ts";
import { SplitError, splitByWeight, splitEvenly } from "./split.ts";
import type { Share, Weight } from "./split.ts";

/** How an expense is shared. Member order decides who receives remainder units. */
export type SplitRule =
  | { readonly kind: "even"; readonly members: readonly string[] }
  | { readonly kind: "weighted"; readonly weights: readonly Weight[] };

export interface Expense {
  readonly date: string;
  readonly description: string;
  readonly paidBy: string;
  readonly amount: Money;
  readonly split: SplitRule;
}

/** A single-currency group ledger. Members are listed in order of first appearance. */
export interface Ledger {
  readonly currency: string;
  readonly members: readonly string[];
  readonly expenses: readonly Expense[];
}

/** A member's net position: positive when the group owes them, negative when they owe the group. */
export interface Balance {
  readonly member: string;
  readonly amountMinor: number;
}

export class LedgerError extends TallyError {
  override name = "LedgerError";
  /** Zero-based index of the offending expense, when the error concerns one expense. */
  readonly expenseIndex: number | undefined;

  constructor(message: string, expenseIndex?: number) {
    super(message);
    this.expenseIndex = expenseIndex;
  }
}

/** Validates the expenses and builds a ledger. Throws LedgerError naming the first invalid expense. */
export function createLedger(currencyCode: string, expenses: readonly Expense[]): Ledger {
  currency(currencyCode);
  const members: string[] = [];
  const addMember = (member: string): void => {
    if (!members.includes(member)) {
      members.push(member);
    }
  };

  expenses.forEach((expense, index) => {
    const problem = findProblem(expense, currencyCode);
    if (problem !== undefined) {
      throw new LedgerError(problem, index);
    }
    addMember(expense.paidBy);
    for (const share of sharesAt(expense, index)) {
      addMember(share.member);
    }
  });

  return { currency: currencyCode, members, expenses };
}

/** Each participant's part of one expense, in minor units. */
export function shares(expense: Expense): Share[] {
  const { amountMinor } = expense.amount;
  return expense.split.kind === "even"
    ? splitEvenly(amountMinor, expense.split.members)
    : splitByWeight(amountMinor, expense.split.weights);
}

/** Net balance per member, in ledger member order. The balances always sum to zero. */
export function balances(ledger: Ledger): Balance[] {
  const net = new Map(ledger.members.map((member) => [member, 0]));
  const change = (member: string, delta: number): void => {
    net.set(member, (net.get(member) ?? 0) + delta);
  };
  for (const expense of ledger.expenses) {
    change(expense.paidBy, expense.amount.amountMinor);
    for (const share of shares(expense)) {
      change(share.member, -share.amountMinor);
    }
  }
  return ledger.members.map((member) => ({ member, amountMinor: net.get(member) ?? 0 }));
}

function sharesAt(expense: Expense, index: number): Share[] {
  try {
    return shares(expense);
  } catch (error) {
    if (error instanceof SplitError) {
      throw new LedgerError(error.message, index);
    }
    throw error;
  }
}

function findProblem(expense: Expense, currencyCode: string): string | undefined {
  if (!isCalendarDate(expense.date)) {
    return `date "${expense.date}" is not a calendar date in YYYY-MM-DD form`;
  }
  if (expense.paidBy.trim() === "") {
    return "paid_by is empty";
  }
  if (expense.amount.currency !== currencyCode) {
    return `currency ${expense.amount.currency} does not match the ledger currency ${currencyCode}`;
  }
  if (expense.amount.amountMinor <= 0) {
    return "amount must be greater than zero";
  }
  const participants =
    expense.split.kind === "even"
      ? expense.split.members
      : expense.split.weights.map(({ member }) => member);
  if (participants.some((member) => member.trim() === "")) {
    return "split contains an empty member name";
  }
  return undefined;
}

function isCalendarDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(text);
}
