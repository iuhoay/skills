---
name: herdr-subagents
description: Spawn and coordinate subagents as real herdr panes. Use when the user asks to delegate work to subagents — review, implement, research, or parallel tasks — while running inside herdr; when the user says "subagent", "spawn an agent", "delegate to", "parallel agents", "use herdr panes", or wants visible/detachable agent workers. Requires HERDR_ENV=1.
allowed-tools:
  - Bash
  - Read
  - Grep
---

# Herdr Subagents

Subagents are real coding-agent processes running in sibling herdr panes — visible in the TUI, detachable, with herdr tracking their idle/working/blocked state. The parent agent (you) orchestrates them through the `herdr` CLI.

## Guardrail

Before doing anything, verify this agent is inside a herdr-managed pane:

```bash
test "${HERDR_ENV:-}" = 1
```

If the check fails, say you are not running inside herdr and stop. Never control a herdr session you do not own.

## How it works

- Each subagent is a separate `pi` process in its own pane, with its own context window and session file.
- `herdr agent start` waits for the subagent to be detected and ready before returning (default 30s timeout).
- State (`idle`/`working`/`blocked`/`done`) comes from herdr's agent detection, not from guesswork.
- The subagent shares your working directory unless you pass a different `--cwd` at split time.

## Workflow

### 1. Inspect before spawning

```bash
herdr agent list                                  # existing agents and unique names
herdr pane current --current                      # your own pane id
herdr pane layout --pane "$HERDR_PANE_ID"         # pick the right split direction
```

Agent names must match `[a-z][a-z0-9_-]{0,31}` and be unique among live agents.

### 2. Split a sibling pane and start the subagent

Default to a sibling pane in the current tab, current directory, and never steal focus:

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

Read the new pane id from `.result.pane.pane_id` in the JSON response — never guess it. Split a wide pane to the right, a narrow or tall pane down; avoid repeated same-direction splits.

Then start a pi subagent in that pane with a useful name:

```bash
herdr agent start reviewer --kind pi --pane <pane-id>
```

Pass native agent arguments after `--` (e.g. a specific model or cwd). If the pane is at a shell prompt and the agent does not appear within the timeout, inspect the pane with `herdr pane read <pane-id> --lines 60` before retrying.

### 3. Submit the task

```bash
herdr agent prompt reviewer "<task>" --wait --timeout 120000
```

`--wait` blocks until the first settled `idle`, `done`, or `blocked` state. The task prompt must be self-contained: the subagent has its own context and only sees what you tell it, plus the shared filesystem.

Failure mode: a prompt submitted from a non-working state must produce an observed lifecycle change within five seconds, or the CLI returns `agent_prompt_stalled` instead of waiting. Also, `--wait` tracks lifecycle state, not individual turns — if the subagent was already working, completion of the active turn may satisfy it. On either symptom, inspect `herdr agent read <name> --source recent-unwrapped` and re-submit if the prompt never landed; use `--until <status>` only when you need a specific state.

### 4. Inspect and collect the result

```bash
herdr agent get reviewer                         # lifecycle state, session file, diagnostics
herdr agent read reviewer --source recent-unwrapped --lines 120
```

`recent-unwrapped` joins soft wraps and is the right source for transcripts. If the read ends too early, the subagent's TUI may be on the terminal's alternate screen — rows that leave it never enter herdr's scrollback. Fallback: ask the subagent to write its complete response to a file in a temp directory and reply only with the path, then read that file.

If the agent is `blocked`, read its output before sending input:

```bash
herdr agent read reviewer --source recent-unwrapped --lines 120
herdr agent send-keys reviewer ctrl+c             # or esc — only after inspecting
```

### 5. Clean up

```bash
herdr pane close <pane-id>
```

Only close panes you created. Never close workspaces, tabs, or panes that existed before, and never run `herdr server stop`.

## Fire-and-forget with callback

For long-running work (watching CI, waits, background research), do not block on `--wait`. Delegate, end your turn, and let the completion come back to you:

1. Submit the task **without** `--wait` — the call returns immediately, and the task prompt must include the exact callback path (your pane's directory, so the file lands where YOUR watcher listens — see protocol below):

   ```bash
   herdr agent prompt watcher "watch CI; when it finishes, write the result to ~/.pi/agent/callbacks/$HERDR_PANE_ID/ci.done"
   ```

2. End your turn and keep serving the user.

3. The subagent writes its completion file. The `herdr-callbacks` extension (see Install below) injects it into your session as a user message:

   ```
   [subagent-callback:ci.done] CI passed, 42 tests green
   ```

4. On that message, collect the result (`herdr agent read watcher --source recent-unwrapped --lines 120`) and close the pane.

Callback protocol:

- Every pi instance loads this extension — parent and subagents alike. A shared directory would race: whichever watcher grabs the file first delivers it (possibly to the wrong session) and deletes it. Isolation is per-pane: this extension watches `~/.pi/agent/callbacks/<HERDR_PANE_ID>/` in your session, so the file must be written there. **Always embed the exact callback path in the task prompt** — `$HERDR_PANE_ID` in the parent shell expands to the parent's pane id, and the subagent inherits the parent's pane id only if you pass it explicitly.
- Files are named `<source>.done`; the file name identifies the subagent, the content is the message.
- Files are one-shot — deleted after delivery. An empty file is retried, so write content atomically (`echo "..." > file`, not `touch`).
- The message is delivered with `deliverAs: "steer"`: if you are mid-turn it queues and lands before your next LLM call — callbacks are never lost.
- `herdr notification show "..."` is the user-visible channel (for the human, not for you); the callback file is your channel.

## Install

The callback bridge is a pi extension shipped with this skill. **It is pi-only**: it runs on pi's extension API (`sendUserMessage`), so Claude Code or codex users get the orchestration workflow but not the callback delivery. The file protocol itself is agent-agnostic — for other agents, watch `~/.pi/agent/callbacks/` and inject the content with that agent's own mechanism (e.g. a Claude Code hook).

1. Copy (or symlink) it into pi's extension directory — run from the repo root (the path below is repo-relative, not skill-relative):

   ```bash
   mkdir -p ~/.pi/agent/extensions
   cp herdr-subagents/skills/herdr-subagents/extensions/herdr-callbacks.ts ~/.pi/agent/extensions/herdr-callbacks.ts
   ```

   If you installed the skill via the skills CLI, the same file ships inside the skill directory (`extensions/herdr-callbacks.ts` relative to the SKILL.md).

2. Run `/reload` in pi (built-in, keeps the session) or restart pi. The watcher starts at module load and survives reloads; expect a `Watching ~/.pi/agent/callbacks/...` notification.

## Parallel and chained work

- **Parallel**: split one pane per subagent, give each a unique name, submit all tasks, then wait for and collect each. Cap parallel subagents at what the machine and your context can sensibly track (herdr has no hard limit; use judgment).
- **Chained**: run the next subagent after collecting the previous result, passing the result inside the new task prompt. There is no `{previous}` placeholder — you carry the value.

## Coordination rules

- Always use `--no-focus` for background subagents unless the user asked to switch context.
- Always target by explicit pane id or unique agent name — never the UI-focused pane, which may belong to the user.
- Parse ids and state from JSON responses; do not derive them from examples or sidebar order.
- Report each subagent's outcome to the user: name, what it produced, where the result lives, and whether the pane was closed.
- A subagent that needs user input ends `blocked` — surface its question to the user instead of answering for it.
