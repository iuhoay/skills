---
name: rails-deps
description: Configure recommended Rails development dependencies. Checks for essential gems like strong_migrations, herb, bullet, and letter_opener. Provides installation and configuration guidance.
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
---

# Rails Dependencies

Configure recommended Rails development dependencies for better developer experience and code quality.

## Quick Start

Run `/rails-deps:check` to see which recommended gems are installed in your project.

## Recommended Gems

| Gem | Category | Purpose |
|-----|----------|---------|
| [strong_migrations](https://github.com/ankane/strong_migrations) | Safety | Catch unsafe migrations in development |
| [herb](https://github.com/marcoroth/herb) | Tooling | HTML+ERB parsing, formatting, and linting |
| [bullet](https://github.com/flyerhzm/bullet) | Performance | Detect N+1 queries |
| [letter_opener](https://github.com/ryanb/letter_opener) | Development | Preview emails in browser |

## Commands

| Command | Description |
|---------|-------------|
| `/rails-deps:check` | Check which recommended gems are installed |
| `/rails-deps:install [gem]` | Install and configure a specific gem |
| `/rails-deps:setup` | Interactive setup for all recommended gems |

## Gem Details

For detailed installation and configuration guides, see:

| Gem | Reference |
|-----|-----------|
| `strong_migrations` | [strong_migrations.md](references/strong_migrations.md) - Catch unsafe migrations |
| `herb` | [herb.md](references/herb.md) - HTML+ERB parsing and tooling |
| `bullet` | [bullet.md](references/bullet.md) - N+1 query detection |
| `letter_opener` | [letter_opener.md](references/letter_opener.md) - Email preview |

### Quick Install Commands

```bash
# strong_migrations
gem "strong_migrations"
bundle install && rails generate strong_migrations:install

# herb
gem "herb", group: :development
bundle install && bundle exec herb analyze .

# bullet
gem "bullet", group: :development
# Add configuration to config/environments/development.rb

# letter_opener
gem "letter_opener", group: :development
# Set delivery_method to :letter_opener in development.rb
```

## Triggers

This skill activates when you mention:
- "setup dependencies", "configure gems", "install strong_migrations"
- "setup herb", "install bullet", "letter_opener"
- "rails development gems", "project setup", "recommended gems"
