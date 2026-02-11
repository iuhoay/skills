# Anti-Patterns

Common anti-patterns that violate Vanilla Rails principles.

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

# GOOD
user.update!(params)
# or
class UsersController
  def update
    @user.update!(user_params)
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

# GOOD
class Order < ApplicationRecord
  def total
    subtotal - discount + tax
  end

  private

  def subtotal
    items.sum(&:price)
  end

  def discount
    # domain logic
  end

  def tax
    # domain logic
  end
end
```

### Service Explosion

Creating a service for every controller action:

```ruby
# BAD
app/services/
  create_user_service.rb
  update_user_service.rb
  delete_user_service.rb
  activate_user_service.rb
  deactivate_user_service.rb

# GOOD
class User < ApplicationRecord
  def activate!
    update!(active: true)
  end

  def deactivate!
    update!(active: false)
  end
end
```

## Anemic Models

### Data Container Model

Models with only associations and validations:

```ruby
# BAD
class User < ApplicationRecord
  has_many :posts
  validates :email, presence: true
  # No business logic
end

# All logic in UserAuthenticationService,
# UserAuthorizationService, UserProfileService, etc.

# GOOD
class User < ApplicationRecord
  has_many :posts
  validates :email, presence: true

  def authenticate(credential)
    # authentication logic
  end

  def can_perform?(action)
    # authorization logic
  end

  def gravatar_url
    # presentation logic
  end
end
```

### God Object (Opposite Problem)

Models that do too much - but different from anemic:

```ruby
# BAD: Model handling notifications, external APIs, etc.
class Order < ApplicationRecord
  def process
    validate_inventory
    charge_payment
    create_shipment
    send_email_confirmation
    notify_slack_channel
    sync_to_crm
  end
end

# GOOD: Model focuses on domain, external calls at edges
class Order < ApplicationRecord
  def process
    validate_inventory!
    charge_payment!
    create_shipment!
    # Controller or job handles email, slack, CRM
  end
end
```

## Fat Controllers

### Business Logic in Controller

```ruby
# BAD
class OrdersController
  def create
    @order = Order.new(order_params)

    # Business logic in controller
    if @order.items.sum(&:quantity) > 10
      @order.bulk_discount = 0.15
    elsif @order.user.has_subscription?
      @order.bulk_discount = 0.10
    end

    @order.tax = @order.subtotal * TaxRate.for(@order.address.state)
    @order.total = @order.subtotal - @order.discount + @order.tax

    @order.save!
  end
end

# GOOD
class OrdersController
  def create
    @order = Order.create!(order_params)
  end
end

class Order < ApplicationRecord
  before_create :calculate_totals

  private

  def calculate_totals
    self.discount = determine_discount
    self.tax = calculate_tax
    self.total = subtotal - discount + tax
  end
end
```

### Controller as Orchestrator

```ruby
# BAD
class OrdersController
  def create
    @order = CreateOrderService.new(params).call
    ProcessPaymentService.new(@order).call
    SendConfirmationService.new(@order).call
    UpdateInventoryService.new(@order).call
    NotifySlackService.new(@order).call
  end
end

# GOOD
class OrdersController
  def create
    @order = Order.create!(order_params)
  end
end

class Order < ApplicationRecord
  after_create_commit :process_async

  def process_async
    # In a job:
    # - process payment
    # - send confirmation
    # - update inventory
    # - notify slack
  end
end
```

## Premature Abstraction

### Unnecessary Form Object

```ruby
# BAD: Simple form wrapped in object
class OrderForm
  attr_reader :order

  def initialize(order, params)
    @order = order
    @params = params
  end

  def save
    @order.update!(@params)
  end
end

# GOOD
class OrdersController
  def update
    @order.update!(order_params)
  end
end
```

### Unnecessary Query Object

```ruby
# BAD: Simple scope wrapped in object
class ActiveUsersQuery
  def initialize(relation = User.all)
    @relation = relation
  end

  def call
    @relation.where(active: true).order(:created_at)
  end
end

# GOOD
class User < ApplicationRecord
  scope :active, -> { where(active: true).order(:created_at) }
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

# GOOD
class Invoice       # Clear domain concept
class Subscription  # Clear domain concept
class Card          # Clear domain concept
```

### Service Suffix Abuse

```ruby
# BAD
class CardService              # What does it do?
class CardCreationService      # Just use Card.create
class CardUpdaterService       # Just use card.update

# GOOD
class Card
  def close!
    update!(closed_at: Time.current)
  end

  def archive!
    update!(archived_at: Time.current)
  end
end
```
