# Install Gem

Install and configure a specific recommended Rails development dependency.

## Usage

```
/rails-deps:install [gem_name]
```

## Available Gems

| Gem | Description |
|-----|-------------|
| `strong_migrations` | Catch unsafe migrations |
| `herb` | HTML+ERB tooling |
| `bullet` | N+1 query detection |
| `letter_opener` | Email preview |

## Examples

```
/rails-deps:install strong_migrations
/rails-deps:install herb
/rails-deps:install bullet
/rails-deps:install letter_opener
```

## What This Does

1. Adds the gem to `Gemfile` (if not present)
2. Runs `bundle install`
3. Provides configuration instructions
4. Runs necessary generators (e.g., `rails generate strong_migrations:install`)
