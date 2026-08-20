# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Claude Code plugin repository ("iuhoay-skills") that hosts a collection of skills for Rails development and code review. The plugin is published to the Claude plugin marketplace.

## Plugin Architecture

This is a **monorepo** of Claude Code skills. Each skill is a self-contained package with its own plugin manifest.

### Root Structure

```
.claude-plugin/marketplace.json    # Root plugin manifest (aggregates all skills)
README.md                          # Installation and usage guide
```

### Individual Skill Structure

Each skill subdirectory follows this structure:

```
skill-name/
├── .claude-plugin/
│   └── plugin.json              # Skill's plugin manifest (name, version, keywords)
├── agents/
│   └── agent-name.md            # Task agent definitions (model: inherit)
├── commands/
│   └── command-name.md          # Slash command implementations
└── skills/
    └── skill-name/
        ├── SKILL.md             # Main skill file with triggers, allowed tools
        ├── references/          # Pattern libraries and documentation
        └── examples/            # Before/after code examples
```

Some skills may omit `agents/` if they have no subagents, or include extra config files (e.g., `.lsp.json` for ruby-lsp).

### Key Architecture Concepts

**Three-tier manifest system:**
1. Root `marketplace.json` - Aggregates all skills into one plugin
2. Per-skill `plugin.json` - Individual skill metadata
3. `SKILL.md` - Trigger phrases, allowed tools, and behavior

