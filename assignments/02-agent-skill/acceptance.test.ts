import { readFileSync, readdirSync } from "node:fs";
import { dirname, normalize } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { parseLedgerCsv } from "../../src/csv.ts";
import { currency } from "../../src/currencies.ts";
import { formatMoney, parseAmount } from "../../src/money.ts";
import { settle } from "../../src/settle.ts";
import { splitEvenly } from "../../src/split.ts";
import { check, exists, repoPath } from "../support.ts";

const SKILL_FOLDERS = [".claude/skills/add-currency", ".agents/skills/add-currency"];
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function skillFile(): string {
  const folder = SKILL_FOLDERS.find((candidate) => exists(`${candidate}/SKILL.md`));
  check(
    folder !== undefined,
    `${SKILL_FOLDERS.map((f) => `${f}/SKILL.md`).join(" and ")}: neither exists. Create the skill in the folder your agent loads.`,
  );
  return `${folder}/SKILL.md`;
}

function frontmatter(file: string): { fields: Record<string, unknown>; body: string } {
  const text = readFileSync(repoPath(file), "utf8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  check(match?.[1] !== undefined, `${file}: must start with YAML frontmatter between two "---" lines.`);
  const fields: unknown = parse(match[1]);
  check(
    typeof fields === "object" && fields !== null && !Array.isArray(fields),
    `${file}: frontmatter must be a YAML mapping with name and description.`,
  );
  return { fields: fields as Record<string, unknown>, body: match[2] ?? "" };
}

function requireCurrency(code: string): void {
  try {
    currency(code);
  } catch (error) {
    throw new Error(
      `src/currencies.ts: ${code} is not supported (${(error as Error).message}). Use your add-currency skill to add it.`,
    );
  }
}

const fixture = (name: string): string =>
  readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");

describe("02 · the add-currency skill", () => {
  it("SKILL.md frontmatter follows the Agent Skills specification", () => {
    const file = skillFile();
    const { fields } = frontmatter(file);
    const { name, description, compatibility } = fields;
    check(typeof name === "string", `${file}: frontmatter needs a "name" field.`);
    check(
      name === "add-currency",
      `${file}: name is "${name}" but the folder is add-currency; they must match.`,
    );
    check(NAME.test(name) && name.length <= 64, `${file}: name must be lowercase letters, digits and single hyphens, at most 64 characters.`);
    check(
      typeof description === "string" && description.trim().length > 0,
      `${file}: frontmatter needs a non-empty "description" that says what the skill does and when to use it.`,
    );
    check(
      description.length <= 1024,
      `${file}: description is ${description.length} characters; the limit is 1024.`,
    );
    check(
      compatibility === undefined || (typeof compatibility === "string" && compatibility.length <= 500),
      `${file}: compatibility must be a string of at most 500 characters.`,
    );
  });

  it("files SKILL.md links to exist and sit at most one folder below it", () => {
    const file = skillFile();
    const folder = dirname(file);
    const links = [...frontmatter(file).body.matchAll(/\]\(([^)\s]+)\)/g)]
      .map((match) => match[1] ?? "")
      .filter((target) => !/^[a-z]+:/i.test(target) && !target.startsWith("#"))
      .map((target) => target.split("#")[0] ?? "");
    for (const target of links) {
      const relative = normalize(target);
      check(
        !relative.startsWith("..") && relative.split("/").length <= 2,
        `${file}: link "${target}" must point inside the skill folder, at most one folder deep (for example references/notes.md).`,
      );
      check(exists(`${folder}/${relative}`), `${file}: links to "${target}", which does not exist in ${folder}/.`);
    }
  });
});

describe("02 · JPY and KWD added with the skill", () => {
  it("the currency table has JPY with exponent 0 and KWD with exponent 3", () => {
    requireCurrency("JPY");
    requireCurrency("KWD");
    expect(currency("JPY").exponent, "src/currencies.ts: JPY has no minor unit").toBe(0);
    expect(currency("KWD").exponent, "src/currencies.ts: KWD has three decimal places").toBe(3);
  });

  it("formats and parses amounts in each currency's minor unit", () => {
    requireCurrency("JPY");
    requireCurrency("KWD");
    expect(formatMoney({ amountMinor: 1500, currency: "JPY" }), "src/money.ts: formatting JPY").toBe("1500 JPY");
    expect(formatMoney({ amountMinor: 7, currency: "JPY" }), "src/money.ts: formatting JPY").toBe("7 JPY");
    expect(formatMoney({ amountMinor: 1234, currency: "KWD" }), "src/money.ts: formatting KWD").toBe("1.234 KWD");
    expect(formatMoney({ amountMinor: -5, currency: "KWD" }), "src/money.ts: formatting KWD").toBe("-0.005 KWD");
    expect(parseAmount("1500", "JPY").amountMinor, "src/money.ts: parsing JPY").toBe(1500);
    expect(parseAmount("1.5", "KWD").amountMinor, "src/money.ts: parsing KWD").toBe(1500);
    expect(() => parseAmount("1500.5", "JPY"), "src/money.ts: JPY has no decimal places").toThrow();
    expect(() => parseAmount("1.2345", "KWD"), "src/money.ts: KWD has three decimal places").toThrow();
  });

  it("splits reconcile in both currencies", () => {
    requireCurrency("JPY");
    requireCurrency("KWD");
    const shares = (text: string, code: string): number[] =>
      splitEvenly(parseAmount(text, code).amountMinor, ["a", "b", "c"]).map((s) => s.amountMinor);
    expect(shares("1000", "JPY"), "splitting 1000 JPY three ways").toEqual([334, 333, 333]);
    expect(shares("1.000", "KWD"), "splitting 1.000 KWD three ways").toEqual([334, 333, 333]);
  });

  it("settles the JPY and KWD fixture ledgers", () => {
    requireCurrency("JPY");
    requireCurrency("KWD");
    const lines = (csv: string): string[] =>
      settle(parseLedgerCsv(csv)).map(({ from, to, amount }) => `${from} pays ${to} ${formatMoney(amount)}`);
    expect(lines(fixture("tokyo-trip.csv")), "settling assignments/02-agent-skill/fixtures/tokyo-trip.csv").toEqual([
      "sofia pays kenji 43988 JPY",
      "mia pays kenji 5135 JPY",
    ]);
    expect(lines(fixture("kuwait-office.csv")), "settling assignments/02-agent-skill/fixtures/kuwait-office.csv").toEqual([
      "noor pays faisal 13.989 KWD",
      "huda pays faisal 0.397 KWD",
    ]);
  });

  it("the unit tests in tests/ cover JPY and KWD", () => {
    const sources = readdirSync(repoPath("tests"), { recursive: true, encoding: "utf8" })
      .filter((name) => name.endsWith(".test.ts"))
      .map((name) => readFileSync(repoPath(`tests/${name}`), "utf8"))
      .join("\n");
    for (const code of ["JPY", "KWD"]) {
      check(
        sources.includes(`"${code}"`),
        `tests/: no unit test mentions "${code}". Your skill's procedure should add tests for formatting, parsing and splitting in the new currency.`,
      );
    }
  });
});
