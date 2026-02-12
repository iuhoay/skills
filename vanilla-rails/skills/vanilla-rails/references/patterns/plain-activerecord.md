# Plain Active Record

Using Active Record directly is the default and often best approach in Vanilla Rails.

## When to Use

- Simple CRUD operations
- Single model operations
- No complex orchestration needed
- Standard Active Record callbacks suffice

## The Fizzy Pattern

Based on [Fizzy](https://github.com/basecamp/fizzy) - a production Rails application from 37signals.

### Controllers Call Active Record Directly

```ruby
class BoardsController < ApplicationController
  def create
    @board = Board.create! board_params.with_defaults(all_access: true)

    respond_to do |format|
      format.html { redirect_to board_path(@board) }
      format.json { head :created, location: board_path(@board, format: :json) }
    end
  end

  def update
    @board.update! board_params
    @board.accesses.revise granted: grantees, revoked: revokees if grantees_changed?

    respond_to do |format|
      format.html { redirect_to edit_board_path(@board), notice: "Saved" }
      format.json { head :no_content }
    end
  end

  def destroy
    @board.destroy

    respond_to do |format|
      format.html { redirect_to root_path }
      format.json { head :no_content }
    end
  end
end
```

### Association Creation

```ruby
class Cards::CommentsController < ApplicationController
  def create
    @comment = @card.comments.create!(comment_params)

    respond_to do |format|
      format.turbo_stream
      format.json { head :created, location: card_comment_path(@card, @comment, format: :json) }
    end
  end
end
```

### Thin Controllers, Rich Model Methods

Controller delegates to intention-revealing model methods:

```ruby
class Cards::GoldnessesController < ApplicationController
  def create
    @card.gild

    respond_to do |format|
      format.turbo_stream { render_card_replacement }
      format.json { head :no_content }
    end
  end

  def destroy
    @card.ungild

    respond_to do |format|
      format.turbo_stream { render_card_replacement }
      format.json { head :no_content }
    end
  end
end
```

The model handles the business logic:

```ruby
module Card::Golden
  extend ActiveSupport::Concern

  included do
    has_one :goldness, dependent: :destroy
    scope :golden, -> { joins(:goldness) }
  end

  def gild
    create_goldness! unless golden?
  end

  def ungild
    goldness&.destroy
  end
end
```

### Smart Defaults with `with_defaults`

```ruby
Board.create! board_params.with_defaults(all_access: true)

# Or in model
class Card < ApplicationRecord
  belongs_to :creator, class_name: "User", default: -> { Current.user }
end
```

### Model Callbacks for Internal State

```ruby
class Card < ApplicationRecord
  before_save :set_default_title, if: :published?
  before_create :assign_number

  private
    def set_default_title
      self.title = "Untitled" if title.blank?
    end

    def assign_number
      self.number ||= account.increment!(:cards_count).cards_count
    end
end
```

### Scopes for Common Queries

```ruby
class Card < ApplicationRecord
  scope :reverse_chronologically, -> { order created_at: :desc, id: :desc }
  scope :chronologically, -> { order created_at: :asc, id: :asc }
  scope :latest, -> { order last_active_at: :desc, id: :desc }
  scope :closed, -> { joins(:closure) }
  scope :open, -> { where.missing(:closure) }
end

# Usage
@board.cards.awaiting_triage.latest.with_golden_first.preloaded
```

### Associations with Business Logic

```ruby
class Board < ApplicationRecord
  has_many :cards

  has_many :tags, -> { distinct }, through: :cards
end

class Card < ApplicationRecord
  # Named association extensions
  has_many :comments do
    def system
      where(system: true)
    end

    def chronological
      order created_at: :asc, id: :asc
    end
  end
end

# Usage
@card.comments.system
@card.comments.chronologically
```

### Simple Params with `expect` (Rails 8.0+)

The preferred way to handle parameters in Rails 8.0+ is using `expect`:

```ruby
def card_params
  params.expect(card: [ :title, :description, :image, :created_at, :last_active_at ])
end
```

## Official Documentation

For comprehensive guidance on Active Record patterns, refer to the official Rails Guides:
- [Active Record Basics](https://guides.rubyonrails.org/active_record_basics.html)
- [Active Record Query Interface](https://guides.rubyonrails.org/active_record_querying.html)
- [Active Record Associations](https://guides.rubyonrails.org/association_basics.html)
- [Active Record Callbacks](https://guides.rubyonrails.org/active_record_callbacks.html)
- [Active Record Validations](https://guides.rubyonrails.org/active_record_validations.html)

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

> "Vanilla Rails is plenty." - DHH
