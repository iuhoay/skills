# herdr-subagents — Spawn

Spawn a pi subagent in a sibling herdr pane, submit a task, and collect the result.

## Usage

```text
/herdr-subagents:spawn <task>
```

## Process

Follow the workflow in `SKILL.md`:

1. Guardrail: verify `HERDR_ENV=1`; if not set, stop and say you are not inside herdr.

2. Inspect before spawning:

   ```bash
   herdr agent list
   herdr pane layout --pane "$HERDR_PANE_ID"
   ```

3. Split a sibling pane (never steal focus, keep the caller's cwd):

   ```bash
   herdr pane split --current --direction right --cwd "$PWD" --no-focus
   ```

   Read the new pane id from `.result.pane.pane_id`.

4. Start the subagent with a unique name matching `[a-z][a-z0-9_-]{0,31}`:

   ```bash
   herdr agent start <name> --kind pi --pane <pane-id>
   ```

5. Submit the task and wait for the settled state:

   ```bash
   herdr agent prompt <name> "<task>" --wait --timeout 120000
   ```

6. Collect the result:

   ```bash
   herdr agent read <name> --source recent-unwrapped --lines 120
   ```

   If the transcript ends early, ask the subagent to write its full response to a temp file and reply with the path, then read the file.

7. Close the pane you created and report the outcome:

   ```bash
   herdr pane close <pane-id>
   ```

The subagent is a real pi process in a real pane — the user can watch it work, detach, and reattach. Never close panes you did not create.

For long-running tasks, prefer **fire-and-forget**: omit `--wait` so the call returns immediately, end the turn, and let the `herdr-callbacks` extension deliver the subagent's completion file back into this session. The callback path must be your own pane directory — embed `~/.pi/agent/callbacks/$HERDR_PANE_ID/<name>.done` (expanded by your shell) in the task prompt; see the SKILL.md "Fire-and-forget with callback" section.
