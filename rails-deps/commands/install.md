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
| `ruby-lsp` | Ruby Language Server Protocol |

## Examples

```
/rails-deps:install strong_migrations
/rails-deps:install herb
/rails-deps:install bullet
/rails-deps:install letter_opener
/rails-deps:install ruby-lsp
```

## What This Does

1. Adds the gem to `Gemfile` (if not present)
2. Runs `bundle install`
3. Provides configuration instructions
4. Runs necessary generators (e.g., `rails generate strong_migrations:install`)

## Note on ruby-lsp

`ruby-lsp` requires an additional step to enable Claude Code integration.
After gem installation, run the following in Claude Code:

```
/plugin install ruby-lsp@claude-plugins-official
```
