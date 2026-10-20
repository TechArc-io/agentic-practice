import { lstatSync, readFileSync, realpathSync } from "node:fs";

import { describe, it } from "vitest";

import { check, exists, readRequired, repoPath } from "../support.ts";

const MAX_BYTES = 8 * 1024;
const CREATE = "Create AGENTS.md at the repository root, next to package.json.";
/** Files that make Claude Code read CLAUDE files instead of AGENTS.md. CLAUDE.local.md is gitignored, so only local runs see it. */
const CLAUDE_FILES = ["CLAUDE.md", ".claude/CLAUDE.md", "CLAUDE.local.md"];

function loadsAgentsMd(relative: string): boolean {
  const path = repoPath(relative);
  if (lstatSync(path).isSymbolicLink()) {
    return exists("AGENTS.md") && realpathSync(path) === realpathSync(repoPath("AGENTS.md"));
  }
  return readFileSync(path, "utf8")
    .split("\n")
    .some((text) => text.trim() === "@AGENTS.md");
}

describe("01 · AGENTS.md for tally", () => {
  it("AGENTS.md exists at the repository root and is not empty", () => {
    const content = readRequired("AGENTS.md", CREATE);
    check(content.trim() !== "", "AGENTS.md: the file is empty.");
  });

  it(`AGENTS.md is under ${MAX_BYTES} bytes`, () => {
    const bytes = Buffer.byteLength(readRequired("AGENTS.md", CREATE));
    check(
      bytes < MAX_BYTES,
      `AGENTS.md: ${bytes} bytes; the limit is ${MAX_BYTES}. Keep what every task needs and move procedures into a skill.`,
    );
  });

  it("every npm script AGENTS.md names exists in package.json", () => {
    const lines = readRequired("AGENTS.md", CREATE).split("\n");
    const manifest = JSON.parse(readFileSync(repoPath("package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const scripts = Object.keys(manifest.scripts);
    const missing = lines.flatMap((text, index) =>
      [...text.matchAll(/npm run ([\w:.-]+)/g)]
        .map((match) => match[1] ?? "")
        .filter((name) => !scripts.includes(name))
        .map((name) => `AGENTS.md:${index + 1}: "npm run ${name}" is not a script in package.json`),
    );
    check(
      missing.length === 0,
      `${missing.join("\n")}\nScripts that exist: ${scripts.join(", ")}.`,
    );
  });

  it("a CLAUDE file, when present, imports AGENTS.md or links to it", () => {
    const present = CLAUDE_FILES.filter(exists);
    check(
      present.length === 0 || present.some(loadsAgentsMd),
      `${present.join(", ")}: Claude Code reads these instead of AGENTS.md, and none of them loads it. Add a line containing exactly @AGENTS.md to one of them, or make it a symlink to AGENTS.md.`,
    );
  });
});
