# Before / after

## Diff: fix a nil guard, leave the neighbor alone

**Request:** `User#display_name` blows up when `profile` is missing.

**Before (spam):** also extract `User#formatted_email`, reformat `user.rb`,
add a README note, and rubocop three other models.

**After:** one guard, one test that would have caught it. Mention the email
helper in the reply if it is actually wrong — do not mix it in.

## Voice: match `git log`, don't template

**Repo log:**

```
fix: nil display_name without a profile
feat: add profile.display_name
```

**Before (spam):**

```
## Summary
This PR improves user display name handling to be more robust.

## Changes
- Added a nil guard
- Refactored related helpers
- Updated docs

## Test plan
- [ ] Verify in UI
```

**After:**

```
fix: nil display_name without a profile
```

No body. The last commits didn't have one either.
