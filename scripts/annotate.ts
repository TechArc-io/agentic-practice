import { appendFileSync } from "node:fs";

/** A failed check, pointed at the file and line the learner should change. */
export interface Annotation {
  readonly file: string;
  readonly line?: number;
  readonly title: string;
  readonly message: string;
}

const escapeData = (text: string): string =>
  text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");

const escapeProperty = (text: string): string =>
  escapeData(text).replaceAll(":", "%3A").replaceAll(",", "%2C");

/**
 * Formats an annotation as a GitHub workflow command when running in Actions,
 * and as "file:line: title: message" in a terminal.
 */
export function formatAnnotation(annotation: Annotation, inActions: boolean): string {
  const line = annotation.line ?? 1;
  if (!inActions) {
    return `${annotation.file}:${line}: ${annotation.title}: ${annotation.message}`;
  }
  const properties = [
    `file=${escapeProperty(annotation.file)}`,
    `line=${line}`,
    `title=${escapeProperty(annotation.title)}`,
  ].join(",");
  return `::error ${properties}::${escapeData(annotation.message)}`;
}

/**
 * Prints every annotation, adds them to the job summary in Actions, and sets a failing
 * exit code when there is at least one.
 */
export function reportAnnotations(check: string, annotations: readonly Annotation[]): void {
  const inActions = process.env.GITHUB_ACTIONS === "true";
  for (const annotation of annotations) {
    console.log(formatAnnotation(annotation, inActions));
  }
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (inActions && summaryPath !== undefined && annotations.length > 0) {
    const rows = annotations.map(
      (a) => `| \`${a.file}:${a.line ?? 1}\` | ${a.message.replaceAll("|", "\\|")} |`,
    );
    appendFileSync(
      summaryPath,
      [`### ${check} failed`, "", "| File | Problem |", "| --- | --- |", ...rows, ""].join("\n"),
    );
  }
  if (annotations.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(`${check}: passed`);
  }
}
