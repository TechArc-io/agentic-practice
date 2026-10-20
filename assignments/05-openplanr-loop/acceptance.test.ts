import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

import { check, exists, repoPath, root } from "../support.ts";

const SPECS = ".planr/specs";

function specFolder(): string {
  check(exists(SPECS), `${SPECS}/: not found. Run the OpenPlanr spec and plan steps, then commit their output.`);
  const folders = readdirSync(repoPath(SPECS)).filter((name) => /^SPEC-\d{3}-/.test(name));
  check(folders.length > 0, `${SPECS}/: no SPEC-<number>-<slug> folder. Run the spec step and commit its output.`);
  return `${SPECS}/${folders.sort()[0] ?? ""}`;
}

function markdown(folder: string, prefix: string): string[] {
  return exists(folder)
    ? readdirSync(repoPath(folder)).filter((name) => name.startsWith(prefix) && name.endsWith(".md"))
    : [];
}

function frontmatter(file: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(repoPath(file), "utf8"));
  check(match?.[1] !== undefined, `${file}: missing YAML frontmatter.`);
  return parse(match[1]) as Record<string, unknown>;
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

function baseRef(): string {
  const candidates = [`origin/${process.env.PR_BASE_REF ?? "main"}`, "main"];
  const found = candidates.find(
    (ref) => spawnSync("git", ["rev-parse", "--verify", "--quiet", ref], { cwd: root }).status === 0,
  );
  check(found !== undefined, `git: neither ${candidates.join(" nor ")} exists. Fetch main with full history.`);
  return found;
}

function settle(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["src/cli.ts", "settle", ...args], { cwd: root, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function settleOk(args: string[]): string {
  const { status, stdout, stderr } = settle(args);
  check(status === 0, `src/cli.ts: "settle ${args.join(" ")}" exited ${status}: ${stderr.trim()}`);
  return stdout;
}

const settleCsv = (ledger: string): string => settleOk([ledger, "--format", "csv"]);

describe("05 · the plan", () => {
  it("has a spec, at least one story, and tasks that point at existing stories", () => {
    const folder = specFolder();
    check(markdown(folder, "SPEC-").length > 0, `${folder}/: no SPEC-*.md file. Commit the spec itself, not only its folder.`);
    const stories = markdown(`${folder}/stories`, "US-");
    check(stories.length > 0, `${folder}/stories/: no US-*.md story. Run the plan step and commit its output.`);
    const tasks = markdown(`${folder}/tasks`, "T-");
    check(tasks.length > 0, `${folder}/tasks/: no T-*.md task. Run the plan step and commit its output.`);
    const storyIds = stories.map((name) => /^(US-\d+)/.exec(name)?.[1]);
    for (const task of tasks) {
      const { storyId } = frontmatter(`${folder}/tasks/${task}`);
      check(
        typeof storyId === "string" && storyIds.includes(storyId),
        `${folder}/tasks/${task}: storyId "${String(storyId)}" does not match a story in ${folder}/stories/.`,
      );
    }
  });

  it("is committed on its own before the first commit that changes src/", () => {
    const base = baseRef();
    const log = git(["log", "--reverse", "--format=commit %H", "--name-only", `${base}..HEAD`]);
    const commits = log
      .split("commit ")
      .filter((block) => block.trim() !== "")
      .map((block) => {
        const [hash = "", ...files] = block.trim().split("\n").filter((line) => line !== "");
        return { hash: hash.slice(0, 8), files };
      });
    const planning = commits.findIndex(({ files }) => files.some((file) => file.startsWith(`${SPECS}/`)));
    const implementation = commits.findIndex(({ files }) => files.some((file) => file.startsWith("src/")));
    check(planning !== -1, `${SPECS}/: no commit on this branch (${base}..HEAD) adds the plan. Commit it before shipping.`);
    check(implementation !== -1, "src/: no commit on this branch changes src/. Ship the feature in its own commit.");
    check(
      planning < implementation,
      `git: commit ${commits[implementation]?.hash ?? ""} changes src/ before or together with the plan in ${commits[planning]?.hash ?? ""}. Commit and review the plan first, then ship.`,
    );
  });
});

describe("05 · settle --format csv", () => {
  it("prints a header and one row per transfer, in the same order as the text output", () => {
    expect(settleCsv("fixtures/lisbon-trip.csv"), "src/cli.ts: CSV output for fixtures/lisbon-trip.csv").toBe(
      "from,to,amount,currency\nben,chloe,286.67,EUR\nana,chloe,76.67,EUR\nana,dev,46.67,EUR\n",
    );
  });

  it("quotes fields that contain commas or quotes", () => {
    const ledger = "assignments/05-openplanr-loop/fixtures/quoted-names.csv";
    expect(settleCsv(ledger), `src/cli.ts: CSV output for ${ledger}`).toBe(
      'from,to,amount,currency\n"Lee ""JJ"" Park","Okafor, Ada",140.00,USD\nRuiz,"Okafor, Ada",20.00,USD\n',
    );
  });

  it("prints only the header when nobody owes anything", () => {
    expect(settleCsv("fixtures/settled.csv"), "src/cli.ts: CSV output for fixtures/settled.csv").toBe(
      "from,to,amount,currency\n",
    );
  });

  it("keeps text as the default and as --format text", () => {
    const text = settleOk(["fixtures/lisbon-trip.csv"]);
    expect(text, "src/cli.ts: default output changed").toBe(
      "ben pays chloe 286.67 EUR\nana pays chloe 76.67 EUR\nana pays dev 46.67 EUR\n",
    );
    expect(settleOk(["fixtures/lisbon-trip.csv", "--format", "text"]), "src/cli.ts: --format text").toBe(text);
  });

  it("rejects an unknown format with exit code 2", () => {
    const { status, stderr } = settle(["fixtures/lisbon-trip.csv", "--format", "xml"]);
    expect(status, 'src/cli.ts: "--format xml" must be a usage error (exit 2)').toBe(2);
    expect(stderr, 'src/cli.ts: the error for "--format xml" must name the option').toContain("--format");
  });
});
