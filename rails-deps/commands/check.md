# Check Installed Gems

Check which recommended Rails development dependencies are installed in the current project.

## Usage

```
/rails-deps:check
```

## What This Does

1. Reads the `Gemfile` to check for recommended gems
2. Checks if gems are installed in `Gemfile.lock`
3. Provides installation commands for missing gems

## Recommended Gems

- `strong_migrations` - Catch unsafe migrations
- `herb` - HTML+ERB tooling
- `bullet` - N+1 query detection
- `letter_opener` - Email preview

## Example Output

```
=== Rails Dependencies Check ===

✅ strong_migrations - installed (v1.6.0)
❌ herb - not found
✅ bullet - installed (v7.1.0)
⚠️  letter_opener - in Gemfile but not installed
```
