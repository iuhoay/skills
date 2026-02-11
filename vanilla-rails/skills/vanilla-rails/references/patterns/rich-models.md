# Rich Models

Models should be the home of business logic in Vanilla Rails. Anemic models (with only attributes and associations) are an anti-pattern.

## What Makes a Model Rich?

A rich model has:
- **Business methods** - Operations that change state
- **Domain rules** - Validations and business logic
- **Intention-revealing APIs** - Methods that clearly express intent
- **Query methods** - Scopes and class methods for common queries
- **Calculated attributes** - Methods that compute values

## Examples

### State Changes

```ruby
class Card < ApplicationRecord
  # Intention-revealing state changes
  def gild
    update!(gold: true, golded_at: Time.current)
  end

  def close
    update!(closed_at: Time.current)
  end

  def archive
    update!(archived_at: Time.current)
  end

  def reopen
    update!(closed_at: nil)
  end

  # Query methods
  def open?
    closed_at.nil?
  end

  def closed?
    !open?
  end

  def gold?
    gold?
  end
end
```

### Business Logic

```ruby
class Order < ApplicationRecord
  # Business rules
  def applicable_discount
    return 0 if items.empty?

    if user.has_premium_subscription?
      0.15
    elsif items.sum(&:quantity) >= 10
      0.10
    else
      0
    end
  end

  # Calculated values
  def subtotal
    items.sum(&:total_price)
  end

  def discount_amount
    subtotal * applicable_discount
  end

  def tax_amount
    (subtotal - discount_amount) * tax_rate
  end

  def total
    subtotal - discount_amount + tax_amount
  end

  # State machine-like behavior
  def complete!
    return if completed?

    transaction do
      update!(completed_at: Time.current, completed_by: Current.user)
      items.each(&:mark_fulfilled!)
      send_confirmation
    end
  end

  def completed?
    completed_at.present?
  end
end
```

### Domain Operations

```ruby
class Todo < ApplicationRecord
  belongs_to :bucket

  # Domain operations
  def complete!
    update!(completed_at: Time.current)
    bucket.touch(:last_completed_at) if bucket.todos.reload.all?(&:completed?)
  end

  def uncomplete!
    update!(completed_at: nil)
  end

  def reschedule_to!(date)
    update!(due_date: date)
  end

  def move_to!(new_bucket)
    update!(bucket: new_bucket)
    # Auto-position could be a callback
  end
end
```

### Query Methods

```ruby
class User < ApplicationRecord
  # Class methods for queries
  def self.with_active_subscription
    joins(:subscription).merge(Subscription.active)
  end

  def self.admins
    where(admin: true)
  end

  def self.inactive_since(date)
    where("last_sign_in_at < ?", date)
  end

  # Instance query methods
  def can_perform?(action)
    # authorization logic
  end

  def has_access_to?(resource)
    # access control logic
  end
end
```

### Associations with Logic

```ruby
class Project < ApplicationRecord
  has_many :tasks do
    def incomplete
      where(completed: false)
    end

    def completed
      where(completed: true)
    end

    def overdue
      incomplete.where("due_date < ?", Date.today)
    end

    def due_this_week
      incomplete.where(due_date: Date.today..1.week.from_now)
    end
  end

  # Delegation for cleaner syntax
  has_many :milestones
  has_one :current_milestone, -> { where(active: true) }, class_name: "Milestone"

  delegate :progress, to: :current_milestone, allow_nil: true
end
```

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
# Currently in UpdateUserStatusService:
# - activate
# - deactivate
# - suspend
# - archive
```

### Step 2: Add Methods

```ruby
class User < ApplicationRecord
  def activate!
    update!(status: :active, activated_at: Time.current)
  end

  def deactivate!
    update!(status: :inactive, deactivated_at: Time.current)
  end

  def suspend!
    update!(status: :suspended, suspended_at: Time.current)
  end

  def archive!
    update!(status: :archived, archived_at: Time.current)
  end

  # Query methods
  def active?
    status == "active"
  end
end
```

### Step 3: Update Callers

```ruby
# Before
UpdateUserStatusService.new(user).activate!

# After
user.activate!
```

## Model Boundaries

Models should NOT:
- Access `Current` (request context)
- Call mailers directly (use callbacks at edges)
- Make external API calls (use jobs/services)

These violations create coupling that breaks in background jobs and tests.

Keep models focused on **domain logic** - the rules and behaviors that define what your application IS about.
