import { check } from "../support.ts";

/** One graded trial from evals/runs/. */
export interface Trial {
  readonly task: string;
  readonly trial: number;
  readonly passed: boolean;
}

export interface RunFile {
  readonly file: string;
  readonly text: string;
}

const isCount = (value: unknown): boolean =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/**
 * Parses JSONL run records. Throws with the file and line of the first invalid record,
 * or with both locations when a (task, trial) pair appears twice.
 */
export function parseRunRecords(files: readonly RunFile[]): Trial[] {
  const seen = new Map<string, string>();
  return files.flatMap(({ file, text }) =>
    text
      .split("\n")
      .map((line, index) => ({ line, where: `${file}:${index + 1}` }))
      .filter(({ line }) => line.trim() !== "")
      .map(({ line, where }) => {
        let record: Record<string, unknown>;
        try {
          record = JSON.parse(line) as Record<string, unknown>;
        } catch {
          throw new Error(`${where}: not valid JSON.`);
        }
        const { task, trial, agent, model, timestamp, passed, costUsd, inputTokens, outputTokens } =
          record;
        check(typeof task === "string", `${where}: "task" must be a task id.`);
        check(
          typeof trial === "number" && Number.isInteger(trial) && trial >= 1,
          `${where}: "trial" must be a positive integer.`,
        );
        check(
          typeof agent === "string" && agent !== "",
          `${where}: "agent" must name the agent, for example "claude-code".`,
        );
        check(typeof model === "string" && model !== "", `${where}: "model" must name the model the agent used.`);
        check(
          typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp)),
          `${where}: "timestamp" must be an ISO 8601 date and time.`,
        );
        check(typeof passed === "boolean", `${where}: "passed" must be true or false, from the task's grader.`);
        check(
          (typeof costUsd === "number" && costUsd >= 0) || (isCount(inputTokens) && isCount(outputTokens)),
          `${where}: record "costUsd", or "inputTokens" and "outputTokens", from what the agent reports.`,
        );
        const key = `${task}#${trial}`;
        const first = seen.get(key);
        check(
          first === undefined,
          `${where}: task "${task}" trial ${trial} is already recorded at ${first ?? ""}. Number each task's trials once across all run files.`,
        );
        seen.set(key, where);
        return { task, trial, passed };
      }),
  );
}
