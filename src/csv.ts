import { TallyError } from "./errors.ts";
import { LedgerError, createLedger } from "./ledger.ts";
import type { Expense, Ledger, SplitRule } from "./ledger.ts";
import { formatAmount, parseAmount } from "./money.ts";

const HEADER = ["date", "description", "paid_by", "amount", "currency", "split"] as const;

export class CsvError extends TallyError {
  override name = "CsvError";
}

interface CsvRecord {
  readonly line: number;
  readonly fields: readonly string[];
}

/**
 * Parses a ledger CSV. The split column lists members separated by ";" for an even split,
 * or "member:weight" pairs for a weighted split. Errors name the line they come from.
 */
export function parseLedgerCsv(text: string): Ledger {
  const [header, ...rows] = parseRecords(text);
  if (header === undefined) {
    throw new CsvError("ledger is empty; the first line must be the header");
  }
  if (header.fields.join(",") !== HEADER.join(",")) {
    throw new CsvError(`line ${header.line}: header must be "${HEADER.join(",")}"`);
  }
  const first = rows[0];
  if (first === undefined) {
    throw new CsvError("ledger has a header but no expenses");
  }
  const ledgerCurrency = first.fields[4] ?? "";

  const expenses = rows.map((record) => atLine(record.line, () => toExpense(record)));
  try {
    return createLedger(ledgerCurrency, expenses);
  } catch (error) {
    if (error instanceof LedgerError && error.expenseIndex !== undefined) {
      const line = rows[error.expenseIndex]?.line;
      throw new CsvError(`line ${line ?? "?"}: ${error.message}`);
    }
    throw error;
  }
}

/** Writes a ledger in the format parseLedgerCsv reads. */
export function formatLedgerCsv(ledger: Ledger): string {
  const lines = [HEADER.join(",")];
  for (const expense of ledger.expenses) {
    lines.push(
      formatRow([
        expense.date,
        expense.description,
        expense.paidBy,
        formatAmount(expense.amount),
        expense.amount.currency,
        formatSplit(expense.split),
      ]),
    );
  }
  return `${lines.join("\n")}\n`;
}

function toExpense({ fields }: CsvRecord): Expense {
  if (fields.length !== HEADER.length) {
    throw new CsvError(`expected ${HEADER.length} fields, found ${fields.length}`);
  }
  const [date = "", description = "", paidBy = "", amount = "", currencyCode = "", split = ""] =
    fields;
  return {
    date,
    description,
    paidBy,
    amount: parseAmount(amount, currencyCode),
    split: parseSplit(split),
  };
}

function parseSplit(text: string): SplitRule {
  const entries = text.split(";").map((entry) => entry.trim());
  if (entries.every((entry) => !entry.includes(":"))) {
    return { kind: "even", members: entries };
  }
  const weights = entries.map((entry) => {
    const match = /^([^:]+):(\d+)$/.exec(entry);
    if (match?.[1] === undefined || match[2] === undefined) {
      throw new CsvError(
        `split entry "${entry}" must be "member:weight" when any entry has a weight`,
      );
    }
    return { member: match[1].trim(), weight: Number(match[2]) };
  });
  return { kind: "weighted", weights };
}

function formatSplit(split: SplitRule): string {
  return split.kind === "even"
    ? split.members.join(";")
    : split.weights.map(({ member, weight }) => `${member}:${weight}`).join(";");
}

function formatRow(fields: readonly string[]): string {
  return fields
    .map((field) => (/[",\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field))
    .join(",");
}

function atLine<T>(line: number, parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof TallyError) {
      throw new CsvError(`line ${line}: ${error.message}`);
    }
    throw error;
  }
}

/** RFC 4180 records: quoted fields may contain commas, doubled quotes and line breaks. Blank lines are skipped. */
function parseRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  const endRecord = (): void => {
    fields.push(field);
    if (fields.length > 1 || fields[0] !== "") {
      records.push({ line: recordLine, fields });
    }
    fields = [];
    field = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (quoted) {
      if (char === '"' && text.charAt(index + 1) === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === "\n") {
          line += 1;
        }
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else if (char === "\n") {
      endRecord();
      line += 1;
      recordLine = line;
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (quoted) {
    throw new CsvError(`line ${recordLine}: quoted field is not closed`);
  }
  endRecord();
  return records;
}
