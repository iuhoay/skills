# Concerns

Concerns (`ActiveSupport::Concern` modules) serve two distinct purposes in Vanilla Rails:

1. **Share behavior across models** — a capability several models need (e.g. `Readable`, `Searchable`), living in `app/models/concerns/`.
2. **Organize one rich model** — decompose a large model into cohesive, namespaced behavioral units (e.g. `Card::Closeable`, `Card::Golden`), each owning its own associations, scopes, callbacks, and methods. These live under the model (`app/models/card/closeable.rb`).

The second is the dominant Fizzy pattern: a `Card` that does a dozen things is composed from a dozen single-model concerns, not flattened into one giant class. A single-model concern is the *expected* home for organizing behavior — not a smell.

## When to Use

- A capability shared across multiple models
- A cohesive cluster of behavior on one model that owns its own associations/scopes/callbacks (namespaced under the model, e.g. `Card::Closeable`)
- Organizing a large model by functional area
- Mixing in behavior that doesn't fit an inheritance hierarchy

## The Fizzy Pattern

Based on [Fizzy](https://github.com/basecamp/fizzy) - a production Rails application from 37signals.

### Simple, Focused Modules

Each concern should do one thing well:

```ruby
# app/models/concerns/eventable.rb
module Eventable
  extend ActiveSupport::Concern

  included do
    has_many :events, as: :eventable, dependent: :destroy
  end

  def track_event(action, creator: Current.user, board: self.board, **particulars)
    if should_track_event?
      board.events.create!(action: "#{eventable_prefix}_#{action}", creator:, board:, eventable: self, particulars:)
    end
  end

  def event_was_created(event)
    # Template method - override in consuming model
  end

  private
    def should_track_event?
      true
    end

    def eventable_prefix
      self.class.name.demodulize.underscore
    end
end
```

### Template Methods

Provide hooks that models can override:

```ruby
module Searchable
  extend ActiveSupport::Concern

  included do
    after_create_commit :create_in_search_index
    after_update_commit :update_in_search_index
    after_destroy_commit :remove_from_search_index
  end

  def reindex
    update_in_search_index
  end

  private
    def create_in_search_index
      if searchable?
        search_record_class.create!(search_record_attributes)
      end
    end

    # ... other private methods ...

  # Models must implement:
  # - search_title: returns title string
  # - search_content: returns content string
  # - searchable?: returns whether this record should be indexed
end
```

### Model-Specific Concerns

For behavior specific to one model, namespace under that model:

```ruby
# app/models/card/eventable.rb
module Card::Eventable
  extend ActiveSupport::Concern

  include ::Eventable

  included do
    before_create { self.last_active_at ||= created_at || Time.current }
    after_save :track_title_change, if: :saved_change_to_title?
  end

  def event_was_created(event)
    transaction do
      create_system_comment_for(event)
      touch_last_active_at unless was_just_published?
    end
  end

  private
    def should_track_event?
      published?
    end

    def track_title_change
      if title_before_last_save.present?
        track_event "title_changed", particulars: { old_title: title_before_last_save, new_title: title }
      end
    end
end
```

### Usage in Models

```ruby
class Card < ApplicationRecord
  include Eventable, Searchable, Mentions, Taggable, Watchable

  # Model stays clean - behavior composed from concerns
end
```

## Anti-Pattern: Code-Slicing Concerns

Avoid concerns that group by "artifact type" rather than cohesive behavior:

```ruby
# BAD - Code-slicing by artifact type
module Validations
  # ALL validations in one place
end

module Associations
  # ALL associations in one place
end

module Scopes
  # ALL scopes in one place
end
```

These don't organize by behavior—they just spread related code across files.

## Concern Guidelines

1. **Cohesive behavior** - Each concern should do one thing well
2. **Self-contained** - Include necessary associations, callbacks, validations
3. **Template methods** - Provide hooks for customization
4. **Meaningful name** - Describe WHAT it does, not WHERE it goes
5. **Module composition** - Concerns can include other concerns
6. **Avoid deep nesting** - Flat modules are easier to follow

## When NOT to Use Concerns

- A trivial one-off method — put it directly in the model. Reach for a concern when the behavior is a cohesive *cluster* (associations + scopes + callbacks + methods), not a lone helper.
- Code-slicing by artifact type (all validations, all scopes in one module) rather than by behavior — see the anti-pattern above.
- Behavior that requires complex external dependencies (use a plain object or job instead).
- Sharing behavior between unrelated objects (use composition/delegation, not a mixin).

## Official Guidance

For more details on implementation and advanced usage of `ActiveSupport::Concern`, see the official documentation:
- [ActiveSupport::Concern API Documentation](https://api.rubyonrails.org/classes/ActiveSupport/Concern.html)
- [Active Support Core Extensions - Concerns](https://guides.rubyonrails.org/active_support_core_extensions.html#activesupport-concern)

## Best Practices from Rails Guides

1. **Naming Conventions**: Use suffixes like `-able` or `-ing` (e.g., `Searchable`, `Timestampable`, `Validatable`) to clearly indicate the behavior being added.
2. **Single Responsibility**: Each concern should encapsulate a single, specific aspect of functionality.
3. **Avoid Deep Nesting**: While concerns can include other concerns, keep hierarchies shallow to ensure the code remains understandable.
4. **Testing**: Write dedicated tests for your concerns to ensure they behave correctly when included in various models.

## Real-World Examples from Fizzy

| Concern | Purpose |
|---------|---------|
| `Eventable` | Track all significant actions as events |
| `Mentions` | Auto-detect and create @mentions |
| `Searchable` | Maintain full-text search index |
| `Attachments` | Handle ActionText attachments |
| `Watchable` | Allow users to watch for changes |

The key insight: **concerns encapsulate behavior, not just group code.**
