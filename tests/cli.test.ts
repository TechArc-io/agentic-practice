import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { USAGE, run } from "../src/cli.ts";

function invoke(args: string[], files: Record<string, string> = {}) {
  let stdout = "";
  let stderr = "";
  const code = run(args, {
    stdout: (text) => (stdout += text),
    stderr: (text) => (stderr += text),
    readFile: (path) => {
      const content = files[path];
      if (content === undefined) {
        return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
      }
      return content;
    },
  });
  return { code, stdout, stderr };
}

describe("tally CLI", () => {
  it("prints the transfers that settle a ledger", () => {
    expect(invoke(["settle", "fixtures/lisbon-trip.csv"])).toEqual({
      code: 0,
      stdout: "ben pays chloe 286.67 EUR\nana pays chloe 76.67 EUR\nana pays dev 46.67 EUR\n",
      stderr: "",
    });
  });

  it("prints aligned, signed balances and omits members at zero", () => {
    expect(invoke(["balances", "fixtures/lisbon-trip.csv"]).stdout).toBe(
      ["ana    -123.34 EUR", "ben    -286.67 EUR", "chloe  +363.34 EUR", "dev     +46.67 EUR", ""].join(
        "\n",
      ),
    );
  });

  it("says so when nobody owes anything", () => {
    expect(invoke(["settle", "fixtures/settled.csv"]).stdout).toBe("Nobody owes anything.\n");
  });

  it("exits 1 with the file and line when the ledger is invalid", () => {
    const bad = "date,description,paid_by,amount,currency,split\n2026-05-04,Taxi,ana,-1,EUR,ana\n";
    expect(invoke(["settle", "bad.csv"], { "bad.csv": bad })).toEqual({
      code: 1,
      stdout: "",
      stderr: 'tally: bad.csv: line 2: "-1" is not a decimal amount such as 12.50\n',
    });
  });

  it.each([[[]], [["settle"]], [["settle", "a.csv", "b.csv"]]])(
    "exits 2 with usage for arguments %j",
    (args) => {
      expect(invoke(args)).toEqual({ code: 2, stdout: "", stderr: USAGE });
    },
  );

  it("exits 2 for an unknown command or option", () => {
    expect(invoke(["split", "fixtures/lisbon-trip.csv"]).stderr).toContain(
      'unknown command "split"',
    );
    const unknownOption = invoke(["settle", "fixtures/lisbon-trip.csv", "--verbose"]);
    expect(unknownOption.code).toBe(2);
    expect(unknownOption.stderr).toContain("Unknown option '--verbose'");
  });

  it("runs as a script under Node", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const output = execFileSync(process.execPath, ["src/cli.ts", "settle", "fixtures/flat-share.csv"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(output).toBe("sam pays priya 559.95 GBP\ntom pays priya 448.33 GBP\n");
  });
});
