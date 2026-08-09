---
name: gh-stack
description: Manage GitHub stacked pull requests with the official gh stack extension (github/gh-stack). Use when creating, submitting, syncing, rebasing, restructuring, or navigating stacks of dependent pull requests; when the user says "stacked PR", "PR stack", "stack these branches", or wants to split a large change into a chain of smaller dependent PRs.
allowed-tools:
  - Bash
  - Read
  - Grep
---

# GitHub Stacked PRs

Stacked PRs break a large change into a chain of pull requests that build on each other. The official `gh stack` extension creates and manages the stack locally, then pushes it to GitHub as a stack of PRs.

## Preconditions

Check that the extension is installed before the first use in a session:

```bash
gh extension list | grep stack
```

If missing, install it:

```bash
gh extension install github/gh-stack
```

Then confirm it works:

```bash
gh stack --help
```

## Core workflow

```bash
# 1. Start a stack from the current branch
gh stack init

# Or turn existing branches into a stack (bottom to top; existing branches are auto-adopted)
gh stack init feat/auth feat/api feat/ui

# 2. Add branches as you go; commit staged changes in the same step
gh stack add -Am "Add user authentication" feat/auth
gh stack add -m "Fix login bug"                # branch name auto-generated from the message

# 3. Push all branches and create/update the PR stack
gh stack submit --auto --open                  # non-interactive, PRs ready for review

# 4. Keep everything in sync with the remote
gh stack sync
```

## Agent usage notes

- **Non-interactive by default.** `gh stack submit` opens an interactive single-screen editor in a terminal. In an agent session pass `--auto` to skip it (auto-generated titles, PRs created as **drafts** unless `--open` is passed). `gh stack modify`, `gh stack switch`, and argument-less `gh stack checkout` (stack menu) are interactive TUIs — do not run them non-interactively; always pass explicit arguments, or use `--abort`/`--continue` variants where applicable.
- **`sync` never opens PRs.** It fetches, fast-forwards the trunk, cascade-rebases, pushes (`--force-with-lease --atomic`), and links *existing* open PRs into a remote stack (only when two or more PRs exist). "Stack synced" means the remote stack object matches local; "Branches synced" means branches were rebased/pushed but no remote stack exists yet. Run `submit` when PRs need to be created.
- **On rebase conflict**, `sync` restores all branches to their pre-sync state; resolve interactively with `gh stack rebase --continue` (or `--abort`).
- **Read state with JSON** for machine-consumable output: `gh stack view --json`; use `--short` for compact human output.
- **Prune merged branches** with `gh stack sync --prune`. If the checked-out branch would be pruned, you are moved to the first active branch or the trunk.
- **`unstack` is blocked** while every PR in the stack is queued for merge, merging, or already merged. Use `--local` to only drop local tracking while keeping the stack on GitHub.
- Navigation commands (`bottom`, `top`, `up [n]`, `down [n]`, `trunk`) skip merged branches automatically.
- **External tools (jj, Sapling, ghstack, git-town, ...):** `gh stack link <branch-or-pr> <branch-or-pr>...` creates or updates a remote stack from arguments alone, without local tracking. Branches are pushed automatically; PRs are created for branches without one, with correct base-branch chaining. Arguments are bottom to top; numbers are treated as PR numbers when a matching PR exists.

## Command reference

| Command | Purpose |
| --- | --- |
| `gh stack init [branches...]` | Start a stack; existing branches are adopted automatically (the legacy `--adopt` flag is deprecated), `--base` sets a non-default trunk, `--prefix X --numbered` auto-names branches |
| `gh stack add [branch]` | Add a branch on top of the current stack; `-A`/`-u` stage changes, `-m` commits |
| `gh stack submit [--auto] [--open]` | Push all branches, create/update PRs and the remote stack |
| `gh stack sync [--prune]` | Fetch, fast-forward trunk, cascade-rebase, push, sync PR state |
| `gh stack rebase [branch] [--no-trunk] [--downstack] [--upstack] [--continue] [--abort] [--preserve-dates] [--remote R]` | Cascading rebase across the stack; `[branch]` starts the cascade from that branch, `--preserve-dates` keeps author dates on rewritten commits |
| `gh stack push [--remote R]` | Push all stack branches (safe: `--force-with-lease --atomic`) |
| `gh stack unstack [--local]` | Delete the stack locally and on GitHub, or only local tracking |
| `gh stack modify [--abort] [--continue]` | Interactive TUI to drop/fold/insert/reorder/rename branches |
| `gh stack checkout [<pr> | <url> | <branch>]` | Check out a stack; with no args, menu of local stacks; discovers remote stacks from a PR number/URL |
| `gh stack link <arg> <arg>...` | Link PRs into a stack without local tracking (for external tools) |
| `gh stack view [--short] [--json]` | Show the stack with PR status |
| `gh stack bottom / top / up [n] / down [n] / trunk / switch` | Navigation |
| `gh stack alias [name]` | Install a `gs`-style shortcut for `gh stack` |

Status icons in `gh stack view`: `✓` merged, `◎` queued, `○` open, `⚠` needs rebase.

## Examples

End-to-end: split a large feature into three dependent changes and open the PR stack.

```bash
gh stack init
gh stack add -Am "Add user authentication" feat/auth
gh stack add -Am "Add API routes for sessions" feat/api
gh stack add -Am "Add settings page" feat/settings
gh stack submit --auto --open   # push branches, create PRs, build the remote stack
```

Iterating on review feedback:

```bash
gh stack checkout feat/api            # jump to the middle branch
# ... fix review comments ...
git commit -am "Address review feedback"
gh stack sync                         # cascade-rebases upper branches onto the fix, pushes all

# Push only, without rebasing or touching the trunk
gh stack push
```

Rebasing:

```bash
gh stack rebase              # trunk moved on; rebase the whole stack onto it
gh stack rebase --no-trunk   # skip the trunk; only chain branches onto each other
gh stack rebase --downstack  # only trunk → current branch
gh stack rebase --upstack    # only current branch → top
gh stack rebase feat/api     # start the cascade from a specific branch
```

Recovering from a sync conflict (`sync` restored all branches to their pre-sync state):

```bash
gh stack rebase --continue   # after resolving conflicts manually
gh stack rebase --abort      # give up; restore all branches
```

Picking up a stack from a PR number/URL (someone else's stack, another machine, or a fresh clone):

```bash
gh stack checkout 42                                  # discovers the whole stack via the GitHub API
gh stack checkout https://github.com/owner/repo/pull/42
gh stack checkout feat/api                            # switch to a locally tracked stack by branch
```

Linking PRs into a stack without local tracking (external tools: jj, Sapling, git-town):

```bash
gh stack link feat/auth feat/api feat/ui   # bottom to top; branches pushed, PRs created as needed
gh stack link 42 43 44                     # PR numbers work too
```

Cleaning up merged stacks:

```bash
gh stack sync --prune     # delete merged branches locally and on GitHub
gh stack unstack          # remove the stack entirely (blocked while any PR is queued/merging/merged)
gh stack unstack --local  # keep the GitHub stack, drop local tracking only
```

## Safety

- `submit`/`sync` push with `--force-with-lease` and `--atomic`; rebase/sync conflicts restore branches automatically — but still confirm before running destructive operations (`unstack`, `modify` drops/folds).
- Never assume a stack state from memory; check `gh stack view` or `git branch` before restructuring.
