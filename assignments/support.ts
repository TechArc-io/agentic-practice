import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Absolute path of the repository root, with a trailing separator. */
export const root = fileURLToPath(new URL("..", import.meta.url));

export function repoPath(relative: string): string {
  return fileURLToPath(new URL(relative, new URL("..", import.meta.url)));
}

export function exists(relative: string): boolean {
  return existsSync(repoPath(relative));
}

/** Reads a learner file, or throws a message naming the file and what to do. */
export function readRequired(relative: string, whatToDo: string): string {
  if (!exists(relative)) {
    throw new Error(`${relative}: not found. ${whatToDo}`);
  }
  return readFileSync(repoPath(relative), "utf8");
}

/** Throws an Error with the message when the condition is false. */
export function check(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
