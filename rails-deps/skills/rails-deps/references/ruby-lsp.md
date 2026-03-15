# ruby-lsp

Ruby Language Server Protocol implementation by Shopify. Provides editor intelligence for Ruby/Rails projects and integrates with Claude Code via the official plugin.

## Installation

### 1. Add gem to project

```ruby
# Gemfile
gem "ruby-lsp", group: :development, require: false
```

```bash
bundle install
```

### 2. Install Claude Code plugin

After installing the gem, run the following in Claude Code to enable the integration:

```
/plugin install ruby-lsp@claude-plugins-official
```

This gives Claude Code features like go-to-definition, find references, hover documentation, and inline diagnostics for Ruby files.

## Features

- **Diagnostics** — syntax errors and warnings inline in editor
- **Go to definition** — navigate to method, class, or constant definitions
- **Find references** — locate all usages of a symbol
- **Hover documentation** — show docs on hover
- **Code completion** — context-aware suggestions
- **Formatting** — via RuboCop integration (optional)

## Editor Setup

### VS Code

Install the [Ruby LSP extension](https://marketplace.visualstudio.com/items?itemName=Shopify.ruby-lsp) by Shopify. It auto-detects the gem from your bundle.

### Neovim

Use `nvim-lspconfig`:

```lua
require('lspconfig').ruby_lsp.setup({})
```

Ensure `ruby-lsp` binary is in `$PATH` (it is if you use `bundle exec`).

## Configuration

Create `.ruby-lsp/config.yml` in the project root to customize behavior:

```yaml
# .ruby-lsp/config.yml
enabled_features:
  - diagnostics
  - documentHighlights
  - documentSymbols
  - foldingRanges
  - formatting
  - hover
  - inlayHint
  - onTypeFormatting
  - selectionRanges
  - semanticHighlighting
  - completion
  - codeLens
  - definition
  - workspaceSymbol
  - signatureHelp
  - codeActions
  - diagnostics
```

## Links

- [ruby-lsp on GitHub](https://github.com/Shopify/ruby-lsp)
- [VS Code extension](https://marketplace.visualstudio.com/items?itemName=Shopify.ruby-lsp)
- [Official documentation](https://shopify.github.io/ruby-lsp/)
