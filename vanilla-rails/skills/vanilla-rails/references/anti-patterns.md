# Anti-Patterns

Common anti-patterns that violate Vanilla Rails principles.

## Based on Fizzy

This reference is informed by [Fizzy](https://github.com/basecamp/fizzy) - a production Rails application from 37signals. Fizzy avoids all these anti-patterns by embracing Vanilla Rails.

**Key Fizzly patterns:**
- Controllers are thin: `@board.update!(board_params)`
- Models are rich: `@card.close`, `@card.gild`, `@card.postpone`
- No `app/services/` directory
- Business logic lives in models via concerns
- Complex operations are plain objects or ActiveRecord models with state

## Model Boundary Violations

Models should NOT touch the outside world. This is a critical Fizzy principle.

### Accessing Current in Business Logic

```ruby
# BAD
class Card < ApplicationRecord
  def close
    update!(closed_at: Time.current, closed_by: Current.user)
  end
end

# GOOD: Use keyword arguments with defaults
class Card < ApplicationRecord
  def close(user: Current.user)
    update!(closed_at: Time.current, closed_by: user)
  end
end

# BETTER: Track state with dedicated model
module Card::Closeable
  def close(user: Current.user)
    create_closure!(user: user)
    track_event(:closed, creator: user)
  end
end
```

### Calling Mailers from Models

```ruby
# BAD
class User < ApplicationRecord
  after_create :send_welcome_email

  private

  def send_welcome_email
    UserMailer.welcome(self).deliver_later
  end
end

# GOOD: Use concern with callback at edge
module User::Notifiable
  extend ActiveSupport::Concern

  included do
    after_create_commit :send_welcome_later
  end

  private

  def send_welcome_later
    UserMailer.welcome(self).deliver_later
  end
end
```

### External API Calls in Models

```ruby
# BAD
class User < ApplicationRecord
  def sync_to_crm
    CrmClient.create_contact(self)
  end
end

# GOOD: External calls in jobs/services
class CrmSyncJob < ApplicationJob
  def perform(user)
    CrmClient.create_contact(user)
  end
end
```

## Service Layer Abuse

### Thin Wrapper Service

Service that just delegates to a single model method:

```ruby
# BAD
class UpdateUserService
  def initialize(user, params)
    @user = user
    @params = params
  end

  def call
    @user.update!(@params)
  end
end

# GOOD - Fizzy style
class BoardsController < ApplicationController
  def update
    @board.update!(board_params)
    @board.accesses.revise(granted: grantees, revoked: revokees) if grantees_changed?
  end
end
```

### Domain Logic in Service

Business rules that belong in the model:

```ruby
# BAD
class CalculateOrderTotalService
  def initialize(order)
    @order = order
  end

  def call
    subtotal = @order.items.sum(&:price)
    discount = calculate_discount(subtotal)
    tax = calculate_tax(subtotal - discount)
    subtotal - discount + tax
  end
end

# GOOD - Fizzy style: Domain logic in model
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

### Service Explosion

Creating a service for every controller action:

```ruby
# BAD
app/services/
  create_card_service.rb
  update_card_service.rb
  delete_card_service.rb
  close_card_service.rb
  reopen_card_service.rb
  gild_card_service.rb
  archive_card_service.rb

# GOOD - Fizzy style: Rich model API
class Card < ApplicationRecord
  include Closeable, Golden, Postponable

  # close, reopen, gild, ungild, postpone, resume methods
  # are provided by concerns
end

# Controller just calls the model
class Cards::GoldnessesController < ApplicationController
  def create
    @card.gild
  end

  def destroy
    @card.ungild
  end
end
```

## Anemic Models

### Data Container Model

Models with only associations and validations:

```ruby
# BAD
class Card < ApplicationRecord
  belongs_to :board
  belongs_to :creator
  validates :title, presence: true
  # No business logic - all in services
end

# GOOD - Fizzy style: Rich model composed of concerns
class Card < ApplicationRecord
  include Closeable, Golden, Postponable, Stallable, Triageable, Watchable

  # Each concern adds behavior:
  # - close, reopen (Closeable)
  # - gild, ungild (Golden)
  # - postpone, resume (Postponable)
  # - detect activity spikes (Stallable)
end
```

### Boolean Columns Instead of State Models

```ruby
# BAD
class Card < ApplicationRecord
  # Boolean columns for state
  attribute :closed, :boolean
  attribute :golden, :boolean
  attribute :postponed, :boolean

  def close
    update!(closed: true)
  end
end

# GOOD - Fizzy style: Dedicated state models
module Card::Closeable
  extend ActiveSupport::Concern

  included do
    has_one :closure, dependent: :destroy
    scope :closed, -> { joins(:closure) }
    scope :open, -> { where.missing(:closure) }
  end

  def close(user: Current.user)
    create_closure!(user: user)
    track_event(:closed, creator: user)
  end

  def reopen(user: Current.user)
    closure&.destroy
    track_event(:reopened, creator: user)
  end
end
```

## Fat Controllers

### Business Logic in Controller

```ruby
# BAD
class CardsController < ApplicationController
  def create
    @card = Card.new(card_params)

    # Business logic in controller
    @card.number = board.cards.maximum(:number).to_i + 1
    @card.title = "Untitled" if @card.title.blank?
    @card.status = "published" if params[:publish]

    @card.save!
  end
end

# GOOD - Fizzy style: Thin controller
class CardsController < ApplicationController
  def create
    card = Current.user.draft_new_card_in(@board)
    redirect_to card_draft_path(card)
  end

  def update
    @card.update!(card_params)
  end
end

# Business logic in model via callbacks
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

### Controller as Orchestrator

```ruby
# BAD
class CardsController < ApplicationController
  def create
    @card = CreateCardService.new(params).call
    ProcessAttachmentsService.new(@card).call
    SendNotificationService.new(@card).call
    TrackActivityService.new(@card).call
  end
end

# GOOD - Fizzy style: Plain Active Record
class Cards::CommentsController < ApplicationController
  def create
    @comment = @card.comments.create!(comment_params)
    # Eventable concern handles tracking
    # Mentions concern handles mentions
    # Broadcastable concern handles broadcasting
  end
end
```

## Premature Abstraction

### Unnecessary Form Object for Simple Forms

```ruby
# BAD: Simple form wrapped in object
class CardForm
  attr_reader :card

  def initialize(card, params)
    @card = card
    @params = params
  end

  def save
    @card.update!(@params)
  end
end

# GOOD - Fizzy style: Use ActiveModel only when needed
# Simple CRUD doesn't need a form object
class CardsController < ApplicationController
  def update
    @card.update!(card_params)
  end
end

# But for complex multi-step processes, use plain objects
class Signup
  include ActiveModel::Model

  validates :email_address, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :full_name, presence: true

  def create_identity
    @identity = Identity.find_or_create_by!(email_address: email_address)
    @identity.send_magic_link(for: :sign_up)
  end

  def complete
    # Complex account creation with rollback handling
  end
end
```

### Unnecessary Query Object for Simple Scopes

```ruby
# BAD: Simple scope wrapped in object
class OpenCardsQuery
  def initialize(relation = Card.all)
    @relation = relation
  end

  def call
    @relation.where(closed_at: nil)
  end
end

# GOOD - Fizzy style: Scope in concern
module Card::Closeable
  extend ActiveSupport::Concern

  included do
    scope :closed, -> { joins(:closure) }
    scope :open, -> { where.missing(:closure) }
  end
end
```

## Naming Issues

### Generic Names

```ruby
# BAD
class Manager
class Handler
class Processor
class Executor

# GOOD - Fizzy style: Domain concepts
class Card
class Board
class Column
class Export
class Import
```

### Service Suffix Abuse

```ruby
# BAD
class CardService              # What does it do?
class CardCreationService      # Just use Card.create
class CardUpdaterService       # Just use card.update

# GOOD - Fizzy style: No "Service" suffix
class Card
  include Closeable, Golden, Postponable

  # close, reopen, gild, ungild, postpone, resume
  # methods provided by concerns
end

# For complex operations, use descriptive names
class Signup              # Multi-step signup process
class DataExportJob       # Background job
class StripeEventManager  # External API integration
```

## See Also

For the positive patterns that counter these anti-patterns:

| Pattern | Description |
|---------|-------------|
| [Plain Active Record](patterns/plain-activerecord.md) | Using Active Record directly |
| [Rich Models](patterns/rich-models.md) | Building rich domain models |
| [Concerns](patterns/concerns.md) | Sharing behavior across models |
| [Delegated Type](patterns/delegated-type.md) | Preferred way to handle inheritance |
| [When to Use Services](patterns/when-to-use-services.md) | When services are genuinely justified |

## Remember

> "Services are the waiting room for abstractions that haven't emerged yet." - DHH

> "Vanilla Rails is plenty." - DHH

If you find `app/services/` growing, it's a sign you're missing the right abstractions. Fizzy has no services directory - everything lives in models, concerns, jobs, or plain objects with clear domain purposes.
