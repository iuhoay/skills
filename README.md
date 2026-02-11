# iuhoay/skills

A collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for Rails development.

## Available Skills

### Vanilla Rails

Design and review Rails applications using Vanilla Rails philosophy from 37signals/Basecamp.

**Install:**

```
/plugin marketplace add iuhoay/skills
/plugin install vanilla-rails@iuhoay-skills
```

**Commands:**

| Command | Purpose |
|---------|---------|
| `/vanilla:review` | Review code changes for over-engineering |
| `/vanilla:analyze` | Analyze codebase for simplification opportunities |
| `/vanilla:simplify [goal]` | Plan incremental simplification |

**Philosophy:**

- Thin controllers, rich domain models
- No service layers unless genuinely justified
- Plain Active Record is usually enough
- "Vanilla Rails is plenty" - DHH

## License

MIT
