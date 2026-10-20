# 05 · One OpenPlanr spec-to-ship loop

Commands in this README were checked against the tools' docs on 2026-10-20.
See [docs/verified-commands.md](../../docs/verified-commands.md).

## Problem

Asked to "add CSV export", an agent picks a format, writes it and calls it done.
Nobody agreed what the columns are or how a comma in a name is escaped until
someone reviews the code. OpenPlanr splits the work: a spec and a plan you
review and commit first, then a separate session that ships against them. The
feature is settlement export as CSV, so another tool can import who pays whom.

## What you start with

- Your fork with the work from 01 to 04.
- `src/cli.ts`, whose `settle` command prints transfers as text and rejects
  unknown options.
- `assignments/05-openplanr-loop/fixtures/quoted-names.csv`: members whose
  names contain a comma and quotes.
- OpenPlanr not installed and no `.planr/` directory.

## Constraints

- Install OpenPlanr, set it up for your agent, and initialize the repository:

  ```bash
  npm install -g openplanr
  openplanr setup --runtime claude --scope user
  openplanr setup --runtime codex --scope user --skill-mode unified-plugin
  openplanr setup --runtime cursor --scope project
  openplanr init
  openplanr doctor
  ```

  Run only the `setup` line for your agent.
- Add the read-only `openplanr-docs` MCP server, and use its `search` tool at
  least once during the loop:

  ```bash
  claude mcp add --transport http openplanr-docs https://openplanr.dev/docs/mcp
  codex mcp add openplanr-docs --url https://openplanr.dev/docs/mcp
  ```

  In Cursor, add `"openplanr-docs": {"url": "https://openplanr.dev/docs/mcp"}`
  under `mcpServers` in `.cursor/mcp.json`. If the server answers HTTP 429, read
  https://openplanr.dev/docs/llms.txt instead.
- Write the spec with `/spec` in Claude Code or `$spec` in Codex, then plan,
  then review the plan yourself and with `plan-review`. Commit the plan under
  `.planr/specs/SPEC-<number>-<slug>/` in its own commit, before any change to
  `src/`.
- Ship in a new session.
- The feature: `node src/cli.ts settle <ledger.csv> --format csv` prints the
  header `from,to,amount,currency`, then one row per transfer in the same order
  as the text output, with the amount formatted without its currency code.
  Quote a field that contains a comma, a double quote or a line break, and
  double any quote inside it. `--format text` is the default. Any other value
  is a usage error with exit code 2.

## Done when

- `npm run check:assignment` passes on branch `assignment/05-openplanr-loop`.
- The PR description includes the transcript of one `openplanr-docs` `search`
  call and what you changed in the plan during your review.

## How it is checked

- CI job "Practice quality", step "Assignment acceptance": runs
  `assignments/05-openplanr-loop/acceptance.test.ts`. It checks that the spec
  folder has a spec, at least one story and tasks that point at it; that the
  commit adding the plan comes before the first commit that changes `src/`;
  and the CSV output on three ledgers, including the quoting fixture. A failure
  names the file or commit.
- Your mentor reads the plan, your review notes and the search transcript.

## Further reading

- OpenPlanr install and first spec: https://openplanr.dev/docs/get-started/install.md (checked 2026-10-20)
- openplanr-docs MCP server: https://openplanr.dev/docs/resources/agents.md (checked 2026-10-20)
- CSV format, RFC 4180: https://www.rfc-editor.org/rfc/rfc4180
- Course: OpenPlanr in practice, and Harness engineering, "Guides and sensors",
  with its Python example of a sensor loop
