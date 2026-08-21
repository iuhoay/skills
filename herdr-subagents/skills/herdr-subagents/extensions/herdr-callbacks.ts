// herdr-callbacks — callback bridge for herdr subagents
// Watches a per-pane callback directory for completion files written by
// subagents running in herdr panes. When a file appears, its content is
// injected into this session as a user message, so the parent agent wakes up
// and can collect the result from the subagent pane.
//
// Per-pane isolation: EVERY pi instance loads this extension (parent and
// subagents alike), so a shared directory would race — two watchers grabbing
// the same file. Instead each instance watches
// ~/.pi/agent/callbacks/<HERDR_PANE_ID>/ (falling back to the shared dir when
// HERDR_PANE_ID is absent). A subagent writes the callback into the parent's
// pane directory; the parent embeds the exact path in the task prompt.
//
// Protocol: the parent tells the subagent the exact callback path in the task
// prompt, e.g. write the result to
// ~/.pi/agent/callbacks/<parent-pane>/ci.done. Content is the message; the
// file name identifies the source. Files are removed only after the message
// is confirmed sent (one-shot; never silently lost).
//
// Lifecycle: per pi docs, background resources (watcher/timer) start in
// session_start and are closed in session_shutdown. On /reload pi emits
// session_shutdown for the old extension instance, then session_start for the
// new one, so no watchers leak and headless (print/JSON) modes never hang.

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const POLL_MS = 2000;
const EMPTY_FILE_MAX_AGE_MS = 30_000;

type NotifyFn = (message: string, type?: "info" | "warning" | "error") => void;

function noopNotify(): NotifyFn {
  return () => {};
}

export default function (pi: ExtensionAPI) {
  const paneId = process.env.HERDR_PANE_ID;
  // Per-pane isolation: each pi instance (parent and subagents) watches its
  // own subdirectory, so instances never race on the same file. Fall back to
  // the shared directory outside herdr.
  const callbackDir = paneId
    ? path.join(os.homedir(), ".pi", "agent", "callbacks", paneId)
    : path.join(os.homedir(), ".pi", "agent", "callbacks");
  let watcher: fs.FSWatcher | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  // notify lives on ctx.ui, NOT on the context object itself — capture the
  // function, never the whole context.
  let notify: NotifyFn = noopNotify();
  const inFlight = new Set<string>();

  function safeNotify(message: string, type: "info" | "warning" | "error") {
    try {
      notify(message, type);
    } catch {
      /* cosmetic only — never let a notification break delivery */
    }
  }

  async function deliver(file: string): Promise<boolean> {
    const full = path.join(callbackDir, file);
    if (inFlight.has(full)) {
      return false; // watch event and poll already racing on this file
    }
    inFlight.add(full);
    try {
      let content: string;
      try {
        const st = fs.lstatSync(full);
        if (!st.isFile()) {
          return false; // symlink or special file — never trust it
        }
        const before = fs.statSync(full);
        content = fs.readFileSync(full, "utf-8").trim();
        // stability check: skip if the file is still being written
        if (fs.statSync(full).mtimeMs !== before.mtimeMs) {
          return false;
        }
      } catch {
        return false; // file vanished mid-read; next scan may re-see it
      }

      if (!content) {
        // Bound the retry: a stale empty file is cleaned up, not polled forever.
        try {
          const age = Date.now() - fs.statSync(full).mtimeMs;
          if (age > EMPTY_FILE_MAX_AGE_MS) {
            fs.unlinkSync(full);
            safeNotify(`Removed stale empty callback ${file}`, "warning");
          }
        } catch {
          /* gone already */
        }
        return false;
      }

      // Deliver first, delete only after the send is confirmed.
      await pi.sendUserMessage(
        `[subagent-callback:${file}] ${content}`,
        { deliverAs: "steer" },
      );
      fs.unlinkSync(full);
      safeNotify(`Subagent callback: ${file}`, "info");
      return true;
    } catch {
      // Send failed (e.g. session teardown) — keep the file for retry.
      return false;
    } finally {
      inFlight.delete(full);
    }
  }

  function scan() {
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(callbackDir).filter((f) => f.endsWith(".done"));
    } catch {
      return; // dir not created yet; start() creates it
    }
    for (const file of entries) {
      void deliver(file);
    }
  }

  function start() {
    if (timer) {
      return; // idempotent within one extension instance
    }
    try {
      fs.mkdirSync(callbackDir, { recursive: true, mode: 0o700 });
    } catch {
      /* read-only home; polling will retry */
    }
    scan(); // files written before this session started
    try {
      watcher = fs.watch(callbackDir, (_eventType, filename) => {
        if (typeof filename === "string" && filename.endsWith(".done")) {
          scan();
        }
      });
      // Directory deletion emits an error event — polling takes over.
      watcher.on("error", () => {});
    } catch {
      /* polling alone covers it */
    }
    timer = setInterval(scan, POLL_MS);
    timer.unref?.();
    safeNotify(`Watching ${callbackDir} for subagent callbacks`, "info");
  }

  function stop() {
    watcher?.close();
    watcher = undefined;
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  pi.on("session_start", (_event, ctx) => {
    notify = ctx.ui?.notify?.bind(ctx.ui) ?? noopNotify();
    start();
  });

  pi.on("session_shutdown", () => {
    stop();
  });
}
