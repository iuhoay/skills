# Plain Active Record

Using Active Record directly is the default and often best approach in Vanilla Rails.

## When to Use

- Simple CRUD operations
- Single model operations
- No complex orchestration needed
- Standard Active Record callbacks suffice

## Examples

### Simple Creation

```ruby
# Controller directly creates record
class Cards::CommentsController < ApplicationController
  def create
    @comment = @card.comments.create!(comment_params)
    redirect_to @card
  end
end
```

### Intention-Revealing Model Methods

```ruby
# Rich model API
class Card < ApplicationRecord
  def gild
    update!(gold: true, golded_at: Time.current)
  end

  def close
    update!(closed_at: Time.current)
  end

  def archive
    update!(archived_at: Time.current)
  end
end

# Controller calls model methods
class CardsController < ApplicationController
  def gild
    @card.gild
    redirect_to @card
  end
end
```

### Model Callbacks for Internal State

```ruby
class Recording < ApplicationRecord
  belongs_to :bucket

  before_create :set_position

  private

  def set_position
    self.position = bucket.recordings.maximum(:position).to_i + 1
  end
end
```

### Scopes for Common Queries

```ruby
class Todo < ApplicationRecord
  scope :incomplete, -> { where(completed: false) }
  scope :completed, -> { where(completed: true) }
  scope :due_soon, -> { where(due_date: ...1.week.from_now) }
  scope :overdue, -> { where("due_date < ?", Date.today) }
end

# Usage
@bucket.todos.incomplete.due_soon
```

### Associations with Business Logic

```ruby
class Bucket < ApplicationRecord
  has_many :recordings do
    def todos
      where(type: "Todo")
    end

    def notes
      where(type: "Note")
    end
  end
end

# Usage
@bucket.recordings.todos
@bucket.recordings.notes
```

## When NOT to Use Plain Active Record

- Coordinating multiple unrelated models
- External API calls (should be in jobs or dedicated classes)
- Complex multi-step workflows
- Operations that don't naturally belong to any model

In these cases, consider:
- Service objects (for orchestration)
- Form objects (for multi-model forms)
- Jobs (for async operations)

But remember: **these are exceptions, not the default.**
