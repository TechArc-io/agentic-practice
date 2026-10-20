import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { checkAges, checkReadme, parseRegistry } from "../../scripts/check-verified.ts";

const registryFile = "docs/verified-commands.md";
const registry = {
  file: registryFile,
  content: [
    "| Text | Tool | Source | Checked |",
    "| --- | --- | --- | --- |",
    "| `openplanr init` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |",
    "| `codex exec` | Codex | https://learn.chatgpt.com/docs/non-interactive-mode | 2026-08-01 |",
  ].join("\n"),
};

const readme = (body: string): { file: string; content: string } => ({
  file: "assignments/09-example/README.md",
  content: [
    "# 09 · Example",
    "",
    "Commands in this README were checked against the tools' docs on 2026-10-20.",
    "",
    "## Problem",
    "## What you start with",
    "## Constraints",
    body,
    "## Done when",
    "## How it is checked",
    "## Further reading",
  ].join("\n"),
});

describe("parseRegistry", () => {
  it("reads rows with text, source, date and line", () => {
    const { entries, problems } = parseRegistry(registry);
    expect(problems).toEqual([]);
    expect(entries[0]).toEqual({
      text: "openplanr init",
      source: "https://openplanr.dev/docs/get-started/install.md",
      checked: "2026-10-20",
      line: 3,
    });
  });

  it("reports malformed rows and impossible dates", () => {
    const { problems } = parseRegistry({
      file: registryFile,
      content: "| `claude` | Claude Code | not a url | 2026-10-20 |\n| `codex` | Codex | https://x.dev | 2026-02-30 |",
    });
    expect(problems.map(({ line }) => line)).toEqual([1, 2]);
  });
});

describe("checkReadme", () => {
  const registered = new Set(parseRegistry(registry).entries.map(({ text }) => text));

  it("passes a README with the six sections and registered commands", () => {
    expect(checkReadme(readme("```bash\nopenplanr init\nnpm test\n```"), registered)).toEqual([]);
  });

  it("names the line of an unregistered tool command", () => {
    const [problem] = checkReadme(readme("```bash\n$ openplanr doctor --fix\n```"), registered);
    expect(problem).toMatchObject({ file: "assignments/09-example/README.md", line: 9 });
    expect(problem?.message).toContain('"openplanr doctor --fix" has no row');
  });

  it("ignores tool names outside code blocks", () => {
    expect(checkReadme(readme("Run openplanr doctor when setup fails."), registered)).toEqual([]);
  });

  it("reports missing or reordered sections and a missing date line", () => {
    const broken = {
      file: "assignments/09-example/README.md",
      content: "# 09 · Example\n\n## Constraints\n## Problem\n",
    };
    expect(checkReadme(broken, registered).map(({ line }) => line)).toEqual([3, 3]);
  });

  it("passes every assignment README in this repository", () => {
    const all = new Set(
      parseRegistry({ file: registryFile, content: readFileSync(registryFile, "utf8") }).entries.map(
        ({ text }) => text,
      ),
    );
    for (const folder of readdirSync("assignments", { withFileTypes: true }).filter((e) => e.isDirectory())) {
      const file = `assignments/${folder.name}/README.md`;
      expect(checkReadme({ file, content: readFileSync(file, "utf8") }, all), file).toEqual([]);
    }
  });
});

describe("checkAges", () => {
  it("reports rows older than the limit with the source to re-open", () => {
    const { entries } = parseRegistry(registry);
    const problems = checkAges(registryFile, entries, new Date("2026-10-20T12:00:00Z"), 60);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('"codex exec" was last checked on 2026-08-01');
  });
});
