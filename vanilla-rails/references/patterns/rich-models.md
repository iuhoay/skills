# Rich Models

Models should be the home of business logic in Vanilla Rails. Anemic models (with only attributes and associations) are an anti-pattern.

## What Makes a Model Rich?

A rich model has:
- **Intention-revealing methods** - State changes that clearly express intent
- **Query methods** - Boolean methods for state queries
- **Domain rules** - Validations and business logic
- **Scopes** - Common queries as class-level APIs
- **Concerns** - Behavior organized into cohesive modules

## The Fizzy Pattern

Based on [Fizzy](https://github.com/basecamp/fizzy) - a production Rails application from 37signals.

### Models Composed of Concerns

The main model stays clean. Behavior is organized into concerns:

```ruby
class Card < ApplicationRecord
  include Accessible, Assignable, Attachments, Broadcastable, Closeable,
    Colored, Commentable, Entropic, Eventable, Exportable, Golden,
    Mentions, Multistep, Pinnable, Postponable, Promptable, Readable,
    Searchable, Stallable, Statuses, Taggable, Triageable, Watchable

  belongs_to :board
  belongs_to :creator, class_name: "User", default: -> { Current.user }

  # Simple domain methods
  def move_to(new_board)
    transaction do
      update!(board: new_board)
      events.update_all(board_id: new_board.id)
    end
  end

  def filled?
    title.present? || description.present?
  end

  private
    def assign_number
      self.number ||= account.increment!(:cards_count).cards_count
    end
end
```

### State Changes with Dedicated Models

Track state with dedicated models, not boolean columns:

```ruby
module Card::Closeable
  extend ActiveSupport::Concern

  included do
    has_one :closure, dependent: :destroy

    scope :closed, -> { joins(:closure) }
    scope :open, -> { where.missing(:closure) }
  end

  def closed?
    closure.present?
  end

  def open?
    !closed?
  end

  def close(user: Current.user)
    unless closed?
      transaction do
        not_now&.destroy
        create_closure! user: user
        track_event :closed, creator: user
      end
    end
  end

  def reopen(user: Current.user)
    if closed?
      transaction do
        closure&.destroy
        track_event :reopened, creator: user
      end
    end
  end
end
```

### Intention-Revealing Methods

```ruby
module Card::Golden
  extend ActiveSupport::Concern

  included do
    has_one :goldness, dependent: :destroy
    scope :golden, -> { joins(:goldness) }
  end

  def golden?
    goldness.present?
  end

  def gild
    create_goldness! unless golden?
  end

  def ungild
    goldness&.destroy
  end
end
```

### Complex State Transitions

```ruby
module Card::Postponable
  extend ActiveSupport::Concern

  included do
    has_one :not_now, dependent: :destroy
    scope :postponed, -> { open.published.joins(:not_now) }
    scope :active, -> { open.published.where.missing(:not_now) }
  end

  def postponed?
    open? && published? && not_now.present?
  end

  def active?
    open? && published? && !postponed?
  end

  def auto_postpone(**args)
    postpone(**args, event_name: :auto_postponed)
  end

  def postpone(user: Current.user, event_name: :postponed)
    transaction do
      send_back_to_triage(skip_event: true)
      reopen
      activity_spike&.destroy
      create_not_now!(user: user) unless postponed?
      track_event event_name, creator: user
    end
  end

  def resume
    transaction do
      reopen
      activity_spike&.destroy
      not_now&.destroy
    end
  end
end
```

### Async Operations with _later Pattern

```ruby
module Card::Stallable
  extend ActiveSupport::Concern

  STALLED_AFTER_LAST_SPIKE_PERIOD = 14.days

  included do
    has_one :activity_spike, dependent: :destroy
    scope :stalled, -> { open.active.with_activity_spikes.where(...) }

    before_update :remember_to_detect_activity_spikes
    after_update_commit :detect_activity_spikes_later, if: :should_detect_activity_spikes?
  end

  def stalled?
    if activity_spike.present?
      open? && last_activity_spike_at < STALLED_AFTER_LAST_SPIKE_PERIOD.ago
    end
  end

  def detect_activity_spikes
    Card::ActivitySpike::Detector.new(self).detect
  end

  private
    def detect_activity_spikes_later
      Card::ActivitySpike::DetectionJob.perform_later(self)
    end
end
```

### Smart Defaults in Associations

```ruby
belongs_to :creator, class_name: "User",
  default: -> { Current.user }

belongs_to :account, default: -> { board.account }
```

### Case/When Scopes for Dynamic Filtering

```ruby
scope :indexed_by, ->(index) do
  case index
  when "stalled" then stalled
  when "postponing_soon" then postponing_soon
  when "closed" then closed
  when "not_now" then postponed.latest
  when "golden" then golden
  when "draft" then drafted
  else all
  end
end

scope :sorted_by, ->(sort) do
  case sort
  when "newest" then reverse_chronologically
  when "oldest" then chronologically
  when "latest" then latest
  else latest
  end
end
```

## Model Boundaries

Models should NOT:
- Access `Current` directly in business logic (use default params or keyword arguments)
- Call mailers directly (use callbacks or concerns at edges)
- Make external API calls (use jobs/services)

These violations create coupling that breaks in background jobs and tests.

Keep models focused on **domain logic** - the rules and behaviors that define what your application IS about.

## Signs of Anemic Models

If you see these, enrich your models:
- All business logic in services
- Controllers doing business calculations
- Models with only `has_many`, `belongs_to`, and `validates`
- "Manager" or "Handler" classes that work on models
- Service objects named after what models should do

## How to Enrich Anemic Models

### Step 1: Identify Operations

What operations are done TO this model?

```ruby
# Currently in UpdateCardStatusService:
# - close
# - reopen
# - gild
# - postpone
```

### Step 2: Add Concern

```ruby
module Card::Statusable
  extend ActiveSupport::Concern

  included do
    has_one :status, dependent: :destroy
  end

  def close(user: Current.user)
    transaction do
      create_status!(type: :closed, user: user)
      track_event :closed, creator: user
    end
  end

  def reopen(user: Current.user)
    transaction do
      status&.destroy
      track_event :reopened, creator: user
    end
  end
end
```

### Step 3: Update Callers

```ruby
# Before
UpdateCardStatusService.new(card).close!

# After
card.close
```
