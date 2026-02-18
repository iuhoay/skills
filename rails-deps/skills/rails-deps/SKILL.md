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

### strong_migrations

Prevents dangerous database migrations that could cause downtime.

**Install:**
```ruby
# Gemfile
gem "strong_migrations"
```

```bash
bundle install
rails generate strong_migrations:install
```

### herb

Powerful HTML+ERB tooling with language server, formatter, and linter.

**Install:**
```ruby
# Gemfile
gem "herb", group: :development
```

```bash
bundle install
bundle exec herb analyze .
```

**VS Code Extension:** [marcoroth.herb-lsp](https://marketplace.visualstudio.com/items?itemName=marcoroth.herb-lsp)

### bullet

Detect N+1 queries and unused eager loading.

**Install:**
```ruby
# Gemfile
gem "bullet", group: :development
```

**Configuration** (`config/environments/development.rb`):
```ruby
config.after_initialize do
  Bullet.enable = true
  Bullet.alert = true
  Bullet.bullet_logger = true
  Bullet.console = true
end
```

### letter_opener

Preview emails in your browser instead of sending.

**Install:**
```ruby
# Gemfile
gem "letter_opener", group: :development
```

**Configuration** (`config/environments/development.rb`):
```ruby
config.action_mailer.delivery_method = :letter_opener
config.action_mailer.perform_deliveries = true
```

## Triggers

This skill activates when you mention:
- "setup dependencies", "configure gems", "install strong_migrations"
- "setup herb", "install bullet", "letter_opener"
- "rails development gems", "project setup", "recommended gems"
