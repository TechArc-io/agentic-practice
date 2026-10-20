# 01 · AGENTS.md for tally

Commands in this README were checked against the tools' docs on 2026-10-20.
See [docs/verified-commands.md](../../docs/verified-commands.md).

## Problem

An agent dropped into tally reads a few files and guesses the rest. Its guesses
fail in predictable places: it stores 12.50 as a float, splits 10.00 three ways
and loses a cent, or returns transfers in whatever order a `Map` yields them.
The tests catch some of this after the fact. `AGENTS.md` is the file the agent
reads before it writes anything, so it is where you prevent it. It is also paid
for on every turn, so every line has to earn its place.

## What you start with

- Your fork on `main`, with `npm run check` passing.
- tally: `src/` (ledger parsing, splitting, settlement and the CLI), `tests/`,
  and sample ledgers in `fixtures/`.
- No `AGENTS.md`, no `CLAUDE.md` and no `.claude/` directory.

## Constraints

- Put `AGENTS.md` at the repository root, next to `package.json`.
- Keep it under 8 KiB (8,192 bytes). Codex stops reading project instructions
  at `project_doc_max_bytes`, 32 KiB by default; the lower limit makes you
  choose.
- Cover how to install, test, lint and typecheck; the rules about money,
  rounding and determinism that the tests enforce; and what running `.ts` files
  directly in Node 24 means for the syntax you may write.
- Leave out what an agent learns faster by reading the code, such as a file
  list or a restatement of each function.
- Every `npm run` script you name must exist in `package.json`.
- Claude Code reads `AGENTS.md` only when none of `CLAUDE.md`,
  `.claude/CLAUDE.md` and `CLAUDE.local.md` exists. If any of them does, Claude
  reads those files instead, plus what they import. So if you keep one, make it
  import the shared file with a line that reads `@AGENTS.md`, or make it a
  symlink to `AGENTS.md`. `CLAUDE.local.md` is in `.gitignore`, so CI never sees
  it; `npm run check:assignment` on your machine does.
- You may start from a draft that `/init` in Claude Code writes. Cut it to what
  every task needs before you commit it.

## Done when

- `npm run check:assignment` passes on branch `assignment/01-agents-md`.
- You gave the same prompt to two fresh sessions, one on `main` and one on your
  branch: "Add a test to tests/split.test.ts for splitting 100.00 EUR among
  three members." You discarded both edits and wrote in the PR description
  what changed between the two answers.
- The PR description names two things you chose to leave out of `AGENTS.md`
  and why.

## How it is checked

- CI job "Practice quality", step "Assignment acceptance": runs
  `assignments/01-agents-md/acceptance.test.ts`. It checks that the file exists
  at the root and is under the size limit, that each `npm run` script it names
  exists (a failure names the line), and that `CLAUDE.md`, if present, imports
  or links to `AGENTS.md`.
- Your mentor reads the file for the money, rounding and determinism rules,
  and for lines that only restate the code.

## Further reading

- AGENTS.md format: https://agents.md/ (checked 2026-10-20)
- Claude Code, AGENTS.md and CLAUDE.md: https://code.claude.com/docs/en/memory#agents-md (checked 2026-10-20)
- Codex, AGENTS.md discovery and size limit: https://learn.chatgpt.com/docs/agent-configuration/agents-md (checked 2026-10-20)
- Course: Context engineering, "AGENTS.md and Agent Skills: the open standards",
  and its Python example "Where the budget goes in a real session"
