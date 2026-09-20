# Commit and PR voice

Read the repo before writing. The house style is whatever `git log` shows, not
a generic "good PR" template.

## Protocol

```bash
git log -8 --format='%s%n%b---'
```

If a PR is involved:

```bash
gh pr list --state merged --limit 5 --json title,body
```

And check for a template:

```bash
ls .github/PULL_REQUEST_TEMPLATE.md .github/pull_request_template.md 2>/dev/null
```

If a template exists, fill it. If it does not, do not invent one.

## Match

- Title shape of the last 8 commits (conventional commits, ticket prefixes,
  or bare one-liners)
- Body length of the last 8 — including empty
- Language of the last 8
- Ticket IDs only when the user asked or those commits use them

If the title is enough, skip the body.

## Do not invent

These are spam tells unless the last 8 commits already use them:

- Opening with "This PR"
- Emoji in the title or body
- Headings: Summary, Changes, Test plan, Checklist
- Co-authored-by, Generated-by, Made-with, "Generated with Claude/Codex/Amp"
  trailers you add yourself (the harness may append one; don't add another)
- A bullet list of every file touched
- Marketing tone: robust, comprehensive, enhance, seamless, leverage

## Don't upgrade the house style

A repo of one-line commits does not want a three-paragraph PR body from you.
A repo of conventional commits does not want a joke title. Write like the
people who already ship here.
