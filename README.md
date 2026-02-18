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

## Installation

```
/plugin marketplace add iuhoay/skills
/plugin install vanilla-rails@iuhoay-skills
/plugin install rails-deps@iuhoay-skills
```

## License

MIT
