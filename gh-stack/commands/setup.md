# gh stack — Setup

Install and verify the official GitHub stacked PRs extension.

## Usage

```text
/gh-stack:setup
```

## Process

1. Check whether the extension is already installed:

   ```bash
   gh extension list | grep stack
   ```

2. Install it if missing:

   ```bash
   gh extension install github/gh-stack
   ```

3. Verify:

   ```bash
   gh stack --help
   gh stack version
   ```

4. Optional: install a short alias so the stack commands run as `gs ...`:

   ```bash
   gh stack alias
   ```

5. In each repository where stacked PRs will be used, confirm the extension can see the repository's remote and default branch:

   ```bash
   gh repo view
   git branch --show-current
   ```

Requires the GitHub CLI (`gh`) and a repository with a remote on GitHub. The extension stores stack metadata in `.git/gh-stack` (a JSON file, not committed); interrupted-rebase state lives in `.git/gh-stack-rebase-state`. No credentials are handled beyond what `gh auth` already manages.
