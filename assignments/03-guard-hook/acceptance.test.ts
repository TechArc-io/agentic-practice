import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

import { describe, it } from "vitest";

import { check, exists, readRequired, repoPath, root } from "../support.ts";

const HOOK = ".claude/hooks/guard-bash.ts";
const REGISTRATIONS = [".claude/settings.json", ".codex/hooks.json"];
const PAYLOADS = "fixtures/hook-payloads";

interface HookCommand {
  readonly type?: unknown;
  readonly command?: unknown;
  readonly args?: unknown;
}

interface MatcherGroup {
  readonly matcher?: unknown;
  readonly hooks?: readonly HookCommand[];
}

function registersGuard(file: string): boolean {
  const parsed = JSON.parse(readFileSync(repoPath(file), "utf8")) as {
    hooks?: { PreToolUse?: readonly MatcherGroup[] };
  };
  return (parsed.hooks?.PreToolUse ?? []).some(
    (group) =>
      group.matcher === "Bash" &&
      (group.hooks ?? []).some(
        (hook) =>
          hook.type === "command" &&
          JSON.stringify([hook.command, hook.args]).includes("guard-bash.ts"),
      ),
  );
}

function runHook(payload: string): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [repoPath(HOOK)], {
    cwd: root,
    input: payload,
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function payloads(kind: "blocked" | "allowed"): { file: string; payload: string; command: string }[] {
  return readdirSync(repoPath(`${PAYLOADS}/${kind}`))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const file = `${PAYLOADS}/${kind}/${name}`;
      const payload = readFileSync(repoPath(file), "utf8");
      const { tool_input } = JSON.parse(payload) as { tool_input: { command: string } };
      return { file, payload, command: tool_input.command };
    });
}

function requireHook(): void {
  readRequired(HOOK, "Write the hook there and run it with node; see Constraints.");
}

describe("03 · guard-bash hook", () => {
  it("a PreToolUse hook with matcher Bash runs guard-bash.ts", () => {
    const present = REGISTRATIONS.filter((file) => exists(file));
    check(
      present.length > 0,
      `${REGISTRATIONS.join(" and ")}: neither exists. Register the hook under PreToolUse with matcher "Bash".`,
    );
    check(
      present.some(registersGuard),
      `${present.join(", ")}: no PreToolUse entry with matcher "Bash" runs a command hook that names guard-bash.ts.`,
    );
  });

  it("blocks every command in fixtures/hook-payloads/blocked with exit 2 and a reason", () => {
    requireHook();
    const failures = payloads("blocked").flatMap(({ file, payload, command }) => {
      const { status, stderr } = runHook(payload);
      if (status !== 2) {
        const hint = status === 1 ? " Exit 1 does not block; use exit 2." : "";
        return [`${file}: "${command}" got through (exit ${status}).${hint}`];
      }
      const reason = stderr.trim();
      if (reason === "" || reason.includes("\n")) {
        return [`${file}: "${command}" was blocked, but stderr must hold a one-line reason for the agent.`];
      }
      return [];
    });
    check(failures.length === 0, failures.join("\n"));
  });

  it("allows every command in fixtures/hook-payloads/allowed silently", () => {
    requireHook();
    const failures = payloads("allowed").flatMap(({ file, payload, command }) => {
      const { status, stdout, stderr } = runHook(payload);
      if (status !== 0) {
        return [`${file}: "${command}" should run but the hook exited ${status}: ${stderr.trim()}`];
      }
      if (stdout !== "" || stderr !== "") {
        return [`${file}: "${command}" was allowed, but the hook printed output; print nothing when allowing.`];
      }
      return [];
    });
    check(failures.length === 0, failures.join("\n"));
  });
});
