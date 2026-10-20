import { describe, expect, it } from "vitest";

import { loadCatalog } from "../../scripts/catalog.ts";
import { checkPullRequest } from "../../scripts/check-pr-contract.ts";

const catalog = loadCatalog();
const messages = (title: string, headRef: string, baseRef = "main"): string[] =>
  checkPullRequest({ title, headRef, baseRef }, catalog, 30).map(({ message }) => message);

describe("checkPullRequest", () => {
  it("accepts a well-named pull request", () => {
    expect(messages("feat(03-guard-hook): block destructive commands", "assignment/03-guard-hook")).toEqual([]);
  });

  it("accepts a branch with a suffix", () => {
    expect(messages("fix(03-guard-hook): allow git clean -n", "assignment/03-guard-hook-retry")).toEqual([]);
  });

  it("points every problem at the naming rules in docs/git-workflow.md", () => {
    const [annotation] = checkPullRequest(
      { title: "hook", headRef: "assignment/03-guard-hook", baseRef: "main" },
      catalog,
      30,
    );
    expect(annotation).toMatchObject({ file: "docs/git-workflow.md", line: 30 });
  });

  it("rejects a title without type and scope, with an example for the branch", () => {
    expect(messages("Add hook", "assignment/03-guard-hook")).toEqual([
      'Title "Add hook" must read "<type>(<assignment>): <summary>", for example "feat(03-guard-hook): add AGENTS.md for tally". Types: feat, fix, docs, test, refactor, chore.',
    ]);
  });

  it("rejects a scope that does not match the branch", () => {
    expect(messages("feat(02-agent-skill): add hook", "assignment/03-guard-hook")[0]).toContain(
      'Title scope "02-agent-skill" does not match branch "assignment/03-guard-hook"',
    );
  });

  it("rejects branches that name no assignment and lists the valid ones", () => {
    expect(messages("feat(03-guard-hook): add hook", "my-hook")[0]).toContain(
      'Branch "my-hook" does not name an assignment. Rename it to one of: assignment/01-agents-md,',
    );
  });

  it("rejects a base other than main", () => {
    expect(messages("feat(03-guard-hook): add hook", "assignment/03-guard-hook", "develop")).toEqual([
      'Open the pull request into main of your fork, not "develop".',
    ]);
  });

  it("rejects a trailing period and an overlong title", () => {
    expect(messages("feat(03-guard-hook): add hook.", "assignment/03-guard-hook")).toEqual([
      "Remove the trailing period from the title.",
    ]);
    const long = `feat(03-guard-hook): ${"a".repeat(60)}`;
    expect(messages(long, "assignment/03-guard-hook")).toEqual([
      `Title is ${long.length} characters; shorten it to 72 or fewer.`,
    ]);
  });
});
