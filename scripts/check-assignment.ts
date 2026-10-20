import { execFileSync } from "node:child_process";

import { startVitest } from "vitest/node";

import { reportAnnotations } from "./annotate.ts";
import { assignmentForBranch, loadCatalog } from "./catalog.ts";
import type { Assignment } from "./catalog.ts";

/**
 * Picks the assignment from an explicit argument ("03" or "03-guard-hook"),
 * else from PR_HEAD_REF, else from the current git branch.
 */
export function selectAssignment(
  catalog: readonly Assignment[],
  argument: string | undefined,
  branch: string,
): Assignment | undefined {
  if (argument !== undefined) {
    return catalog.find(({ id }) => id === argument || id.startsWith(`${argument}-`));
  }
  return assignmentForBranch(catalog, branch);
}

function currentBranch(): string {
  const fromCi = process.env.PR_HEAD_REF;
  if (fromCi !== undefined && fromCi !== "") {
    return fromCi;
  }
  return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
}

async function main(): Promise<void> {
  const catalog = loadCatalog();
  const argument = process.argv[2];
  const branch = currentBranch();
  const assignment = selectAssignment(catalog, argument, branch);
  if (assignment === undefined) {
    const known = catalog.map(({ id }) => id).join(", ");
    reportAnnotations("Assignment acceptance", [
      {
        file: "assignments.json",
        title: "Assignment acceptance",
        message:
          argument === undefined
            ? `${branch === "" ? "A detached HEAD" : `Branch "${branch}"`} is not an assignment branch. Work on assignment/<id>, or run "npm run check:assignment -- <id>" with one of: ${known}.`
            : `"${argument}" is not an assignment. Use one of: ${known}.`,
      },
    ]);
    return;
  }

  console.log(`Assignment ${assignment.id}: running ${assignment.acceptance}`);
  const vitest = await startVitest([], {
    include: [assignment.acceptance],
    watch: false,
  });
  await vitest.close();
}

if (import.meta.main) {
  await main();
}
