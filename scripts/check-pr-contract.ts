import { readFileSync } from "node:fs";

import { reportAnnotations } from "./annotate.ts";
import type { Annotation } from "./annotate.ts";
import { assignmentForBranch, loadCatalog, repositoryRoot } from "./catalog.ts";
import type { Assignment } from "./catalog.ts";

export interface PullRequest {
  readonly title: string;
  readonly headRef: string;
  readonly baseRef: string;
}

const RULES_FILE = "docs/git-workflow.md";
const RULES_HEADING = "## Branch and pull request names";
const TITLE = /^(feat|fix|docs|test|refactor|chore)\(([^)]*)\): (.+)$/;
const MAX_TITLE_LENGTH = 72;

/** Returns one annotation per broken naming rule; an empty list means the pull request passes. */
export function checkPullRequest(
  pr: PullRequest,
  catalog: readonly Assignment[],
  rulesLine: number,
): Annotation[] {
  const problems: string[] = [];
  if (pr.baseRef !== "main") {
    problems.push(`Open the pull request into main of your fork, not "${pr.baseRef}".`);
  }

  const assignment = assignmentForBranch(catalog, pr.headRef);
  if (assignment === undefined) {
    const branches = catalog.map(({ branch }) => branch).join(", ");
    problems.push(
      `Branch "${pr.headRef}" does not name an assignment. Rename it to one of: ${branches}.`,
    );
  }

  const example = `feat(${assignment?.id ?? "01-agents-md"}): add AGENTS.md for tally`;
  const match = TITLE.exec(pr.title);
  if (match === null) {
    problems.push(
      `Title "${pr.title}" must read "<type>(<assignment>): <summary>", for example "${example}". Types: feat, fix, docs, test, refactor, chore.`,
    );
  } else {
    const [, , scope = "", summary = ""] = match;
    if (assignment !== undefined && scope !== assignment.id) {
      problems.push(
        `Title scope "${scope}" does not match branch "${pr.headRef}". Use "${assignment.id}", for example "${example}".`,
      );
    }
    if (summary.endsWith(".")) {
      problems.push("Remove the trailing period from the title.");
    }
  }
  if (pr.title.length > MAX_TITLE_LENGTH) {
    problems.push(
      `Title is ${pr.title.length} characters; shorten it to ${MAX_TITLE_LENGTH} or fewer.`,
    );
  }

  return problems.map((message) => ({
    file: RULES_FILE,
    line: rulesLine,
    title: "Pull request contract",
    message,
  }));
}

function readPullRequest(): PullRequest {
  const { PR_TITLE, PR_HEAD_REF, PR_BASE_REF } = process.env;
  if (PR_TITLE === undefined || PR_HEAD_REF === undefined || PR_BASE_REF === undefined) {
    throw new Error(
      "check-pr-contract needs PR_TITLE, PR_HEAD_REF and PR_BASE_REF; the Practice quality workflow sets them on pull requests",
    );
  }
  return { title: PR_TITLE, headRef: PR_HEAD_REF, baseRef: PR_BASE_REF };
}

function findRulesLine(): number {
  const lines = readFileSync(new URL(RULES_FILE, repositoryRoot), "utf8").split("\n");
  const index = lines.indexOf(RULES_HEADING);
  if (index === -1) {
    throw new Error(`${RULES_FILE} has no "${RULES_HEADING}" heading`);
  }
  return index + 1;
}

if (import.meta.main) {
  reportAnnotations(
    "Pull request contract",
    checkPullRequest(readPullRequest(), loadCatalog(), findRulesLine()),
  );
}
