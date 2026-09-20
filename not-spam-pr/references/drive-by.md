# Drive-by changes

A hunk is required when dropping it makes the request fail or the tests go
red. Everything else is drive-by.

## In scope

- The production code that implements the request
- Replacing or deleting the existing implementation the request has to go through — even if that diff is larger than a wrapper
- Tests that fail without the change and pass with it
- Call sites that would be wrong, wouldn't compile, or wouldn't boot
- A migration or schema dump the feature needs
- Locale strings the new UI needs
- A lockfile update because the request added a dependency

## Out of scope

- A new wrapper, service, or adapter around code on the request path you could have changed
- Refactoring a neighboring method you happened to read
- RuboCop / prettier / eslint autofix on files you did not functionally touch
- README, CHANGELOG, CONTRIBUTING unless the user asked, or the last similar
  commits in this repo include them
- Comment or yardoc polish on existing code
- Extracting a helper "while I'm here"
- Renaming for taste
- A second bug you noticed (mention it; don't mix it)
- CI, editorconfig, gitignore, VS Code settings unless the request needs them
- Bumping an unrelated dependency

## Exceptions

The user named the extra in the same request ("also rename X", "and update the
README") — that extra is now part of the one-sentence request.

A test file you must edit because the production change changed its contract
is not drive-by. Cleaning assertions in a different example in that file is.

## After the work

If you spotted a real adjacent problem, say so in the reply. Do not sneak it
into the diff, a second commit, or a second PR unless the user asks.
