# iuhoay/skills

A collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for Rails development.

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

## Installation

### Claude Code

```text
/plugin marketplace add iuhoay/skills
/plugin install vanilla-rails@iuhoay-skills
/plugin install rails-deps@iuhoay-skills
/plugin install ruby-lsp@iuhoay-skills
```

### Pi

Install the repository as a native [Pi package](https://pi.dev/docs/latest/packages):

```bash
pi install git:github.com/iuhoay/skills
```

Then start a new Pi session, or run `/reload` in the current session. The package provides:

- `/skill:vanilla-rails`
- `/skill:rails-deps`

The Ruby LSP plugin is currently available only in Claude Code; Pi does not load its `.lsp.json` configuration.

## License

MIT
