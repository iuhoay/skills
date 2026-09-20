# iuhoay/skills

A collection of development workflow skills for coding agents.

[![skills.sh](https://skills.sh/b/iuhoay/skills)](https://skills.sh/iuhoay/skills)

## Available Skills

### Vanilla Rails

Default architecture when writing Rails, from Vanilla Rails / 37signals/Basecamp.

**Agent skill:** `vanilla-rails` (auto-loaded on Rails implementation)

Based on [Fizzy](https://github.com/basecamp/fizzy): thin controllers, rich domain models, no service layers unless genuinely justified. "Vanilla Rails is plenty" - DHH.

### Rails Dependencies

Configure recommended Rails development dependencies for better developer experience.

**Agent skill:** `rails-deps`

Recommended gems: strong_migrations, herb, bullet, letter_opener.

### Linear

Manage Linear issues without MCP through a bundled, JSON-first CLI that calls Linear's GraphQL API directly.

**Agent skill:** `linear`

The CLI supports OAuth 2.0 + PKCE login with automatic token refresh, issue search/read/create/update, comments, and a raw GraphQL escape hatch. Credentials are stored in macOS Keychain or a mode-0600 config file; `LINEAR_API_KEY` remains an optional fallback.

### Question It

Automatically challenges your plans and decision-laden questions — question the question, verify against facts from the codebase, and give a better alternative.

**Agent skill:** `question-it` (auto-triggered)

Every question carries hidden assumptions, so it questions the question first. Every challenge is grounded in facts from the environment (code, git history, configs) — never hollow "have you considered X" — and comes with a concrete better alternative and its cost. One point at a time; nothing is acted on without your confirmation. Adapted from [mattpocock/skills](https://github.com/mattpocock/skills).

### Stop Spam PR

Stop spam PRs: only the change required for the request to be correct and green, written in the repo's own commit/PR voice.

**Agent skill:** `not-spam-pr` (auto-triggered on implement/fix and on commit/PR text)

No drive-by refactors, extra files, or templated "This PR" bodies. On the request path, change or delete existing code rather than wrapping it. Match `git log`. Skip reviews, planning, gh-stack mechanics, and extras the user explicitly asked for.

### GitHub Stacked PRs

Manage stacked pull requests with the official `gh stack` extension — split a large change into a chain of dependent PRs.

**Agent skill:** `gh-stack`

Create stacks (`init`/`add`), submit PR chains (`submit`), keep them in sync (`sync`), land them (`merge`), and navigate (`bottom`/`top`/`up`/`down`/`trunk`). Agent-friendly details: `submit --auto` skips the interactive editor, `view --json` gives machine-readable state, exit codes 0-10 drive recovery, and `link` works without local tracking for external tools like jj or Sapling. Ships references on layer design, per-command behavior, and troubleshooting.

### Herdr Subagents

Spawn and coordinate subagents as **real herdr panes** — visible, detachable, state-tracked delegation. Each subagent is a separate `pi` process in its own pane, orchestrated through the `herdr` CLI.

**Agent skill:** `herdr-subagents`

Requires [herdr](https://herdr.dev) with the agent running inside a herdr-managed pane (`HERDR_ENV=1`). Supports single, parallel, and chained subagent workflows; the guardrail prevents using the skill outside herdr.

The callback bridge (`extensions/herdr-callbacks.ts`) is pi-only: it watches `~/.pi/agent/callbacks/<pane>/` and injects subagent completion files into the parent session via `sendUserMessage`. Copy the extension to `~/.pi/agent/extensions/` and `/reload` in pi.

### Chrome DevTools

Inspect the Chrome tab the user already has open — screenshot, evaluate, attach via `chrome-devtools --autoConnect`. Does not launch a second browser.

**Agent skill:** `chrome-devtools`

Ships a wrapper that avoids PATH `chrome-devtools` 1.1.0 (cannot autoConnect on Chrome 153) and, after a short page snapshot, batches TypeSafe/Jev questions (`typesafe_evaluate`) instead of dumping the DOM. Requires Chrome remote debugging (`chrome://inspect/#remote-debugging`) and Full Disk Access for the terminal running pi.

## Installation

### skills CLI (skills.sh)

Install via the [skills CLI](https://github.com/vercel-labs/skills) from the [skills.sh](https://skills.sh/iuhoay/skills) directory — no GitHub CLI preview feature required:

```bash
# Install all skills (interactive — auto-detects your installed agents)
npx skills add iuhoay/skills

# Install one skill
npx skills add iuhoay/skills --skill linear
```

Run `npx skills list` to verify. This installs `vanilla-rails`, `rails-deps`, `question-it`, `linear`, `gh-stack`, `herdr-subagents`, `not-spam-pr`, and `chrome-devtools` using the cross-agent [Agent Skills specification](https://agentskills.io/specification).

### Agent Skills

Use the GitHub CLI to install all compatible skills at user scope for Amp, Claude Code, Pi, Codex, Cursor, Gemini CLI, and [other supported agents](https://cli.github.com/manual/gh_skill_install):

```bash
gh skill install iuhoay/skills --all --agent amp --scope user
gh skill install iuhoay/skills --all --agent claude-code --scope user
gh skill install iuhoay/skills --all --agent pi --scope user
gh skill install iuhoay/skills --all --agent codex --scope user
```

Replace `--agent` with the desired host. To install one skill instead of all of them, replace `--all` with its name, such as `linear`.

This installs `vanilla-rails`, `rails-deps`, `question-it`, `linear`, `gh-stack`, `herdr-subagents`, `not-spam-pr`, and `chrome-devtools`. The `gh skill` command is currently a preview feature.

After installing for Amp, start a new session and use `skill: list` from the command palette to verify the skills are available.

### Pi Package

Alternatively, install the repository as a native [Pi package](https://pi.dev/docs/latest/packages):

```bash
pi install git:github.com/iuhoay/skills
```

Then start a new Pi session, or run `/reload` in the current session. The package provides:

- `/skill:vanilla-rails`
- `/skill:rails-deps`
- `/skill:linear`
- `/skill:question-it`
- `/skill:gh-stack`
- `/skill:not-spam-pr`
- `/skill:herdr-subagents`
- `/skill:chrome-devtools`

## Linear CLI Setup

The Linear skill's bundled CLI works across supported agents and requires Node.js 20 or newer. From a clone of this repository, install and authenticate the CLI with:

```bash
node linear/scripts/linear.mjs install
linear auth login
linear issues list --team ENG
```

## License

MIT
