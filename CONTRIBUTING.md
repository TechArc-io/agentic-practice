# Contributing

This file is for maintainers of `TechArc-io/agentic-practice`. Learners work in
their own forks and do not open pull requests here; see
[docs/git-workflow.md](docs/git-workflow.md).

## Rules for changes

- `npm run check` passes on `main` at all times. The starter contains no
  solution code for any assignment, and every assignment's acceptance test
  fails on `main` with a message that names the file to create or change.
- Reference solutions live in the private `TechArc-io/agentic-practice-solutions`
  repository, one `solution/<assignment-id>` branch each. Never paste solution
  code into this repository, its issues or its pull requests.
- An assignment README keeps the six sections in order: Problem, What you start
  with, Constraints, Done when, How it is checked, Further reading. Its third
  line states the date its commands were checked. `npm run check:verified`
  enforces both.
- A tool command, flag, file name or configuration key that a README tells
  learners to use has a row in [docs/verified-commands.md](docs/verified-commands.md)
  with its source and the date you opened that source. Follow the policy in
  that file.
- `formatAmount` in `src/money.ts` assumes a currency has at least one decimal
  place and prints a zero-exponent amount such as 1500 JPY as `.1500`. This is
  deliberate: no starter currency has exponent 0, and assignment 02 expects
  learners to find and fix it while adding JPY. Do not fix it here.
- Changing an acceptance test, a fixture under `fixtures/hook-payloads/` or the
  report format of assignment 04 changes what learners must build. Update the
  README in the same pull request and rebase the solution branches before the
  next cohort.
- Dependencies are exact versions, published at least 14 days before they are
  added. Do not add one without review.
- Source runs under Node's type stripping, so use erasable TypeScript only: no
  `enum`, no runtime `namespace`, no parameter properties. `tsc` enforces this
  with `erasableSyntaxOnly`.

## Before a cohort starts

1. Re-check every row in `docs/verified-commands.md` against its source.
2. Push a branch per failure mode to a maintainer fork (lint error, type error,
   failing unit test, failing acceptance file, bad pull request title, title
   fixed by an edit) and confirm each run names the check and the file.
3. Confirm every solution branch passes `practice-quality.yml`.
