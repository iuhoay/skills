# /question-it:interview

A full decision-tree interview to exhaustively stress-test a plan or design.

## Usage

```
/question-it:interview [plan, design, or decision to stress-test]
```

If no plan is given, ask what the user wants to stress-test first.

## What happens

1. **Restate** the plan in your own words to anchor the session
2. **Walk the decision tree** — one question at a time, each with your recommended answer
3. **Look up facts yourself** — never ask for anything the environment (files, git, tools) can answer
4. **Stop at shared understanding** — do nothing until the user confirms

## Notes

- This is the **manual deep-dive** entry point. For everyday use, the `question-it` skill auto-triggers whenever the user proposes a plan or asks a decision-laden question, and challenges it directly with fact-checked alternatives.
- Stateless: writes nothing, leaves no workspace behind
