import { readFileSync, readdirSync } from "node:fs";
import { parseArgs } from "node:util";

import { reportAnnotations } from "./annotate.ts";
import type { Annotation } from "./annotate.ts";
import { repositoryRoot } from "./catalog.ts";

export const REGISTRY_FILE = "docs/verified-commands.md";

export const README_SECTIONS = [
  "Problem",
  "What you start with",
  "Constraints",
  "Done when",
  "How it is checked",
  "Further reading",
] as const;

const DATE_LINE =
  /^Commands in this README were checked against the tools' docs on (\d{4}-\d{2}-\d{2})\.$/;
const TOOL_COMMAND = /^(claude|codex|openplanr|opr|npx openplanr)(\s|$)/;
const REGISTRY_ROW = /^\| `(.+)` \| ([^|]+) \| (https:\/\/[^\s|]+) \| (\d{4}-\d{2}-\d{2}) \|$/;

export interface RegistryEntry {
  readonly text: string;
  readonly source: string;
  readonly checked: string;
  readonly line: number;
}

export interface Document {
  readonly file: string;
  readonly content: string;
}

/** Reads registry rows. Rows that start like an entry but do not parse are reported. */
export function parseRegistry(registry: Document): {
  entries: RegistryEntry[];
  problems: Annotation[];
} {
  const entries: RegistryEntry[] = [];
  const problems: Annotation[] = [];
  registry.content.split("\n").forEach((text, index) => {
    if (!text.startsWith("| `")) {
      return;
    }
    const match = REGISTRY_ROW.exec(text);
    if (match?.[1] === undefined || match[3] === undefined || match[4] === undefined) {
      problems.push({
        file: registry.file,
        line: index + 1,
        title: "Verified commands",
        message:
          "Registry row must read | `exact text` | Tool | https://source | YYYY-MM-DD |.",
      });
      return;
    }
    if (!isCalendarDate(match[4])) {
      problems.push({
        file: registry.file,
        line: index + 1,
        title: "Verified commands",
        message: `"${match[4]}" is not a calendar date.`,
      });
      return;
    }
    entries.push({ text: match[1], source: match[3], checked: match[4], line: index + 1 });
  });
  return { entries, problems };
}

/** Checks a README's structure and that every tool command in its code blocks has a registry row. */
export function checkReadme(readme: Document, registered: ReadonlySet<string>): Annotation[] {
  const problems: Annotation[] = [];
  const add = (line: number, message: string): void => {
    problems.push({ file: readme.file, line, title: "Assignment README", message });
  };
  const lines = readme.content.split("\n");

  if (!/^# \d{2} · \S/.test(lines[0] ?? "")) {
    add(1, 'The first line must be the title, "# NN · <title>".');
  }
  const dateLine = lines.findIndex((text) => text.startsWith("Commands in this README"));
  const dateMatch = DATE_LINE.exec(lines[dateLine] ?? "");
  if (dateLine !== 2 || dateMatch?.[1] === undefined || !isCalendarDate(dateMatch[1])) {
    add(
      3,
      `Line 3 must read "Commands in this README were checked against the tools' docs on YYYY-MM-DD."`,
    );
  }

  const headings = lines
    .map((text, index) => ({ text, line: index + 1 }))
    .filter(({ text }) => text.startsWith("## "));
  const names = headings.map(({ text }) => text.slice(3));
  if (names.join("|") !== README_SECTIONS.join("|")) {
    add(
      headings[0]?.line ?? 1,
      `Sections must be exactly, in order: ${README_SECTIONS.join("; ")}. Found: ${names.join("; ") || "none"}.`,
    );
  }

  let fenced = false;
  lines.forEach((text, index) => {
    if (text.trimStart().startsWith("```")) {
      fenced = !fenced;
      return;
    }
    const command = text.trim().replace(/^\$ /, "");
    if (fenced && TOOL_COMMAND.test(command) && !registered.has(command)) {
      add(
        index + 1,
        `"${command}" has no row in ${REGISTRY_FILE}. Check it against the tool's docs and add a row with the source URL and date.`,
      );
    }
  });
  return problems;
}

/** Reports registry rows checked more than maxAgeDays before today. */
export function checkAges(
  registryFile: string,
  entries: readonly RegistryEntry[],
  today: Date,
  maxAgeDays: number,
): Annotation[] {
  const dayMs = 24 * 60 * 60 * 1000;
  return entries
    .filter(({ checked }) => (today.getTime() - Date.parse(checked)) / dayMs > maxAgeDays)
    .map(({ text, checked, source, line }) => ({
      file: registryFile,
      line,
      title: "Verified commands",
      message: `"${text}" was last checked on ${checked}, more than ${maxAgeDays} days ago. Open ${source}, re-check it, and update the date.`,
    }));
}

function isCalendarDate(text: string): boolean {
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(text);
}

function readDocument(file: string): Document {
  return { file, content: readFileSync(new URL(file, repositoryRoot), "utf8") };
}

function main(): void {
  const { values } = parseArgs({ options: { "max-age-days": { type: "string" } } });
  const registry = parseRegistry(readDocument(REGISTRY_FILE));
  const registered = new Set(registry.entries.map(({ text }) => text));
  const readmes = readdirSync(new URL("assignments/", repositoryRoot), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readDocument(`assignments/${entry.name}/README.md`));

  const problems = [
    ...registry.problems,
    ...readmes.flatMap((readme) => checkReadme(readme, registered)),
  ];
  const maxAge = values["max-age-days"];
  if (maxAge !== undefined) {
    if (!/^\d+$/.test(maxAge)) {
      throw new Error(`--max-age-days must be a whole number of days, got "${maxAge}"`);
    }
    problems.push(...checkAges(REGISTRY_FILE, registry.entries, new Date(), Number(maxAge)));
  }
  reportAnnotations("Verified commands", problems);
}

if (import.meta.main) {
  main();
}
