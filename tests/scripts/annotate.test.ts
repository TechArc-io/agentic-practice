import { describe, expect, it } from "vitest";

import { formatAnnotation } from "../../scripts/annotate.ts";

const annotation = {
  file: "assignments/03-guard-hook/README.md",
  line: 12,
  title: "Assignment README",
  message: "Line one\nline two: 100% done, almost",
};

describe("formatAnnotation", () => {
  it("prints file:line: title: message in a terminal", () => {
    expect(formatAnnotation(annotation, false)).toBe(
      "assignments/03-guard-hook/README.md:12: Assignment README: Line one\nline two: 100% done, almost",
    );
  });

  it("prints a GitHub error command with escaped data in Actions", () => {
    expect(formatAnnotation(annotation, true)).toBe(
      "::error file=assignments/03-guard-hook/README.md,line=12,title=Assignment README::Line one%0Aline two: 100%25 done, almost",
    );
  });

  it("escapes commas and colons in properties and defaults the line to 1", () => {
    expect(formatAnnotation({ file: "a,b:c.md", title: "x: y", message: "m" }, true)).toBe(
      "::error file=a%2Cb%3Ac.md,line=1,title=x%3A y::m",
    );
  });
});
