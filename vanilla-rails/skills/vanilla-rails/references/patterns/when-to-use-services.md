# When to Use Services

Services are NOT the default in Vanilla Rails. Use them only when genuinely justified.

## When Services ARE Justified

### 1. Orchestrating Multiple Models

When you need to coordinate changes across multiple unrelated models:

```ruby
class Signup
  def initialize(email_address:)
    @email_address = email_address
  end

  def create_identity
    Identity.create!(email_address: @email_address)
    # Potentially coordinate other models:
    # - Send welcome email
    # - Create default settings
    # - Initialize onboarding flow
  end
end
```

### 2. External API Interactions

When interacting with external services:

```ruby
class StripeEventManager
  def handle_invoice_paid(invoice)
    payment = Payment.from_stripe_invoice!(invoice)
    subscription = payment.subscription
    subscription.prolong
  end
end
```

### 3. Multi-Step Workflows

When a process has multiple steps with transaction boundaries:

```ruby
class ImportBulkRecords
  def initialize(file, user:)
    @file = file
    @user = user
  end

  def call
    CSV.foreach(@file, headers: true) do |row|
      Record.create_or_find_by!(external_id: row["id"]) do |record|
        record.assign_attributes(row.to_hash)
        record.imported_by = @user
      end
    end
  end
end
```

### 4. Complex Validation Rules

When validation requires external calls or complex logic:

```ruby
class EnrollmentForm
  include ActiveModel::Model

  attr_accessor :course_id, :student_id, :coupon_code

  validates :course, presence: true
  validates :student, presence: true
  validate :course_has_capacity
  validate :coupon_valid_if_provided

  def save
    return false unless valid?

    Enrollment.create!(course: course, student: student)
  end

  private

  def course_has_capacity
    return if course.capacity_remaining.positive?

    errors.add(:base, "Course is full")
  end

  def coupon_valid_if_provided
    return unless coupon_code.present?
    return if Coupon.active.find_by(code: coupon_code)

    errors.add(:coupon_code, "is invalid or expired")
  end
end
```

## When Services Are NOT Justified

### ❌ Simple CRUD

```ruby
# DON'T DO THIS
class CreateOrderService
  def call(params)
    Order.create!(params)
  end
end

# JUST DO THIS
Order.create!(params)
```

### ❌ Single Model Operations

```ruby
# DON'T DO THIS
class ActivateUserService
  def initialize(user)
    @user = user
  end

  def call
    @user.update!(active: true)
  end
end

# JUST DO THIS
user.activate!
```

### ❌ Domain Logic

```ruby
# DON'T DO THIS
class CalculateOrderTotalService
  def call(order)
    # Business rules for pricing
  end
end

# JUST DO THIS
class Order < ApplicationRecord
  def total
    # Business rules live here
  end
end
```

### ❌ Thin Wrappers

```ruby
# DON'T DO THIS
class SendNotificationService
  def initialize(user)
    @user = user
  end

  def call
    NotificationMailer.welcome(@user).deliver_later
  end
end

# JUST DO THIS
NotificationMailer.welcome(user).deliver_later
```

## Service Guidelines

If you must create a service:

1. **Name it for WHAT it does, not THAT it's a service**
   - Bad: `CardCreationService`
   - Good: `ImportCards`, `StripeEventManager`, `BulkInvoicer`

2. **Keep it focused**
   - One clear purpose
   - Single public method (usually `call`)

3. **Don't create base classes**
   - Plain objects are fine
   - Don't over-engineer service infrastructure

4. **Use sparingly**
   - Question every service: is this genuinely necessary?
   - Default to NOT having a service

## Alternatives to Services

Before creating a service, consider:

| Need | Alternative |
|------|-------------|
| Single model operation | Model method |
| Multi-model form | Form object (accepts nested attributes) |
| Complex query | Model scope or query object |
| Async operation | Job |
| Notification | Mailer called from appropriate place |
| Authorization | Policy object |

## Remember

> "Services are the waiting room for abstractions that haven't emerged yet." - DHH

If you find `app/services/` growing, it's a sign you're missing the right abstractions. The goal is to find the right objects, not to create a service layer.
