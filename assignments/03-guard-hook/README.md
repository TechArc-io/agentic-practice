# 03 · A hook that blocks dangerous commands

Commands in this README were checked against the tools' docs on 2026-10-20.
See [docs/verified-commands.md](../../docs/verified-commands.md).

## Problem

Your agent runs shell commands in this repository. One `rm -rf` on the wrong
path or a `git push --force` to main loses work that no review can recover. An
instruction in `AGENTS.md` lowers the odds. A PreToolUse hook makes the command
fail every time.

## What you start with

- Your fork with the `AGENTS.md` from 01 and the add-currency skill from 02.
- `fixtures/hook-payloads/`: Bash tool payloads in the shape Claude Code sends
  on stdin, for example
  `{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"npm test"}}`,
  and some in the shape Codex sends (file names start with `codex-`).
  `blocked/` holds commands the hook must stop; `allowed/` holds commands it
  must let through.
- No `.claude/settings.json` and no hook.

## Constraints

- Write the hook in `.claude/hooks/guard-bash.ts` and run it with Node 24. No
  new dependencies.
- Register it in `.claude/settings.json` under `PreToolUse` with matcher `Bash`,
  in exec form:
  `"command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-bash.ts"]`.
  On Codex, register the same script in `.codex/hooks.json` under `PreToolUse`
  with matcher `Bash`. Codex takes a command string with no `args`, and
  `${CLAUDE_PROJECT_DIR}` is not set there, so resolve the path from the git root:
  `"type": "command", "command": "node \"$(git rev-parse --show-toplevel)/.claude/hooks/guard-bash.ts\""`.
  Then trust the project's `.codex/` layer and review the hook with `/hooks` so
  it loads.
- Block with exit code 2 and a one-line reason on stderr that tells the agent
  what to do instead. Exit 1 does not block.
- Block at least: recursive force deletes (`rm -rf`, `rm -fr`, `rm -r -f`),
  `git push --force` and `-f` without `--force-with-lease`, `git reset --hard`,
  and `git clean -f`, including when chained after `&&` or `;`.
- Allow everything in `fixtures/hook-payloads/allowed/`, such as `npm test`
  and `git status`, and print nothing when you allow.

## Done when

- `npm run check:assignment` passes on branch `assignment/03-guard-hook`.
- In a Claude Code or Codex session in your fork, you ask the agent to
  force-push and the hook blocks it. Paste that part of the transcript into
  the PR.
- The PR description names one command your hook cannot catch and where that
  risk belongs instead.

## How it is checked

- CI job "Practice quality", step "Assignment acceptance": runs
  `assignments/03-guard-hook/acceptance.test.ts`, which checks the
  registration, then spawns your hook once per fixture and checks the exit code
  and output. A failure names the fixture file and the command that got
  through or was wrongly blocked.
- Your mentor reads the transcript and your answer about what the hook cannot
  catch.

## Further reading

- Claude Code hooks reference: https://code.claude.com/docs/en/hooks (checked 2026-10-20)
- Codex hooks: https://learn.chatgpt.com/codex/hooks (checked 2026-10-20)
- Course: The primitives, hands on, "Hooks: the only guarantee", and its Python
  example of a migration guard tested with real payload shapes
- Course: Harness engineering, "Where to put a rule"
