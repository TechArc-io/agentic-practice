# 02 · An Agent Skill that adds a currency

Commands in this README were checked against the tools' docs on 2026-10-20.
See [docs/verified-commands.md](../../docs/verified-commands.md).

## Problem

tally supports EUR, GBP and USD, all with two decimal places. The next group
wants to settle a trip to Tokyo in yen, which has no minor unit, and an office
in Kuwait settles in dinars, which have three. Adding a currency touches the
currency table, amount parsing and formatting, and the tests, and code written
when every currency had two decimals tends to assume it. This procedure is
needed a few times a year, so it does not belong in `AGENTS.md`, which every
session pays for. A skill keeps only its description in context until a task
needs the body.

## What you start with

- Your fork with the `AGENTS.md` from 01.
- `src/currencies.ts`: the currency table with three entries.
- `assignments/02-agent-skill/fixtures/`: `tokyo-trip.csv` in JPY and
  `kuwait-office.csv` in KWD. The acceptance test settles both.
- No skill.

## Constraints

- Create the skill folder `add-currency` where your agent loads project skills:
  `.claude/skills/add-currency/SKILL.md` for Claude Code, or
  `.agents/skills/add-currency/SKILL.md` for Codex. Cursor loads both folders.
  One is enough.
- Follow the Agent Skills specification: frontmatter with `name: add-currency`
  (it must match the folder; lowercase letters, digits and single hyphens, at
  most 64 characters) and a `description` of at most 1,024 characters that says
  what the skill does and when to use it.
- Link supporting files with relative paths at most one folder below
  `SKILL.md`, for example `references/iso-4217.md`. Every linked file must exist.
- Write the procedure for any ISO 4217 currency. Do not name JPY or KWD in it.
- Then, in a new session for each, use the skill to add JPY and KWD. Invoke it
  explicitly: `/add-currency JPY` in Claude Code, or `$add-currency` followed by
  the currency in Codex. When the agent gets something wrong, correct
  `SKILL.md` as well as the code.
- No new dependencies.

## Done when

- `npm run check:assignment` passes on branch `assignment/02-agent-skill`.
- The PR description includes the part of a transcript where the agent loaded
  the skill, and one change you made to the skill after watching it run.

## How it is checked

- CI job "Practice quality", step "Assignment acceptance": runs
  `assignments/02-agent-skill/acceptance.test.ts`. It validates the frontmatter
  and the linked files against the specification, then checks JPY and KWD:
  exponents, formatting and parsing, splits that reconcile, settlement of both
  fixture ledgers, and unit tests in `tests/` that cover both codes. Each
  failure names the file to change.
- Your mentor reads `SKILL.md` for whether it would add a third currency
  without help.

## Further reading

- Agent Skills specification: https://agentskills.io/specification (checked 2026-10-20)
- Claude Code skills: https://code.claude.com/docs/en/skills (checked 2026-10-20)
- Codex skills: https://learn.chatgpt.com/codex/build-skills (checked 2026-10-20)
- Cursor skills: https://cursor.com/docs/context/skills (checked 2026-10-20)
- Course: Context engineering, "Just-in-time context and progressive
  disclosure", and its Python example of what a skill costs before and after
  it is needed