**Agent vs Command vs Skill:**
- **Skill** (SKILL.md) - Auto-triggered by keywords in conversation; defines allowed tools
- **Command** (commands/*.md) - Invoked via `/prefix:command`; explicit user action
- **Agent** (agents/*.md) - Task tool subprocess; inherits model from parent

## Plugin Metadata

- **Plugin Name**: iuhoay-skills
- **Categories**: productivity, utilities
- **Version**: 1.13.0
- **License**: MIT
- **Owner**: iuhoay (https://github.com/iuhoay)

## Available Skills

### 1. Vanilla Rails (`vanilla-rails/`)

Design and review Rails applications using Vanilla Rails philosophy from 37signals/Basecamp.

**Version:** 1.6.3

**Commands:**
- `/vanilla-rails:review` - Review code changes for over-engineering
- `/vanilla-rails:analyze` - Analyze codebase for simplification opportunities
- `/vanilla-rails:simplify [goal]` - Plan incremental simplification

**Triggers:** "service layer", "service object", "thin controller", "rich model", "vanilla rails", "dhh style", "over-engineering", "unnecessary abstraction"

**Philosophy:** Thin controllers, rich domain models, no service layers unless genuinely justified.

**Allowed Tools:** Grep, Glob, Read, Task

**Key references:**
- `references/anti-patterns.md` - Model boundary violations, service layer abuse, anemic models, fat controllers
- `references/patterns/` - plain-activerecord, rich-models, concerns, delegated-type, when-to-use-services
- `examples/before-after.md` - Real-world before/after refactoring examples

**Agent:** `agents/vanilla-rails-reviewer.md` - Applies Vanilla Rails review principles as a subagent

---

### 2. Rails Deps (`rails-deps/`)

Configure and manage recommended Rails development dependencies for better developer experience.

**Version:** 1.0.0

**Commands:**
- `/rails-deps:check` - Check which recommended gems are installed
- `/rails-deps:install [gem]` - Install and configure a specific gem
- `/rails-deps:setup` - Interactive setup for all recommended gems

**Triggers:** "rails dependencies", "rails gems", "development gems", "strong_migrations", "bullet gem", "letter_opener", "herb gem"

**Allowed Tools:** Read, Glob, Grep, Bash

**Recommended gems:**
- **strong_migrations** - Catch unsafe database migrations in development
- **herb** - HTML+ERB parsing, formatting, and linting
- **bullet** - Detect N+1 query problems
- **letter_opener** - Preview emails in browser instead of sending

**References:** Detailed setup docs in `references/` for each gem (strong_migrations.md, herb.md, bullet.md, letter_opener.md)

---

### 3. Ruby LSP (`ruby-lsp/`)

Ruby Language Server Protocol integration for code intelligence in editors.

**Version:** 1.0.0

**Configuration:** `.lsp.json` defines LSP server settings:
```json
{
  "ruby": {
    "command": "ruby-lsp",
    "extensionToLanguage": {".rb": "ruby"},
    "transport": "stdio"
  }
}
```

**Features:** Instant diagnostics, go-to-definition, find references, hover documentation, language-aware code navigation for Ruby/Rails projects.

---

### 4. Linear (`linear/`)

Manage Linear issues without MCP through a bundled JSON-first Node.js CLI.

**Version:** 1.0.0

**Command:** `/linear:setup`

**Triggers:** Linear issue search/read/create/update, pull-request linking, comments, and project-management requests.

**Allowed Tools:** Bash, Read

**CLI:** `linear/skills/linear/scripts/linear.mjs` — direct GraphQL API access; OAuth 2.0 + PKCE is the default login, refreshable credentials live in macOS Keychain (or a mode-0600 config file), and `LINEAR_API_KEY` remains a fallback.

### 5. Question It (`question-it/`)

Automatically challenge the user's plans and decision-laden questions — question the question itself, verify against facts, and give a better alternative.

**Version:** 1.2.0

**Commands:**
- `/question-it:interview [plan]` - Full decision-tree interview (manual deep-dive)

**Auto-triggers:** When the user proposes a plan or approach, asks a "should I / how should I" or "is this ok" question, or seeks confirmation — pure fact queries do not trigger.

**Philosophy:** Every question carries hidden assumptions — question the question first. Every challenge must cite facts from the environment (code, git history, configs); no hollow "have you considered X". Every challenge comes with a better alternative and its cost. One point at a time, facts are arguable but preferences are the user's. Nothing is acted on without confirmation.

**Allowed Tools:** Grep, Glob, Read, Bash

**Key structure:** The `question-it` skill (auto-invoked primitive) carries the challenge technique; the `/question-it:interview` command is the manual decision-tree interview. Adapted from the [grill-me/grilling split](https://github.com/mattpocock/skills) in mattpocock's skills collection.

---

### 6. GitHub Stacked PRs (`gh-stack/`)

Manage GitHub stacked pull requests with the official `gh stack` extension — break a large change into a chain of dependent PRs.

**Version:** 1.1.0

**Commands:**
- `/gh-stack:setup` - Install and verify the gh-stack extension

**Triggers:** "stacked PR", "PR stack", "stack of branches", "stack these branches", "gh stack", splitting a large change into dependent pull requests.

**Workflow:** `init`/`add` to build the stack (plan layers first — see `references/stack-design.md`), `submit --auto` to create the PR chain, `sync` to rebase/push/sync PR state, `merge <pr|stack> --yes` to land it (never `gh pr merge`), `bottom`/`top`/`up`/`down`/`trunk` to navigate, `link` for stacks managed by external tools (jj, Sapling, git-town) without local tracking.

**Key references:**
- `references/stack-design.md` - Layer planning, branch naming, staging discipline
- `references/commands.md` - Per-command preconditions, side effects, atomicity
- `references/troubleshooting.md` - Exit-code recovery, squash merges, divergence, restructuring

**Agent notes:** `submit` opens an interactive editor in a terminal — pass `--auto` non-interactively (PRs become drafts unless `--open`). `sync` never opens PRs, only links existing ones. `modify`/`switch` are interactive TUIs. `view --json` gives machine-readable state; branch on exit codes (0-10), not stderr text. Metadata lives in `.git/gh-stack` (JSON, uncommitted).

**Allowed Tools:** Bash, Read, Grep

---

## Development

When modifying this repository:

### Adding a New Skill
1. Create skill directory with `agents/`, `commands/`, `skills/` subdirectories
2. Add `.claude-plugin/plugin.json` with skill metadata (name, version, keywords, author)
3. Create `skills/skill-name/SKILL.md` with triggers, description, allowed tools (YAML frontmatter)
4. Create command markdown files in `commands/`
5. Create agent markdown files in `agents/` (if needed; use `model: inherit`)
6. Update root `.claude-plugin/marketplace.json` to reference the new skill

### Versioning
- **IMPORTANT**: Increment version numbers in BOTH root `marketplace.json` and per-skill `plugin.json` before committing changes
- Root `marketplace.json` version should be incremented when publishing any updates
- Individual skill versions in `plugin.json` can vary independently

### File Format Conventions
- **Frontmatter** (YAML) in `SKILL.md` defines triggers and tool permissions
- **Agent files** use frontmatter with `name`, `description`, `model: inherit`
- **Command files** are pure markdown with usage documentation and embedded prompts
- **Reference files** are markdown documentation (no frontmatter needed)

### Command Prefix Convention
Command prefixes match the skill directory name: `/vanilla-rails:*`, `/rails-deps:*`. Do NOT use shortened prefixes like `/vanilla:*`.
