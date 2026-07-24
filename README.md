# iuhoay/skills

A collection of development workflow skills for [Amp](https://ampcode.com), [Pi](https://pi.dev), and [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

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

## Installation

### Agent Skills

Use the GitHub CLI to install all compatible skills at user scope for Amp, Claude Code, Pi, Codex, Cursor, Gemini CLI, and [other supported agents](https://cli.github.com/manual/gh_skill_install):

```bash
gh skill install iuhoay/skills --all --agent amp --scope user
gh skill install iuhoay/skills --all --agent claude-code --scope user
gh skill install iuhoay/skills --all --agent pi --scope user
gh skill install iuhoay/skills --all --agent codex --scope user
```

Replace `--agent` with the desired host. To install one skill instead of all of them, replace `--all` with its name, such as `linear`.

This installs `vanilla-rails`, `rails-deps`, and `linear` using the cross-agent [Agent Skills specification](https://agentskills.io/specification). It does not install Claude Code-specific slash commands, subagents, plugin manifests, or `.lsp.json` configuration. The `gh skill` command is currently a preview feature.

After installing for Amp, start a new session and use `skill: list` from the command palette to verify the skills are available.

### Claude Code Plugin

For the complete Claude Code integration, including slash commands, subagents, and Ruby LSP configuration, install the native plugins:

```text
/plugin marketplace add iuhoay/skills
/plugin install vanilla-rails@iuhoay-skills
/plugin install rails-deps@iuhoay-skills
/plugin install ruby-lsp@iuhoay-skills
/plugin install linear@iuhoay-skills
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
