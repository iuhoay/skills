# Before & After Examples

Real-world examples showing the Vanilla Rails approach, based on [Fizzy](https://github.com/basecamp/fizzy) patterns.

## Example 1: Card Gilding (Fizzy Pattern)

### Before (Over-Engineered)

```ruby
# app/services/gild_card_service.rb
class GildCardService
  def initialize(card, user)
    @card = card
    @user = user
  end

  def call
    return false unless @card.can_be_gilded?(@user)

    @card.update!(
      gold: true,
      golded_at: Time.current,
      golded_by: @user
    )

    broadcast_gold_card(@card)
    award_achievement(@user, :gold_gilder)

    true
  end

  private

  def broadcast_gold_card(card)
    Turbo::StreamsChannel.broadcast_replace_later(
      card,
      target: "card_#{card.id}",
      partial: "cards/card",
      locals: { card: card }
    )
  end

  def award_achievement(user, badge)
    # ...
  end
end

# app/controllers/cards/goldnesses_controller.rb
class Cards::GoldnessesController < ApplicationController
  def create
    @card = Card.find(params[:card_id])
    result = GildCardService.new(@card, Current.user).call

    if result
      redirect_to @card.bucket, notice: "Card has been gilded!"
    else
      redirect_to @card.bucket, alert: "Cannot gild this card"
    end
  end

  def destroy
    @card = Card.find(params[:card_id])
    @card.update!(gold: false, golded_at: nil, golded_by: nil)
    redirect_to @card.bucket
  end
end
```

### After (Vanilla Rails - Fizzy Style)

```ruby
# app/models/card/golden.rb - Concern
module Card::Golden
  extend ActiveSupport::Concern

  included do
    has_one :goldness, dependent: :destroy, class_name: "Card::Goldness"

    scope :golden, -> { joins(:goldness) }
    scope :with_golden_first, -> { left_outer_joins(:goldness).prepend_order("card_goldnesses.id IS NULL").preload(:goldness) }
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

# app/models/card.rb
class Card < ApplicationRecord
  include Golden, Broadcastable, Eventable

  # Eventable concern handles tracking
  # Broadcastable concern handles broadcasting
end

# app/controllers/cards/goldnesses_controller.rb
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

**Changes:**
- Service eliminated → model method `gild` / `ungild`
- Boolean column → dedicated `Goldness` model
- Broadcasting handled by `Broadcastable` concern
- Event tracking handled by `Eventable` concern
- Controller is thin: just calls model methods
- 80 LOC → ~20 LOC

---

## Example 2: Card Closing (Fizzy Pattern)

### Before (Boolean Column)

```ruby
# app/models/card.rb
class Card < ApplicationRecord
  attribute :closed, :boolean
  attribute :closed_at, :datetime
  attribute :closed_by, :integer

  def close(user)
    return false if closed?

    update!(
      closed: true,
      closed_at: Time.current,
      closed_by: user.id
    )

    CardMailer.closed(self).deliver_later
  end

  def reopen(user)
    return unless closed?

    update!(
      closed: false,
      closed_at: nil,
      closed_by: nil
    )
  end

  def closed?
    closed == true
  end
end
```

### After (Dedicated State Model - Fizzy Style)

```ruby
# app/models/card/closeable.rb - Concern
module Card::Closeable
  extend ActiveSupport::Concern

  included do
    has_one :closure, dependent: :destroy

    scope :closed, -> { joins(:closure) }
    scope :open, -> { where.missing(:closure) }
    scope :recently_closed_first, -> { closed.order(closures: { created_at: :desc }) }
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
        create_closure!(user: user)
        track_event(:closed, creator: user)
      end
    end
  end

  def reopen(user: Current.user)
    if closed?
      transaction do
        closure&.destroy
        track_event(:reopened, creator: user)
      end
    end
  end
end
```

**Changes:**
- Boolean columns → dedicated `Closure` model
- State tracking with first-class model
- Query logic via scopes (`closed`, `open`, `recently_closed_first`)
- Events tracked via `Eventable` concern
- Transaction ensures atomic state changes

---

## Example 3: Controller CRUD (Fizzy Pattern)

### Before (Fat Controller with Business Logic)

```ruby
class CardsController < ApplicationController
  def create
    @card = Card.new(card_params)

    # Business logic in controller
    @card.number = @card.board.cards.maximum(:number).to_i + 1
    @card.title = "Untitled" if @card.title.blank?
    @card.status = "published" if params[:publish]

    if @card.save
      redirect_to @card, notice: "Card created"
    else
      render :new
    end
  end

  def update
    @card = Card.find(params[:id])

    if @card.update(card_params)
      redirect_to @card, notice: "Card updated"
    else
      render :edit
    end
  end
end
```

### After (Thin Controller - Fizzy Style)

```ruby
class CardsController < ApplicationController
  def create
    respond_to do |format|
      format.html do
        card = Current.user.draft_new_card_in(@board)
        redirect_to card_draft_path(card)
      end

      format.json do
        card = @board.cards.create!(card_params.merge(creator: Current.user, status: "published"))
        head :created, location: card_path(card, format: :json)
      end
    end
  end

  def update
    @card.update!(card_params)

    respond_to do |format|
      format.turbo_stream
      format.json { render :show }
    end
  end
end

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

**Changes:**
- Business logic moved to model callbacks
- Controller just calls Active Record methods
- Uses `with_defaults` for smart defaults
- Proper response handling (HTML/JSON/TurboStream)

---

## Example 4: Comment Creation (Fizzy Pattern)

### Before (Service Orchestration)

```ruby
class CreateCommentService
  def initialize(card, user, params)
    @card = card
    @user = user
    @params = params
  end

  def call
    @comment = @card.comments.create(@params)

    # Handle side effects
    detect_mentions!(@comment)
    broadcast_comment!(@comment)
    track_activity!(@comment)
    notify_mentioned_users!(@comment)

    @comment
  end
end
```

### After (Plain Active Record + Concerns)

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

class Card < ApplicationRecord
  include Eventable, Mentions, Broadcastable

  # Eventable concern: creates Event record after create
  # Mentions concern: detects and creates mentions
  # Broadcastable concern: broadcasts via Turbo Streams
end
```

**Changes:**
- Service eliminated → plain Active Record
- Side effects handled by concerns
- Each concern is independently testable
- Controller is extremely thin

---

## Key Takeaways (Fizzy Patterns)

1. **State with dedicated models, not booleans** - `has_one :closure`, `has_one :goldness`
2. **Concerns compose behavior** - `include Closeable, Golden, Postponable, Watchable`
3. **Controllers are thin** - Call Active Record directly: `@card.update!(card_params)`
4. **Side effects via concerns** - `Eventable`, `Broadcastable`, `Mentions` handle their domain
5. **Callbacks for internal state** - `before_save :set_default_title`, `before_create :assign_number`
6. **Smart defaults with `with_defaults`** - `Board.create!(params.with_defaults(all_access: true))`

> "Vanilla Rails is plenty." - DHH
