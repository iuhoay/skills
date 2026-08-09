# iuhoay/skills

A collection of development workflow skills for [Amp](https://ampcode.com), [Pi](https://pi.dev), and [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

[![skills.sh](https://skills.sh/b/iuhoay/skills)](https://skills.sh/iuhoay/skills)

## Available Skills

### Vanilla Rails

Design and review Rails applications using Vanilla Rails philosophy from 37signals/Basecamp.

**Agent skill:** `vanilla-rails`

**Claude Code commands:** `/vanilla-rails:review` | `/vanilla-rails:analyze` | `/vanilla-rails:simplify [goal]`

Based on [Fizzy](https://github.com/basecamp/fizzy): thin controllers, rich domain models, no service layers unless genuinely justified. "Vanilla Rails is plenty" - DHH.

### Rails Dependencies

Configure recommended Rails development dependencies for better developer experience.

**Agent skill:** `rails-deps`

**Claude Code commands:** `/rails-deps:check` | `/rails-deps:install [gem]` | `/rails-deps:setup`

Recommended gems: strong_migrations, herb, bullet, letter_opener.

### Linear

Manage Linear issues without MCP through a bundled, JSON-first CLI that calls Linear's GraphQL API directly.

**Agent skill:** `linear`

The CLI supports OAuth 2.0 + PKCE login with automatic token refresh, issue search/read/create/update, comments, and a raw GraphQL escape hatch. Credentials are stored in macOS Keychain or a mode-0600 config file; `LINEAR_API_KEY` remains an optional fallback.

### Question It

Automatically challenges your plans and decision-laden questions — question the question, verify against facts from the codebase, and give a better alternative.

**Agent skill:** `question-it` (auto-triggered)

**Claude Code commands:** `/question-it:interview [plan]` — manual decision-tree interview

Every question carries hidden assumptions, so it questions the question first. Every challenge is grounded in facts from the environment (code, git history, configs) — never hollow "have you considered X" — and comes with a concrete better alternative and its cost. One point at a time; nothing is acted on without your confirmation. Adapted from [mattpocock/skills](https://github.com/mattpocock/skills).

### GitHub Stacked PRs

Manage stacked pull requests with the official `gh stack` extension — split a large change into a chain of dependent PRs.

**Agent skill:** `gh-stack`

**Claude Code commands:** `/gh-stack:setup` — install and verify the extension

Create stacks (`init`/`add`), submit PR chains (`submit`), keep them in sync (`sync`), cascade-rebase, restructure interactively (`modify`), and navigate (`bottom`/`top`/`up`/`down`/`trunk`). Agent-friendly details: `submit --auto` skips the interactive editor, `view --json` gives machine-readable state, and `link` works without local tracking for external tools like jj or Sapling.

## Installation

### skills CLI (skills.sh)

Install via the [skills CLI](https://github.com/vercel-labs/skills) from the [skills.sh](https://skills.sh/iuhoay/skills) directory — no GitHub CLI preview feature required:

```bash
# Install all skills (interactive — auto-detects your installed agents)
npx skills add iuhoay/skills

# Install one skill
npx skills add iuhoay/skills --skill linear
```

Run `npx skills list` to verify. This installs `vanilla-rails`, `rails-deps`, `question-it`, `linear`, and `gh-stack` using the cross-agent [Agent Skills specification](https://agentskills.io/specification). It does not install Claude Code-specific slash commands, subagents, plugin manifests, or `.lsp.json` configuration — use the Claude Code Plugin section below for those.

### Agent Skills

Use the GitHub CLI to install all compatible skills at user scope for Amp, Claude Code, Pi, Codex, Cursor, Gemini CLI, and [other supported agents](https://cli.github.com/manual/gh_skill_install):

```bash
gh skill install iuhoay/skills --all --agent amp --scope user
gh skill install iuhoay/skills --all --agent claude-code --scope user
gh skill install iuhoay/skills --all --agent pi --scope user
gh skill install iuhoay/skills --all --agent codex --scope user
```

Replace `--agent` with the desired host. To install one skill instead of all of them, replace `--all` with its name, such as `linear`.

This installs `vanilla-rails`, `rails-deps`, `question-it`, `linear`, and `gh-stack` using the cross-agent [Agent Skills specification](https://agentskills.io/specification). It does not install Claude Code-specific slash commands, subagents, plugin manifests, or `.lsp.json` configuration. The `gh skill` command is currently a preview feature.

After installing for Amp, start a new session and use `skill: list` from the command palette to verify the skills are available.

### Claude Code Plugin

For the complete Claude Code integration, including slash commands, subagents, and Ruby LSP configuration, install the native plugins:

```text
/plugin marketplace add iuhoay/skills
/plugin install vanilla-rails@iuhoay-skills
/plugin install rails-deps@iuhoay-skills
/plugin install ruby-lsp@iuhoay-skills
/plugin install linear@iuhoay-skills
/plugin install question-it@iuhoay-skills
/plugin install gh-stack@iuhoay-skills
```

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

## Platform-specific Integrations

### Ruby LSP (Claude Code only)

The Ruby LSP plugin provides diagnostics, code navigation (go to definition, find references, hover), and Ruby/Rails language awareness. Amp and Pi do not load its `.lsp.json` configuration.

Install [ruby-lsp](https://github.com/Shopify/ruby-lsp) before installing the Claude Code plugin:

```bash
gem install ruby-lsp
```

### Linear CLI Setup

The Linear skill's bundled CLI works across supported agents and requires Node.js 20 or newer. Claude Code users can run `/linear:setup`. From a clone of this repository, install and authenticate the CLI with:

```bash
node linear/skills/linear/scripts/linear.mjs install
linear auth login
linear issues list --team ENG
```

## License

MIT
