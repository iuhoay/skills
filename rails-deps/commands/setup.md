# Interactive Setup

Interactive setup for all recommended Rails development dependencies.

## Usage

```
/rails-deps:setup
```

## What This Does

Guides you through configuring all recommended gems:

1. **strong_migrations** - Prevent dangerous migrations
2. **herb** - HTML+ERB parsing and tooling
3. **bullet** - Detect N+1 queries
4. **letter_opener** - Preview emails in browser
5. **ruby-lsp** - Ruby Language Server Protocol for editor intelligence + Claude Code integration

## Process

For each gem, you'll be asked:
- Whether to install it
- Any configuration preferences

The skill will:
- Update your `Gemfile`
- Run `bundle install`
- Generate configuration files
- Provide next steps

## Example

```bash
/rails-deps:setup

# === Rails Dependencies Setup ===

# 1. strong_migrations
# Prevents dangerous database migrations
# Install? (Y/n) Y

# 2. herb
# HTML+ERB parsing, formatting, and linting
# Install? (Y/n) Y

# 3. bullet
# Detect N+1 queries in development
# Install? (Y/n) n

# 4. letter_opener
# Preview emails in browser
# Install? (Y/n) Y

# 5. ruby-lsp
# Ruby Language Server Protocol — editor diagnostics, go-to-definition,
# hover docs, and Claude Code integration via official plugin
# Install gem? (Y/n) Y
#
# ✅ Added ruby-lsp gem to Gemfile (development group)
# ✅ bundle install complete
#
# Next step — install the Claude Code plugin:
#   /plugin install ruby-lsp@claude-plugins-official

# === Summary ===
# Installing: strong_migrations, herb, letter_opener, ruby-lsp
# Skipping: bullet
#
# Reminder: run the following in Claude Code to enable ruby-lsp integration:
#   /plugin install ruby-lsp@claude-plugins-official
```
