# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Claude Code plugin repository ("iuhoay-skills") that hosts a collection of skills for Rails development and code review. The plugin is published to the Claude plugin marketplace.

## Plugin Architecture

This is a **monorepo** of Claude Code skills. Each skill is a self-contained package with its own plugin manifest.

### Root Structure

```
.claude-plugin/marketplace.json    # Root plugin manifest (aggregates all skills)
```

### Individual Skill Structure

Each skill subdirectory (e.g., `vanilla-rails/`) follows this structure:

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
- **Version**: 1.0.0
- **License**: MIT
- **Owner**: iuhoay (https://github.com/iuhoay)

## Available Skills

### Vanilla Rails

Design and review Rails applications using Vanilla Rails philosophy from 37signals/Basecamp.

**Commands:**
- `/vanilla:review` - Review code changes for over-engineering
- `/vanilla:analyze` - Analyze codebase for simplification opportunities
- `/vanilla:simplify [goal]` - Plan incremental simplification

**Triggers:** "service layer", "service object", "thin controller", "rich model", "vanilla rails", "dhh style", "over-engineering", "unnecessary abstraction"

**Philosophy:** Thin controllers, rich domain models, no service layers unless genuinely justified.

## Development

When modifying this repository:

### Adding a New Skill
1. Create skill directory with `agents/`, `commands/`, `skills/` subdirectories
2. Add `.claude-plugin/plugin.json` with skill metadata
3. Create `SKILL.md` with triggers, description, allowed tools
4. Create command markdown files in `commands/`
5. Create agent markdown files in `agents/` (if needed)
6. Update root `.claude-plugin/marketplace.json` to reference the new skill

### Versioning
- Root `marketplace.json` version should be incremented when publishing updates
- Individual skill versions in `plugin.json` can vary independently

### File Format Conventions
- **Frontmatter** (YAML) in SKILL.md defines triggers and tool permissions
- **Agent files** use frontmatter with `name`, `description`, `model: inherit`
- **Command files** are pure markdown with usage documentation and embedded prompts
