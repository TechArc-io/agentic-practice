import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { parseLedgerCsv } from "./csv.ts";
import { TallyError } from "./errors.ts";
import { balances } from "./ledger.ts";
import type { Ledger } from "./ledger.ts";
import { formatMoney } from "./money.ts";
import { settle } from "./settle.ts";

export const USAGE = `Usage: node src/cli.ts <command> <ledger.csv>

Commands:
  settle     print the transfers that settle every balance
  balances   print each member's net balance
`;

export interface Io {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly readFile: (path: string) => string;
}

/** Runs one CLI invocation and returns the process exit code: 0 success, 1 bad data, 2 bad usage. */
export function run(args: readonly string[], io: Io): number {
  let positionals: string[];
  try {
    ({ positionals } = parseArgs({ args: [...args], allowPositionals: true, strict: true }));
  } catch (error) {
    if (error instanceof TypeError) {
      io.stderr(`tally: ${error.message}\n\n${USAGE}`);
      return 2;
    }
    throw error;
  }

  const [command, path, ...extra] = positionals;
  if (command === undefined || path === undefined || extra.length > 0) {
    io.stderr(USAGE);
    return 2;
  }
  if (command !== "settle" && command !== "balances") {
    io.stderr(`tally: unknown command "${command}"\n\n${USAGE}`);
    return 2;
  }

  try {
    const ledger = parseLedgerCsv(io.readFile(path));
    const lines =
      command === "settle"
        ? settle(ledger).map(({ from, to, amount }) => `${from} pays ${to} ${formatMoney(amount)}`)
        : formatBalances(ledger);
    io.stdout(lines.length === 0 ? "Nobody owes anything.\n" : `${lines.join("\n")}\n`);
    return 0;
  } catch (error) {
    if (error instanceof TallyError) {
      io.stderr(`tally: ${path}: ${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

function formatBalances(ledger: Ledger): string[] {
  const rows = balances(ledger)
    .filter(({ amountMinor }) => amountMinor !== 0)
    .map(({ member, amountMinor }) => {
      const formatted = formatMoney({ amountMinor, currency: ledger.currency });
      return { member, amount: amountMinor > 0 ? `+${formatted}` : formatted };
    });
  const nameWidth = Math.max(0, ...rows.map(({ member }) => member.length));
  const amountWidth = Math.max(0, ...rows.map(({ amount }) => amount.length));
  return rows.map(({ member, amount }) => `${member.padEnd(nameWidth)}  ${amount.padStart(amountWidth)}`);
}

function readLedgerFile(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new TallyError("no such file");
    }
    throw error;
  }
}

if (import.meta.main) {
  process.exitCode = run(process.argv.slice(2), {
    stdout: (text) => {
      process.stdout.write(text);
    },
    stderr: (text) => {
      process.stderr.write(text);
    },
    readFile: readLedgerFile,
  });
}
