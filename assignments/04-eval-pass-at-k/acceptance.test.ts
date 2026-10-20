import { readFileSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { check, exists, readRequired, repoPath } from "../support.ts";
import { parseRunRecords } from "./records.ts";
import type { Trial } from "./records.ts";

const MIN_TASKS = 6;
const MIN_TRIALS = 5;
const TOLERANCE = 0.00005;

type Estimator = (n: number, c: number, k: number) => number;

async function estimators(): Promise<{ passAtK: Estimator; passHatK: Estimator }> {
  readRequired("evals/passk.ts", "Export passAtK(n, c, k) and passHatK(n, c, k) from it.");
  const module = (await import(pathToFileURL(repoPath("evals/passk.ts")).href)) as Record<string, unknown>;
  const { passAtK, passHatK } = module;
  check(typeof passAtK === "function", "evals/passk.ts: export a function named passAtK.");
  check(typeof passHatK === "function", "evals/passk.ts: export a function named passHatK.");
  return { passAtK: passAtK as Estimator, passHatK: passHatK as Estimator };
}

function taskIds(): string[] {
  check(exists("evals/tasks"), "evals/tasks/: not found. Create one folder per task, each with a task.yaml.");
  return readdirSync(repoPath("evals/tasks"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readTrials(): Trial[] {
  check(exists("evals/runs"), "evals/runs/: not found. Commit the JSONL run records from your trials.");
  const files = readdirSync(repoPath("evals/runs")).filter((name) => name.endsWith(".jsonl"));
  check(files.length > 0, "evals/runs/: no .jsonl files. Commit the run records from your trials.");
  return parseRunRecords(
    files.sort().map((name) => ({
      file: `evals/runs/${name}`,
      text: readFileSync(repoPath(`evals/runs/${name}`), "utf8"),
    })),
  );
}

describe("04 · pass@k and pass^k estimators", () => {
  it("passAtK is the unbiased estimator 1 - C(n-c, k) / C(n, k)", async () => {
    const { passAtK } = await estimators();
    const cases: [number, number, number, number][] = [
      [10, 0, 1, 0],
      [10, 10, 5, 1],
      [5, 1, 1, 0.2],
      [10, 3, 3, 1 - 35 / 120],
      [5, 2, 4, 1],
      [20, 5, 10, 1 - 3003 / 184756],
    ];
    for (const [n, c, k, expected] of cases) {
      expect(passAtK(n, c, k), `evals/passk.ts: passAtK(${n}, ${c}, ${k})`).toBeCloseTo(expected, 10);
    }
  });

  it("passHatK is C(c, k) / C(n, k), the chance that k trials all pass", async () => {
    const { passHatK } = await estimators();
    const cases: [number, number, number, number][] = [
      [10, 3, 3, 1 / 120],
      [5, 5, 5, 1],
      [5, 4, 5, 0],
      [10, 7, 1, 0.7],
      [10, 0, 2, 0],
    ];
    for (const [n, c, k, expected] of cases) {
      expect(passHatK(n, c, k), `evals/passk.ts: passHatK(${n}, ${c}, ${k})`).toBeCloseTo(expected, 10);
    }
  });

  it("both reject impossible inputs with a RangeError", async () => {
    const { passAtK, passHatK } = await estimators();
    for (const [n, c, k] of [[5, 2, 6], [5, 6, 1], [5, -1, 1], [5, 2, 0]] as const) {
      expect(() => passAtK(n, c, k), `evals/passk.ts: passAtK(${n}, ${c}, ${k})`).toThrow(RangeError);
      expect(() => passHatK(n, c, k), `evals/passk.ts: passHatK(${n}, ${c}, ${k})`).toThrow(RangeError);
    }
  });
});

describe("04 · tasks, runs and report", () => {
  it(`evals/tasks has at least ${MIN_TASKS} tasks, each with a prompt and a code grader`, () => {
    const ids = taskIds();
    check(ids.length >= MIN_TASKS, `evals/tasks/: found ${ids.length} tasks; add at least ${MIN_TASKS}.`);
    for (const id of ids) {
      const file = `evals/tasks/${id}/task.yaml`;
      const task: unknown = parse(readRequired(file, "Each task folder needs a task.yaml with id, prompt and grader."));
      check(typeof task === "object" && task !== null, `${file}: must be a YAML mapping.`);
      const { id: declared, prompt, grader } = task as Record<string, unknown>;
      check(declared === id, `${file}: id is "${String(declared)}"; it must match the folder name "${id}".`);
      check(typeof prompt === "string" && prompt.trim() !== "", `${file}: "prompt" must be the text you send to the agent.`);
      check(typeof grader === "string" && grader.endsWith(".ts"), `${file}: "grader" must name a TypeScript file in the task folder.`);
      check(exists(`evals/tasks/${id}/${grader}`), `${file}: grader "${grader}" does not exist in evals/tasks/${id}/.`);
    }
  });

  it(`every task has at least ${MIN_TRIALS} recorded trials`, () => {
    const ids = taskIds();
    const trials = readTrials();
    for (const { task } of trials) {
      check(ids.includes(task), `evals/runs/: a record names task "${task}", which has no folder in evals/tasks/.`);
    }
    for (const id of ids) {
      const count = new Set(trials.filter(({ task }) => task === id).map(({ trial }) => trial)).size;
      check(count >= MIN_TRIALS, `evals/runs/: task "${id}" has ${count} trials; run at least ${MIN_TRIALS}.`);
    }
  });

  it("evals/report.json matches the report recomputed from evals/runs", async () => {
    const { passAtK, passHatK } = await estimators();
    const report = JSON.parse(
      readRequired("evals/report.json", "Generate it from evals/runs/ with your report script."),
    ) as { k?: unknown; tasks?: unknown };
    check(
      Array.isArray(report.k) && report.k.includes(1) && report.k.every((k) => Number.isInteger(k)),
      'evals/report.json: "k" must be a list of integers that includes 1.',
    );
    check(Array.isArray(report.tasks), 'evals/report.json: "tasks" must be a list.');
    const ks = report.k as number[];
    const committed = new Map(
      (report.tasks as Record<string, unknown>[]).map((row) => [row.id, row]),
    );
    const trials = readTrials();
    for (const id of taskIds()) {
      const row = committed.get(id);
      check(row !== undefined, `evals/report.json: task "${id}" is missing.`);
      const own = trials.filter(({ task }) => task === id);
      const n = own.length;
      const c = own.filter(({ passed }) => passed).length;
      check(row.trials === n, `evals/report.json: task "${id}" has trials ${String(row.trials)}; evals/runs/ has ${n}.`);
      check(row.successes === c, `evals/report.json: task "${id}" has successes ${String(row.successes)}; evals/runs/ has ${c}.`);
      for (const [field, estimate] of [["passAtK", passAtK], ["passHatK", passHatK]] as const) {
        const values = row[field] as Record<string, unknown> | undefined;
        for (const k of ks) {
          check(k <= n, `evals/report.json: k=${k} is larger than the ${n} trials of task "${id}".`);
          const expected = estimate(n, c, k);
          const actual = values?.[String(k)];
          check(
            typeof actual === "number" && Math.abs(actual - expected) <= TOLERANCE,
            `evals/report.json: task "${id}" ${field}["${k}"] is ${String(actual)}; evals/runs/ gives ${expected.toFixed(4)}. Regenerate the report.`,
          );
        }
      }
    }
  });
});
