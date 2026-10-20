# 04 · An eval with pass@k reporting

Commands in this README were checked against the tools' docs on 2026-10-20.
See [docs/verified-commands.md](../../docs/verified-commands.md).

## Problem

"It worked when I tried it" is one trial. The same agent, prompt and repository
give different results from run to run, so a single success says little about
how often the agent succeeds. You will build a small eval of real tally tasks,
run each task several times with your own agent, and report two numbers per
task: pass@k, the chance that at least one of k trials passes, and pass^k, the
chance that all k pass. The first tells you whether the agent can do the task;
the second tells you whether you can rely on it.

## What you start with

- Your fork with the work from 01 to 03. The hook from 03 also runs in
  headless sessions.
- No `evals/` directory.

## Constraints

- Use this layout. The acceptance test reads it.

  ```text
  evals/
  ├── passk.ts                     exports passAtK(n, c, k) and passHatK(n, c, k)
  ├── tasks/<task-id>/task.yaml    id (the folder name), prompt, grader
  ├── tasks/<task-id>/<grader>.ts  exits 0 when the trial passed
  ├── runs/*.jsonl                 one JSON object per trial
  └── report.json                  computed from runs/
  ```

- Write at least 6 tasks from real tally work, such as "add CHF" or "reject a
  ledger row dated in the future". Each grader is code that checks the
  outcome, for example by running a test file or the CLI on a fixture. It does
  not check which tools the agent called.
- Run every trial in a clean checkout of the same commit, for example one
  `git worktree` per trial, so trials cannot see each other's edits. Run the
  grader in that checkout.
- Run at least 5 trials per task with your own agent. In Claude Code, `-p`
  sessions deny tool calls that need approval, so allow edits and npm:

  ```bash
  claude -p "<task prompt>" --output-format json --permission-mode acceptEdits --allowedTools "Bash(npm *)"
  ```

  In Codex, `codex exec` is read-only unless you allow writes:

  ```bash
  codex exec --json --sandbox workspace-write "<task prompt>"
  ```

- Write one line per trial to `evals/runs/`: `task`, `trial` (1, 2, ...,
  each number once per task across all files), `agent`, `model`, `timestamp`
  (ISO 8601), `passed`, and what the agent reports about cost: `costUsd`, or
  `inputTokens` and `outputTokens`. Claude Code's JSON has `total_cost_usd`;
  Codex reports token usage on `turn.completed` events and no cost.
- `passAtK(n, c, k)` is the unbiased estimator `1 - C(n-c, k) / C(n, k)` for n
  trials with c passes. `passHatK(n, c, k)` is `C(c, k) / C(n, k)`, the chance
  that k trials drawn from the n all passed. Both throw a `RangeError` unless
  `1 <= k <= n` and `0 <= c <= n`.
- `evals/report.json` has a `k` list that includes 1 and no value above the
  smallest trial count, and one row per task:
  `{"id", "trials", "successes", "passAtK": {"1": ...}, "passHatK": {"1": ...}}`.
  Generate it from `evals/runs/` with a script; do not edit it by hand.
- CI never calls a model, and no API key goes in the repository.

## Done when

- `npm run check:assignment` passes on branch `assignment/04-eval-pass-at-k`.
- The PR description names the task where pass@k and pass^k differ most and
  says what that means for using the agent on it, and gives the cost or tokens
  per passing trial.

## How it is checked

- CI job "Practice quality", step "Assignment acceptance": runs
  `assignments/04-eval-pass-at-k/acceptance.test.ts`. It unit-tests your
  estimators, checks the task folders and run records (including duplicate
  trials and the cost or token fields), and recomputes the
  report from `evals/runs/` with your estimators. A failure names the file and,
  for the report, the task and value that differ.
- Your mentor reads two of your graders for whether they check the outcome.

## Further reading

- Claude Code headless mode: https://code.claude.com/docs/en/headless (checked 2026-10-20)
- Codex non-interactive mode: https://learn.chatgpt.com/docs/non-interactive-mode (checked 2026-10-20)
- Anthropic, Demystifying evals for AI agents: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Course: Proving it works, "pass@k and pass^k: capability versus
  consistency", and its Python example of the same agent as k grows
