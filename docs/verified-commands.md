# Verified commands

Every tool command, flag, file name and configuration key that an assignment
README tells you to use has one row here: the exact text, the tool, the page it
was checked against, and the date someone opened that page and confirmed it.

`npm run check:verified` fails when a command in a code block of an assignment
README starts with `claude`, `codex`, `openplanr`, `opr` or `npx openplanr` and
has no row with the same text. A scheduled job in the upstream repository fails
when a row is more than 60 days old.

## Policy

- Re-check every row before each cohort starts and when a tool ships a new
  major version.
- A row's date changes only after you open its source and confirm the text,
  flags and behavior still match. Changing the date without opening the source
  is not a check.
- When a check finds a change, update the assignment README and this row in
  the same pull request.

## Registry

| Text | Tool | Source | Checked |
| --- | --- | --- | --- |
| `AGENTS.md` | AGENTS.md | https://agents.md/ | 2026-10-20 |
| `@AGENTS.md` | Claude Code | https://code.claude.com/docs/en/memory | 2026-10-20 |
| `/init` | Claude Code | https://code.claude.com/docs/en/memory | 2026-10-20 |
| `project_doc_max_bytes` | Codex | https://learn.chatgpt.com/docs/agent-configuration/agents-md | 2026-10-20 |
| `.claude/skills/add-currency/SKILL.md` | Claude Code | https://code.claude.com/docs/en/skills | 2026-10-20 |
| `/add-currency JPY` | Claude Code | https://code.claude.com/docs/en/skills | 2026-10-20 |
| `.agents/skills/add-currency/SKILL.md` | Codex | https://learn.chatgpt.com/codex/build-skills | 2026-10-20 |
| `$add-currency` | Codex | https://learn.chatgpt.com/codex/build-skills | 2026-10-20 |
| `.agents/skills/` | Cursor | https://cursor.com/docs/context/skills | 2026-10-20 |
| `name` | Agent Skills | https://agentskills.io/specification | 2026-10-20 |
| `description` | Agent Skills | https://agentskills.io/specification | 2026-10-20 |
| `.claude/settings.json` | Claude Code | https://code.claude.com/docs/en/hooks | 2026-10-20 |
| `PreToolUse` | Claude Code | https://code.claude.com/docs/en/hooks | 2026-10-20 |
| `"command": "node", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/guard-bash.ts"]` | Claude Code | https://code.claude.com/docs/en/hooks | 2026-10-20 |
| `exit 2` | Claude Code | https://code.claude.com/docs/en/hooks | 2026-10-20 |
| `.codex/hooks.json` | Codex | https://learn.chatgpt.com/codex/hooks | 2026-10-20 |
| `"type": "command", "command": "node \"$(git rev-parse --show-toplevel)/.claude/hooks/guard-bash.ts\""` | Codex | https://learn.chatgpt.com/codex/hooks | 2026-10-20 |
| `/hooks` | Codex | https://learn.chatgpt.com/codex/hooks | 2026-10-20 |
| `claude -p "<task prompt>" --output-format json --permission-mode acceptEdits --allowedTools "Bash(npm *)"` | Claude Code | https://code.claude.com/docs/en/headless | 2026-10-20 |
| `total_cost_usd` | Claude Code | https://code.claude.com/docs/en/headless | 2026-10-20 |
| `codex exec --json --sandbox workspace-write "<task prompt>"` | Codex | https://learn.chatgpt.com/docs/non-interactive-mode | 2026-10-20 |
| `turn.completed` | Codex | https://learn.chatgpt.com/docs/non-interactive-mode | 2026-10-20 |
| `npm install -g openplanr` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `openplanr setup --runtime claude --scope user` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `openplanr setup --runtime codex --scope user --skill-mode unified-plugin` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `openplanr setup --runtime cursor --scope project` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `openplanr init` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `openplanr doctor` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `/spec` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `$spec` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `plan-review` | OpenPlanr | https://openplanr.dev/docs/get-started/install.md | 2026-10-20 |
| `claude mcp add --transport http openplanr-docs https://openplanr.dev/docs/mcp` | Claude Code | https://openplanr.dev/docs/resources/agents.md | 2026-10-20 |
| `codex mcp add openplanr-docs --url https://openplanr.dev/docs/mcp` | Codex | https://openplanr.dev/docs/resources/agents.md | 2026-10-20 |
| `.cursor/mcp.json` | Cursor | https://openplanr.dev/docs/resources/agents.md | 2026-10-20 |
| `search` | openplanr-docs | https://openplanr.dev/docs/resources/agents.md | 2026-10-20 |
| `https://openplanr.dev/docs/llms.txt` | openplanr-docs | https://openplanr.dev/docs/resources/agents.md | 2026-10-20 |
