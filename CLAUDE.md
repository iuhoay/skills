# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Claude Code plugin repository ("iuhoay-skills") that hosts a collection of skills for various productivity and utility tasks. The plugin is published to the Claude plugin marketplace.

## Project Structure

```
.claude-plugin/
└── marketplace.json    # Plugin manifest with metadata for the Claude marketplace
```

## Plugin Metadata

- **Plugin Name**: iuhoay-skills
- **Categories**: productivity, utilities
- **Version**: 1.0.0
- **License**: MIT
- **Owner**: iuhoay (https://github.com/iuhoay)

## Development

This repository is configured as a Claude Code plugin. Changes to `marketplace.json` affect how the plugin appears in the Claude marketplace.

When modifying this repository:
- The marketplace.json file contains the plugin manifest
- Ensure the version is incremented when publishing updates
- Categories help users discover the plugin in the marketplace
