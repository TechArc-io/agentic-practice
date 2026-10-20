import { readFileSync } from "node:fs";

export interface Assignment {
  readonly id: string;
  readonly title: string;
  readonly skill: string;
  readonly minutes: number;
  readonly branch: string;
  readonly acceptance: string;
}

export const repositoryRoot = new URL("..", import.meta.url);

/** Reads assignments.json. Throws when an entry is missing a field, naming the entry. */
export function loadCatalog(): Assignment[] {
  const parsed: unknown = JSON.parse(
    readFileSync(new URL("assignments.json", repositoryRoot), "utf8"),
  );
  if (!isRecord(parsed) || !Array.isArray(parsed.assignments)) {
    throw new Error('assignments.json must be an object with an "assignments" array');
  }
  return parsed.assignments.map((entry: unknown, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.title !== "string" ||
      typeof entry.skill !== "string" ||
      typeof entry.minutes !== "number" ||
      typeof entry.branch !== "string" ||
      typeof entry.acceptance !== "string"
    ) {
      throw new Error(`assignments.json: entry ${index} is missing a required field`);
    }
    return {
      id: entry.id,
      title: entry.title,
      skill: entry.skill,
      minutes: entry.minutes,
      branch: entry.branch,
      acceptance: entry.acceptance,
    };
  });
}

/** Finds the assignment for a branch: its exact name, or its name followed by "-" and a suffix. */
export function assignmentForBranch(
  catalog: readonly Assignment[],
  branch: string,
): Assignment | undefined {
  return catalog.find(
    (assignment) => branch === assignment.branch || branch.startsWith(`${assignment.branch}-`),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
