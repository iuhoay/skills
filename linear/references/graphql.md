# Linear GraphQL Escape Hatch

Use `linear graphql` only when the high-level CLI commands do not cover an operation.

```bash
linear graphql \
  --query-file /tmp/query.graphql \
  --variables-file /tmp/variables.json
```

Both files should contain valid GraphQL/JSON. The CLI returns the GraphQL `data` object as JSON and exits non-zero when Linear returns HTTP or GraphQL errors.

Prefer query variables over interpolating user input into GraphQL text. Delete temporary files after the call. Never place credentials in query or variables files; authentication is supplied by the CLI.
