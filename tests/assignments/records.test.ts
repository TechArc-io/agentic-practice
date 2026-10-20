import { describe, expect, it } from "vitest";

import { parseRunRecords } from "../../assignments/04-eval-pass-at-k/records.ts";

const record = (trial: number, extra: Record<string, unknown> = {}): string =>
  JSON.stringify({
    task: "add-chf",
    trial,
    agent: "claude-code",
    model: "example",
    timestamp: "2026-10-20T10:00:00Z",
    passed: trial % 2 === 0,
    costUsd: 0.42,
    ...extra,
  });

describe("parseRunRecords", () => {
  it("reads one trial per line and skips blank lines", () => {
    const trials = parseRunRecords([{ file: "evals/runs/a.jsonl", text: `${record(1)}\n\n${record(2)}\n` }]);
    expect(trials).toEqual([
      { task: "add-chf", trial: 1, passed: false },
      { task: "add-chf", trial: 2, passed: true },
    ]);
  });

  it("rejects a (task, trial) pair recorded twice, naming both places", () => {
    expect(() =>
      parseRunRecords([
        { file: "evals/runs/a.jsonl", text: `${record(1)}\n${record(2)}\n` },
        { file: "evals/runs/b.jsonl", text: `${record(2)}\n` },
      ]),
    ).toThrow('evals/runs/b.jsonl:1: task "add-chf" trial 2 is already recorded at evals/runs/a.jsonl:2.');
  });

  it("accepts token counts in place of a cost", () => {
    const text = record(1, { costUsd: undefined, inputTokens: 24763, outputTokens: 122 });
    expect(parseRunRecords([{ file: "evals/runs/a.jsonl", text }])).toHaveLength(1);
  });

  it("requires a cost or both token counts", () => {
    const text = record(1, { costUsd: undefined, inputTokens: 24763 });
    expect(() => parseRunRecords([{ file: "evals/runs/a.jsonl", text }])).toThrow(
      'evals/runs/a.jsonl:1: record "costUsd", or "inputTokens" and "outputTokens"',
    );
  });

  it("names the line of a malformed record", () => {
    expect(() => parseRunRecords([{ file: "evals/runs/a.jsonl", text: `${record(1)}\n{oops` }])).toThrow(
      "evals/runs/a.jsonl:2: not valid JSON.",
    );
  });
});
