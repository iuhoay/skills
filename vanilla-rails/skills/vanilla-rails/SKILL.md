---
name: vanilla-rails
description: Design and review Rails applications using Vanilla Rails philosophy from 37signals/Basecamp. Emphasizes thin controllers, rich domain models, and avoiding unnecessary service layers. Use when analyzing Rails codebases, reviewing PRs, or refactoring toward simpler architecture. Triggers on "service layer", "service object", "thin controller", "rich model", "vanilla rails", "dhh style", "over-engineering", "unnecessary abstraction".
allowed-tools:
  - Grep
  - Glob
  - Read
  - Task
---

# Vanilla Rails

Design and review Rails applications using the Vanilla Rails philosophy from 37signals/Basecamp.

## Quick Start

Vanilla Rails embraces Rails's built-in patterns and avoids premature abstraction:

**Core Philosophy:** Thin controllers that directly invoke a rich domain model. No service layers or other artifacts unless genuinely justified.

```
┌─────────────────────────────────────────┐
│              CONTROLLERS                 │
│         (Thin - HTTP concerns only)      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│               MODELS                     │
│    (Rich - Business logic lives here)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          ACTIVE RECORD / DATABASE        │
└─────────────────────────────────────────┘
```

**Core Rule:** Don't add layers beyond what Rails provides unless you have a clear, justified reason.

## What Would You Like To Do?

1. **Review code changes** - Run `/vanilla:review` for Vanilla Rails architecture review
2. **Analyze codebase** - Run `/vanilla:analyze` to identify over-engineering
3. **Plan simplification** - Run `/vanilla:simplify [goal]` to plan refactoring toward Vanilla Rails
4. **Review PR/implementation** - I'll evaluate against Vanilla Rails principles

## Core Principles

### The Three Rules

1. **Thin Controllers** - Controllers only parse params and invoke model methods
2. **Rich Domain Model** - Business logic belongs in models
3. **No Premature Abstraction** - Don't create service layers by default

### Common Anti-Patterns

| Anti-Pattern | Example | Fix |
|--------------|---------|-----|
| Fat service | 100-line service with domain logic | Move logic to model |
| Anemic model | Model with only attributes and associations | Add business methods |
| Controller as orchestrator | Controller calling multiple services | Call rich model methods |
| Premature service | Simple CRUD wrapped in service | Use plain Active Record |
| Service explosion | DoSomethingService for every action | Most should be model methods |

See [Anti-Patterns Reference](references/anti-patterns.md) for complete list.

### When Services Are Actually OK

Services are justified when:
- Coordinating multiple models (orchestration, not domain logic)
- External API interactions
- Multi-step workflows with transaction boundaries
- Operations that don't naturally belong to any single model

```ruby
# OK: Service orchestrates multiple models
class Signup
  def create_identity
    Identity.create!(email_address: email_address)
    # ... coordinate other models ...
  end
end
```

## Style Preferences

### Conditional Returns
Prefer expanded conditionals over guard clauses (unless returning early at method start for non-trivial bodies).

```ruby
# Bad - Guard clause
def todos_for_new_group
  ids = params.require(:todolist)[:todo_ids]
  return [] unless ids
  @bucket.recordings.todos.find(ids.split(","))
end

# Good - Expanded conditional
def todos_for_new_group
  if ids = params.require(:todolist)[:todo_ids]
    @bucket.recordings.todos.find(ids.split(","))
  else
    []
  end
end
```

### Method Ordering
1. `class` methods
2. `public` methods (with `initialize` at top)
3. `private` methods

Order methods vertically by invocation order to help readers follow code flow.

### CRUD Controllers
Model endpoints as REST operations. Don't add custom actions - introduce new resources instead.

```ruby
# Bad
resources :cards do
  post :close
  post :reopen
end

# Good
resources :cards do
  resource :closure
end
```

### Visibility Modifiers
No newline under visibility modifiers; indent content under them.

```ruby
class SomeClass
  def some_method
    # ...
  end

  private
    def some_private_method
      # ...
    end
end
```

If a module only has private methods, mark `private` at top with extra newline but don't indent.

### Async Operations
Write shallow job classes that delegate to domain models:
- Use `_later` suffix for methods that enqueue jobs
- Use `_now` suffix for synchronous methods

```ruby
def relay_later
  Event::RelayJob.perform_later(self)
end

def relay_now
  # actual implementation
end
```

### Bang Methods
Only use `!` for methods with a counterpart without `!`. Don't use `!` to flag destructive actions.

## Pattern Catalog

| Pattern | Use When | Reference |
|---------|----------|-----------|
| Plain Active Record | Simple CRUD, no coordination needed | [plain-activerecord.md](references/patterns/plain-activerecord.md) |
| Rich Model API | Complex behavior single model should own | [rich-models.md](references/patterns/rich-models.md) |
| Concern | Shared behavior across models | [concerns.md](references/patterns/concerns.md) |
| Service/Form | Only when genuinely justified | [when-to-use-services.md](references/patterns/when-to-use-services.md) |

## Red Flags (Over-Engineering)

Run `/vanilla:analyze` to detect:

- 🔴 Service objects for simple operations
- 🔴 Business logic in services instead of models
- 🔴 Controllers with more than 10 lines
- 🔴 "Managers", "Handlers", "Processors" that are just proxies
- ⚠️ Anemic models (attributes + associations only)
- ⚠️ Domain logic scattered across service objects
- ⚠️ Unnecessary abstraction layers

## Examples

See [examples/](examples/) directory for before/after comparisons showing the Vanilla Rails approach.

## Philosophy

> "Vanilla Rails is plenty." - DHH

Most applications don't need layers beyond what Rails provides. Embrace:
- `ActiveRecord` models as the home for business logic
- Controllers as thin wrappers around model calls
- Callbacks and concerns for code organization
- Jobs and mailers called from models when appropriate

Resist:
- Service layers as default architecture
- Premature extraction
- "Clean Architecture" for simple CRUD
- Pattern-driven development

For more depth, read the [Vanilla Rails blog post](https://dev.37signals.com/vanilla-rails-is-plenty/).
