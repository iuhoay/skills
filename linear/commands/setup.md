# Linear CLI Setup

Configure the bundled Linear CLI without MCP.

## Usage

```text
/linear:setup
```

## Process

1. Locate `skills/linear/scripts/linear.mjs` relative to this plugin.
2. Install the `linear` symlink:

   ```bash
   node /absolute/path/to/linear.mjs install
   ```

3. Check that `~/.local/bin` is in `PATH`.
4. Confirm that the bundled OAuth application's registered callback is exactly `http://127.0.0.1:53682/callback`.
5. Run `linear auth login`. The CLI opens Linear in the browser and completes OAuth 2.0 + PKCE locally. Access and refresh credentials are stored in macOS Keychain when available, otherwise in a mode-0600 config file.
6. Verify with:

   ```bash
   linear auth status
   linear teams list
   ```

7. From each repository that needs defaults, save a machine-local mapping:

   ```bash
   linear context set --team ENG --project Platform
   linear context
   ```

   This writes `~/.config/linear-cli/repository-mappings.json` with mode `0600`. It lives outside Git and must never be copied into the plugin or a project repository.

A personal API key is only a fallback (`linear auth login --api-key`). Never ask the user to paste OAuth tokens or API keys into chat or place them in a repository file.
