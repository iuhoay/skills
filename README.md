# iuhoay/skills

A collection of development workflow skills for [Amp](https://ampcode.com), [Pi](https://pi.dev), and [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## Available Skills

### Vanilla Rails

Design and review Rails applications using Vanilla Rails philosophy from 37signals/Basecamp.

**Commands:** `/vanilla-rails:review` | `/vanilla-rails:analyze` | `/vanilla-rails:simplify [goal]`

Based on [Fizzy](https://github.com/basecamp/fizzy): thin controllers, rich domain models, no service layers unless genuinely justified. "Vanilla Rails is plenty" - DHH.

### Rails Dependencies

Configure recommended Rails development dependencies for better developer experience.

**Commands:** `/rails-deps:check` | `/rails-deps:install [gem]` | `/rails-deps:setup`

Recommended gems: strong_migrations, herb, bullet, letter_opener.

### Ruby LSP

LSP integration for Ruby/Rails development with instant diagnostics, code navigation (go to definition, find references, hover), and language awareness.

**Prerequisite:** Install [ruby-lsp](https://github.com/Shopify/ruby-lsp) first:
```bash
gem install ruby-lsp
```

### Linear

Manage Linear issues without MCP through a bundled, JSON-first CLI that calls Linear's GraphQL API directly.

**Skill:** `/skill:linear`

**Claude command:** `/linear:setup`

The CLI supports OAuth 2.0 + PKCE login with automatic token refresh, issue search/read/create/update, comments, and a raw GraphQL escape hatch. Credentials are stored in macOS Keychain or a mode-0600 config file; `LINEAR_API_KEY` remains an optional fallback.

```bash
node linear/skills/linear/scripts/linear.mjs install
linear auth login
linear issues list --team ENG
```

## Installation

### Amp

Install all compatible skills at user scope with the GitHub CLI:

```bash
gh skill install iuhoay/skills --all --agent amp --scope user
```

Then start a new Amp session and use `skill: list` from the command palette to verify that `vanilla-rails`, `rails-deps`, and `linear` are available. The Ruby LSP plugin remains Claude Code-only because Amp does not load its `.lsp.json` configuration.

### Claude Code

```text
/plugin marketplace add iuhoay/skills
/plugin install vanilla-rails@iuhoay-skills
/plugin install rails-deps@iuhoay-skills
/plugin install ruby-lsp@iuhoay-skills
/plugin install linear@iuhoay-skills
```

### Pi

Install the repository as a native [Pi package](https://pi.dev/docs/latest/packages):

```bash
pi install git:github.com/iuhoay/skills
```

Then start a new Pi session, or run `/reload` in the current session. The package provides:

- `/skill:vanilla-rails`
- `/skill:rails-deps`
- `/skill:linear`

The Ruby LSP plugin is currently available only in Claude Code; Pi does not load its `.lsp.json` configuration. The Linear skill's bundled CLI works in both harnesses and requires Node.js 20 or newer.

## License

MIT
