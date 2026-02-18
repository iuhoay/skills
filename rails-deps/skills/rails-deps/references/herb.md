# herb

Powerful and seamless HTML-aware ERB parsing and tooling.

## What It Does

Herb provides a complete ecosystem of HTML+ERB tooling:
- **Herb Parser** - Fast, HTML-aware ERB parser in C
- **Language Server** - Editor diagnostics and real-time feedback
- **Formatter** - Automatic formatting (experimental)
- **Linter** - Static analysis for best practices

## Installation

Add to `Gemfile`:

```ruby
gem "herb", group: :development
```

```bash
bundle install
```

## CLI Commands

```bash
# Analyze all HTML+ERB files in project
bundle exec herb analyze .

# Parse a single file
bundle exec herb parse app/views/layouts/application.html.erb

# Extract Ruby code from ERB
bundle exec herb ruby app/views/users/show.html.erb

# Extract HTML from ERB
bundle exec herb html app/views/users/show.html.erb

# Open in playground
bundle exec herb playground app/views/users/show.html.erb

# Check version
bundle exec herb version
```

## Editor Integration

### VS Code

Install extension: [marcoroth.herb-lsp](https://marketplace.visualstudio.com/items?itemName=marcoroth.herb-lsp)

Features:
- Syntax diagnostics
- Go to definition
- Find references
- Code completion

### Neovim/Vim

Install via vim-plug or similar LSP client configuration.

## Herb Formatter (Experimental)

```bash
# Format a file
bundle exec herb format app/views/users/show.html.erb

# Format directory
bundle exec herb format app/views/
```

> **Caution:** Formatter is experimental preview. Use with caution on version-controlled files.

## Herb Linter

```bash
# Lint a file
bundle exec herb lint app/views/users/show.html.erb

# Lint directory
bundle exec herb lint app/views/
```

Linter rules include:
- Unclosed tags
- Invalid ERB syntax
- Accessibility checks
- Style violations

## Why Herb?

HTML+ERB never had good tooling. Herb bridges the gap by:
- Understanding HTML and ERB as first-class citizens
- Providing accurate syntax trees
- Enabling modern editor features
- Supporting AI-driven workflows

## Alternatives

| Tool | Difference |
|------|------------|
| `erb_lint` | Uses regex, less accurate |
| `erb-formatter` | Basic formatting only |
| `better-html` | Validation only |
| `syntax_tree-erb` | Not HTML-aware |

## Links

- [GitHub](https://github.com/marcoroth/herb)
- [Documentation](https://herb.dev)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=marcoroth.herb-lsp)
- [RubyKaigi 2025 Talk](https://rubykaigi.org/2025/presentations/marcoroth.html)
