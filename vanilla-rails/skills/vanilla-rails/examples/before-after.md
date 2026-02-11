# Before & After Examples

Real-world examples showing the Vanilla Rails approach.

## Example 1: Card Gilding

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

# app/controllers/cards/gildnesses_controller.rb
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
end
```

### After (Vanilla Rails)

```ruby
# app/models/card.rb
class Card < ApplicationRecord
  belongs_to :bucket
  belongs_to :golded_by, class_name: "User", optional: true

  def gild(by:)
    return false unless can_be_gilded?(by)

    update!(
      gold: true,
      golded_at: Time.current,
      golded_by: by
    )

    broadcast_gold_card
  end

  def can_be_gilded?(user)
    # authorization logic
  end

  private

  def broadcast_gold_card
    Turbo::StreamsChannel.broadcast_replace_later(
      self,
      target: "card_#{id}",
      partial: "cards/card",
      locals: { card: self }
    )
  end
end

# app/controllers/cards/goldnesses_controller.rb
class Cards::GoldnessesController < ApplicationController
  def create
    @card = Card.find(params[:card_id])

    if @card.gild(by: Current.user)
      redirect_to @card.bucket, notice: "Card has been gilded!"
    else
      redirect_to @card.bucket, alert: "Cannot gild this card"
    end
  end
end
```

**Changes:**
- 45 LOC → 35 LOC (controller + model)
- Logic moved to where it belongs (model)
- Controller just passes user and handles response
- Model owns the gilding behavior

---

## Example 2: Order Processing

### Before (Fat Service)

```ruby
# app/services/process_order_service.rb
class ProcessOrderService
  def initialize(order, payment_params)
    @order = order
    @payment_params = payment_params
  end

  def call
    validate_order!
    calculate_totals!
    process_payment!
    confirm_order!
    send_notifications!
    update_inventory!
  end

  private

  def validate_order!
    raise "Order has no items" if @order.items.empty?
    raise "Order already processed" if @order.processed?
  end

  def calculate_totals!
    subtotal = @order.items.sum(&:price)
    discount = calculate_discount(subtotal)
    tax = calculate_tax(subtotal - discount)

    @order.update!(
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: subtotal - discount + tax
    )
  end

  def calculate_discount(subtotal)
    return 0 if @order.items.sum(&:quantity) < 10
    return 0.15 if @order.user.subscription_premium?
    0.10
  end

  def calculate_tax(amount)
    amount * TaxRate.for(@order.shipping_address.state)
  end

  def process_payment!
    payment = Payment.create!(
      order: @order,
      amount: @order.total,
      **@payment_params
    )

    payment.process!
    raise "Payment failed" unless payment.success?
  end

  def confirm_order!
    @order.update!(
      processed_at: Time.current,
      status: "confirmed"
    )
  end

  def send_notifications!
    OrderMailer.confirmation(@order).deliver_later
    SlackNotifier.orders_channel.post("New order: #{@order.id}")
  end

  def update_inventory!
    @order.items.each do |item|
      product = item.product
      product.update!(inventory: product.inventory - item.quantity)
    end
  end
end
```

### After (Rich Model)

```ruby
# app/models/order.rb
class Order < ApplicationRecord
  has_many :items
  has_one :payment
  belongs_to :user

  before_create :calculate_totals

  def process!(payment_params)
    transaction do
      validate_for_processing!
      payment = payments.create!(amount: total, **payment_params)
      payment.process!
      raise "Payment failed" unless payment.success?

      update!(processed_at: Time.current, status: :confirmed)
      items.each(&:deplete_inventory!)

      # Notifications and inventory can be async
      OrderConfirmationJob.perform_later(self)
      InventoryUpdateJob.perform_later(self)
    end
  end

  def processed?
    processed_at.present?
  end

  private

  def calculate_totals
    self.subtotal = items.sum(&:total_price)
    self.discount_amount = subtotal * discount_rate
    self.tax_amount = (subtotal - discount_amount) * tax_rate
    self.total = subtotal - discount_amount + tax_amount
  end

  def discount_rate
    return 0.15 if user&.subscription_premium?
    return 0.10 if items.sum(&:quantity) >= 10
    0
  end

  def tax_rate
    TaxRate.for(shipping_address.state)
  end

  def validate_for_processing!
    raise "Order has no items" if items.empty?
    raise "Order already processed" if processed?
  end
end

# app/jobs/order_confirmation_job.rb
class OrderConfirmationJob < ApplicationJob
  def perform(order)
    OrderMailer.confirmation(order).deliver_now
    SlackNotifier.orders_channel.post("New order: #{order.id}")
  end
end

# app/jobs/inventory_update_job.rb
class InventoryUpdateJob < ApplicationJob
  def perform(order)
    order.items.each do |item|
      item.product.update!(inventory: item.product.inventory - item.quantity)
    end
  end
end
```

**Changes:**
- Business logic moved to Order model
- Calculations are model methods
- Side effects moved to async jobs
- Much clearer what belongs where

---

## Example 3: User Activation

### Before (Anemic Model + Service)

```ruby
# app/services/activate_user_service.rb
class ActivateUserService
  def initialize(user)
    @user = user
  end

  def call
    return false if @user.active?

    @user.update!(
      active: true,
      activated_at: Time.current,
      activation_token: nil
    )

    UserMailer.activation_confirmation(@user).deliver_later
    @user.team&.increment!(:active_members_count)

    true
  end
end
```

### After (Rich Model)

```ruby
# app/models/user.rb
class User < ApplicationRecord
  belongs_to :team, optional: true

  def activate!
    return false if active?

    update!(
      active: true,
      activated_at: Time.current,
      activation_token: nil
    )

    team&.increment!(:active_members_count)
  end

  def active?
    active == true
  end
end

# app/models/user.rb - callback
class User < ApplicationRecord
  after_update_commit :send_activation_confirmation, if: :saved_change_to_active?

  private

  def send_activation_confirmation
    return unless saved_change_to_active?(from: false, to: true)

    UserMailer.activation_confirmation(self).deliver_later
  end
end
```

**Changes:**
- Activation logic belongs in User model
- Email notification via callback (at the edge)
- Team update as part of activation domain logic
- Simpler, more intuitive

---

## Key Takeaways

1. **Models should own their behavior** - If an operation is done TO a model, it should be a method ON that model

2. **Services are for orchestration** - When coordinating multiple unrelated models, NOT for single-model operations

3. **Side effects go to the edges** - Notifications, external API calls, etc. use callbacks or jobs at application boundaries

4. **Controllers stay thin** - Parse params, call models, render responses

5. **Less code is better code** - Vanilla Rails often means fewer files and clearer responsibilities
