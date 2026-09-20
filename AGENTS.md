# AGENTS.md

This file provides guidance to coding agents working in this repository.

## Repository Overview

A monorepo of [Agent Skills](https://agentskills.io/specification) for coding agents. Install via the skills CLI, `gh skill install`, or as a Pi package (`iuhoay-skills`).

- **Package name**: iuhoay-skills
- **Version**: 1.18.0
- **License**: MIT
- **Owner**: iuhoay (https://github.com/iuhoay)

## Layout

Each top-level directory is one skill. The skill directory contains `SKILL.md` (required) plus optional `references/`, `examples/`, `scripts/`, or `extensions/`.

```
skill-name/
├── SKILL.md
├── references/
├── examples/
└── scripts/
```

Root:

```
package.json    # pi.skills allowlist, linear bin, version
README.md
AGENTS.md
```

`package.json` `pi.skills` is an explicit allowlist — new skill directories are not auto-discovered. Each entry must be a directory that contains `SKILL.md`. Local-path Pi installs read disk live; a session `/reload` is enough after a manifest edit.

## Available Skills

### Vanilla Rails (`vanilla-rails/`)

Default architecture constraint when writing Rails, from Vanilla Rails / 37signals/Basecamp.

**Triggers:** creating or editing controllers, models, jobs, concerns, mailers, routes, or form objects; custom action vs nested resource; extracting a service/form/query/interactor; deciding where business logic lives. Also Rails reviews and simplification. Not migrations, gem bumps, CSS/JS, credentials.

**Philosophy:** House style, not a review lens. Thin controllers, rich domain models, no service layers unless genuinely justified.

When the user asks to review, analyze, or plan a simplification, follow `references/review.md`, `references/analyze.md`, and `references/simplify.md`.

### Rails Deps (`rails-deps/`)

Configure recommended Rails development dependencies: strong_migrations, herb, bullet, letter_opener.

**Triggers:** "rails dependencies", "rails gems", "development gems", those gem names.

Workflows: check Gemfile/lock, install one gem, or walk through all four. Details in `references/`.

### Linear (`linear/`)

Manage Linear issues without MCP through a bundled JSON-first Node.js CLI.

**Triggers:** Linear issue search/read/create/update, pull-request linking, comments, and project-management requests.

**CLI:** `linear/scripts/linear.mjs` — direct GraphQL API access; OAuth 2.0 + PKCE is the default login, refreshable credentials live in macOS Keychain (or a mode-0600 config file), and `LINEAR_API_KEY` remains a fallback.

Stay organization-neutral in shipped files: ENG/Platform/acme examples only. Real team/project mappings live in `~/.config` and must never enter Git. Multi-project repo mappings: `issues create` must fail without explicit `--project`; legacy `project` string shape must stay readable.

### Question It (`question-it/`)

Automatically challenge the user's plans and decision-laden questions — question the question itself, verify against facts, and give a better alternative.

**Auto-triggers:** When the user proposes a plan or approach, asks a "should I / how should I" or "is this ok" question, or seeks confirmation — pure fact queries do not trigger. Explicit "grill me" / "interview" / "poke holes in this" enter deep-dive mode.

Every challenge must cite facts from the environment; no hollow "have you considered X". Every challenge comes with a better alternative and its cost. One point at a time. Nothing is acted on without confirmation. Adapted from the [grill-me/grilling split](https://github.com/mattpocock/skills) in mattpocock's skills collection.

### Stop Spam PR (`not-spam-pr/`)

Stop spam PRs: surgical diffs in the repo's own commit/PR voice.

**Triggers:** implementing a feature or bugfix; writing a commit message, PR title, or PR body. Do not wait for "stop spam PR" / "drive-by". Skip review of other people's PRs, planning/question-it, gh-stack mechanics, Linear issue work, and extras the user explicitly asked for.

On the request path, change or delete the existing implementation rather than wrapping it. Match `git log` — no templated PR bodies, no drive-by refactors.

### GitHub Stacked PRs (`gh-stack/`)

Manage GitHub stacked pull requests with the official `gh stack` extension.

**Triggers:** "stacked PR", "PR stack", "stack of branches", "gh stack", splitting a large change into dependent pull requests.

Workflow: `init`/`add` to build the stack (plan layers first — see `references/stack-design.md`), `submit --auto` to create the PR chain, `sync` to rebase/push/sync PR state, `merge <pr|stack> --yes` to land it (never `gh pr merge`), `bottom`/`top`/`up`/`down`/`trunk` to navigate, `link` for stacks managed by external tools (jj, Sapling, git-town) without local tracking.

`submit` opens an interactive editor in a terminal — pass `--auto` non-interactively (PRs become drafts unless `--open`). `sync` never opens PRs, only links existing ones. `modify`/`switch` are interactive TUIs. `view --json` gives machine-readable state; branch on exit codes (0-10), not stderr text. Metadata lives in `.git/gh-stack` (JSON, uncommitted). `gh stack init --adopt` is deprecated — branches auto-adopt.

### Herdr Subagents (`herdr-subagents/`)

Spawn and coordinate subagents as real herdr panes via the `herdr` CLI.

**Triggers:** "subagent", "spawn an agent", "delegate to", "parallel agents", "use herdr panes", visible/detachable agent workers. Requires `HERDR_ENV=1`.

Workflow: `agent start --kind pi` in a split pane → `agent prompt --wait` → `agent read recent-unwrapped` → `pane close`. Fire-and-forget via the callback bridge: subagents write `~/.pi/agent/callbacks/<HERDR_PANE_ID>/<name>.done`, `extensions/herdr-callbacks.ts` injects them into the session.

Callback delivery must stay per-pane — every pi instance (parent and subagents) loads the same extension. A shared `~/.pi/agent/callbacks/` races.

### Chrome DevTools (`chrome-devtools/`)

Attach to the user's already-open Chrome tab via the `chrome-devtools` CLI (`--autoConnect`). After a short page snapshot, batch TypeSafe/Jev questions instead of dumping the DOM.

**Triggers:** look at the current page, a localhost URL already open, verify UI in the Chrome they are using. Not launching a new browser, web search, or MCP.

Wrapper at `scripts/chrome-devtools.sh` prefers chrome-devtools 1.9+ (PATH 1.1.0 cannot autoConnect). Jev via `typesafe_evaluate` (`npm:pi-typesafe`) is optional; ask for `/typesafe enable` if the tool is missing.

## Development

### Adding a skill

1. Create `skill-name/SKILL.md` with description (when to load) and allowed tools in YAML frontmatter
2. Add `"./skill-name"` to `package.json` `pi.skills`
3. Bump `package.json` `version`

Skill markdown (SKILL.md, examples) ships in English.

### Versioning

Increment `package.json` `version` when publishing. There is no per-skill plugin manifest.

### File format

- Frontmatter in `SKILL.md` defines triggers and tool permissions
- Reference files are markdown (no frontmatter needed)
