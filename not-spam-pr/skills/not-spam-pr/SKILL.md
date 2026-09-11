---
name: not-spam-pr
description: >
  Stop spam PRs: only the change required for the request to be correct and
  green, written in the repo's own commit/PR voice. On the request path,
  change or delete the existing implementation rather than wrapping it — a
  smaller overlay is still spam. Load when implementing a feature or bugfix,
  or when writing a commit message, PR title, or PR body. Do not wait for
  the user to say "stop spam PR", "spam PR", "drive-by", or "keep it small".
  Skip review of other people's PRs, planning and question-it, gh-stack
  mechanics, Linear issue work, and extras the user explicitly asked for.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Stop Spam PR

House style during implementation and when writing git/PR text. Stop spam
PRs: no drive-by files, no templated PR body.

## Auto-trigger

Load when:

- Implementing a feature or bugfix
- Writing a commit message, PR title, or PR body

Do not wait for "stop spam PR" / "spam PR" / "drive-by" / "keep it small".

Skip:

- Reviewing someone else's PR
- Planning, "should I", confirmation (that's question-it)
- gh-stack init/sync/merge/navigation
- Linear issue search/create/update
- Extras the user named in the same request — those are now in scope

## Diff

Name the request in one sentence. Every file and hunk must serve that sentence.

The test: if dropping the hunk would not make the request fail or the tests
go red, it is drive-by. Leave it out.

A smaller overlay is still spam. If the request has to go through existing
code, changing or deleting that code is in scope even when the diff is
larger than a wrapper.

**In:** production code the request needs, including replacing or deleting
the existing implementation on the request path; tests that fail without
the change and pass with it; call sites that would be wrong, wouldn't
compile, or wouldn't boot; schema, locales, or lockfile required by the
change.

**Out:** a new wrapper, service, or adapter around code you could have
changed; adjacent refactors; formatting on files you did not functionally
touch; README/CHANGELOG unless the user asked or recent similar commits in
this repo include them; comment polish; helper extractions "while here";
taste renames; a second bug you noticed; CI, editorconfig, or gitignore
unless the request needs them.

If you notice a real adjacent problem, mention it after the work. Do not mix
it into the diff.

See [references/drive-by.md](references/drive-by.md).

## Replace, don't wrap

Before adding code on the request path, ask whether the existing
implementation is itself the problem. Prefer changing or deleting it
over wrapping it.

The old file's services, wrappers, and stale APIs are not a pattern you
must continue. Tests, public APIs, and other house styles still are.

A delete-and-rewrite of the request path is not drive-by. A new layer
that exists so the old shape can stay is.

## Voice

Before writing a commit message or PR title/body, read the repo:

```bash
git log -8 --format='%s%n%b---'
```

If opening or editing a PR, also read recent merged PR titles/bodies and
`.github/PULL_REQUEST_TEMPLATE.md` if it exists.

Match that voice. Do not upgrade it.

- Conventional commits only if the last 8 use them
- Empty body if the last 8 have empty bodies
- Same language as the last 8
- Ticket IDs only if the user asked or those commits use them

Do not invent:

- "This PR …"
- Emoji (unless the last 8 use them)
- Summary / Changes / Test plan / Checklist headings (unless a PR template in the repo asks for them)
- Co-authored-by / Generated-by / Made-with trailers you add yourself
- A file-by-file changelog
- Marketing words (robust, comprehensive, enhance, seamless)

See [references/voice.md](references/voice.md).

## Hard rules

- Don't add a file the one-sentence request does not need.
- Don't wrap code on the request path when you can change or delete it.
- Don't reformat a file you didn't functionally change.
- Don't mix a second concern into the same diff.
- Don't write commit or PR text without reading `git log` first.
- Don't open a template the repo doesn't use.
- Don't silently open extra commits or extra PRs the user didn't ask for.

See [examples/before-after.md](examples/before-after.md).
