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

## Workflows

**Check** — read `Gemfile` and `Gemfile.lock` for the four gems; report installed, missing, or in-Gemfile-but-not-locked; give install commands for anything missing.

**Install [gem]** — add that gem to the Gemfile if absent, run `bundle install`, run its generator if it has one, then follow its reference for configuration.

**Setup** — walk through all four gems, ask whether to install each, then apply the install path for the chosen set.

## Recommended Gems

| Gem | Category | Purpose |
|-----|----------|---------|
| [strong_migrations](https://github.com/ankane/strong_migrations) | Safety | Catch unsafe migrations in development |
| [herb](https://github.com/marcoroth/herb) | Tooling | HTML+ERB parsing, formatting, and linting |
| [bullet](https://github.com/flyerhzm/bullet) | Performance | Detect N+1 queries |
| [letter_opener](https://github.com/ryanb/letter_opener) | Development | Preview emails in browser |

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
