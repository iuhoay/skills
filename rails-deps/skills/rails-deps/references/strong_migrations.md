# strong_migrations

Catch unsafe migrations in development before they cause downtime in production.

## What It Does

Detects potentially dangerous database operations and prevents them from running by default:
- Operations that block reads/writes for more than a few seconds
- Operations that cause application errors

## Installation

Add to `Gemfile`:

```ruby
gem "strong_migrations"
```

```bash
bundle install
rails generate strong_migrations:install
```

## Dangerous Operations

| Operation | Why It's Dangerous | Safe Alternative |
|-----------|-------------------|------------------|
| `remove_column` | Active Record caches columns, causing errors until reboot | Ignore column in model, deploy, then migrate |
| `change_column` (type) | Rewrites entire table, blocks reads/writes | Create new column, backfill, migrate reads |
| `rename_column` | Breaks running application code | Create new column, write to both, migrate |
| `rename_table` | Breaks running application code | Create new table, write to both, migrate |
| `add_index` (non-concurrent) | Blocks writes in Postgres | Use `algorithm: :concurrently` |
| `add_reference` | Adds index non-concurrently | Use `index: {algorithm: :concurrently}` |
| `add_foreign_key` | Blocks writes on both tables | Use `validate: false`, validate separately |
| `add_column` with volatile default | Rewrites entire table | Add without default, change default, backfill |

## Postgres-Specific Checks

- Adding index non-concurrently
- Adding a reference
- Adding a foreign key
- Adding a unique constraint
- Adding an exclusion constraint
- Adding a `json` column (use `jsonb` instead)
- Setting `NOT NULL` on existing column
- Adding column with volatile default value

## Configuration

`config/initializers/strong_migrations.rb`:

```ruby
StrongMigrations.lock_timeout = 10.seconds
StrongMigrations.statement_timeout = 1.hour

# Enable safe by default for certain operations
StrongMigrations.safe_by_default = true

# Set start time to ignore existing migrations
StrongMigrations.start_after = 20250101000000
```

## Safe by Default

These operations can be made safe by default:

```ruby
StrongMigrations.safe_by_default = true
```

Automatically handles:
- Adding/removing indexes concurrently
- Adding foreign keys without validation
- Adding check constraints without validation
- Setting NOT NULL safely

## Custom Messages

```ruby
StrongMigrations.error_messages[:add_column_default] = "Your custom instructions"
```

## Links

- [GitHub](https://github.com/ankane/strong_migrations)
- [PostgreSQL at Scale: Database Schema Changes Without Downtime](https://makandracards.com/makandra/641-database-schema-changes-without-downtime)
