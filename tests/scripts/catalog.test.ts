import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { assignmentForBranch, loadCatalog } from "../../scripts/catalog.ts";
import { selectAssignment } from "../../scripts/check-assignment.ts";

const catalog = loadCatalog();

describe("assignments.json", () => {
  it("lists five assignments whose README and acceptance test exist", () => {
    expect(catalog.map(({ id }) => id)).toEqual([
      "01-agents-md",
      "02-agent-skill",
      "03-guard-hook",
      "04-eval-pass-at-k",
      "05-openplanr-loop",
    ]);
    for (const { id, branch, acceptance } of catalog) {
      expect(existsSync(`assignments/${id}/README.md`), id).toBe(true);
      expect(existsSync(acceptance), acceptance).toBe(true);
      expect(branch).toBe(`assignment/${id}`);
    }
  });

  it("uses one title for each assignment in its README, the catalog and the root table", () => {
    const table = readFileSync("README.md", "utf8");
    for (const { id, title } of catalog) {
      const heading = readFileSync(`assignments/${id}/README.md`, "utf8").split("\n")[0];
      expect(heading, id).toBe(`# ${id.slice(0, 2)} · ${title}`);
      expect(table, id).toContain(`[${title}](assignments/${id}/README.md)`);
    }
  });
});

describe("assignment selection", () => {
  it("maps a branch, with or without a suffix, to its assignment", () => {
    expect(assignmentForBranch(catalog, "assignment/04-eval-pass-at-k")?.id).toBe("04-eval-pass-at-k");
    expect(assignmentForBranch(catalog, "assignment/04-eval-pass-at-k-v2")?.id).toBe("04-eval-pass-at-k");
    expect(assignmentForBranch(catalog, "assignment/04-eval")).toBeUndefined();
    expect(assignmentForBranch(catalog, "main")).toBeUndefined();
  });

  it("prefers an explicit number or id over the branch", () => {
    expect(selectAssignment(catalog, "02", "assignment/05-openplanr-loop")?.id).toBe("02-agent-skill");
    expect(selectAssignment(catalog, "02-agent-skill", "main")?.id).toBe("02-agent-skill");
    expect(selectAssignment(catalog, undefined, "assignment/05-openplanr-loop")?.id).toBe("05-openplanr-loop");
    expect(selectAssignment(catalog, "9", "main")).toBeUndefined();
  });
});
