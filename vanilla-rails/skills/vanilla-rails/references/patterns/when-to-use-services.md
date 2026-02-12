# When to Use Services

Services are NOT the default in Vanilla Rails. Use them only when genuinely justified.

## The Fizzy Pattern

Based on [Fizzy](https://github.com/basecamp/fizzy) - a production Rails application from 37signals.

Fizzy doesn't have a `app/services/` directory. Instead, they use:

- **Plain objects** for multi-step processes
- **ActiveRecord models** for operations that need to track state
- **Jobs** for background processing

### Plain Objects for Multi-Step Processes

```ruby
class Signup
  include ActiveModel::Model
  include ActiveModel::Attributes
  include ActiveModel::Validations

  attr_accessor :full_name, :email_address, :identity, :skip_account_seeding
  attr_reader :account, :user

  validates :email_address, format: { with: URI::MailTo::EMAIL_REGEXP }, on: :identity_creation
  validates :full_name, :identity, presence: true, on: :completion

  def create_identity
    @identity = Identity.find_or_create_by!(email_address: email_address)
    @identity.send_magic_link for: :sign_up
  end

  def complete
    if valid?(:completion)
      begin
        @tenant = create_tenant
        create_account
        true
      rescue => error
        destroy_account
        handle_account_creation_error(error)

        errors.add(:base, "Something went wrong, and we couldn't create your account. Please give it another try.")
        Rails.error.report(error, severity: :error)
        false
      end
    else
      false
    end
  end

  private
    def create_account
      @account = Account.create_with_owner(
        account: {
          external_account_id: @tenant,
          name: generate_account_name
        },
        owner: {
          name: full_name,
          identity: identity
        }
      )
      @user = @account.users.find_by!(role: :owner)
      @account.setup_customer_template unless skip_account_seeding
    end

    def generate_account_name
      AccountNameGenerator.new(identity: identity, name: full_name).generate
    end

    def destroy_account
      @account&.destroy!
      @user = nil
      @account = nil
      @tenant = nil
    end
end
```

### ActiveRecord Models for Stateful Operations

For operations that need to track progress and state:

```ruby
class Export < ApplicationRecord
  belongs_to :account
  belongs_to :user
  has_one_attached :file

  enum :status, %w[ pending processing completed failed ].index_by(&:itself), default: :pending

  scope :current, -> { where(created_at: 24.hours.ago..) }
  scope :expired, -> { where(completed_at: ...24.hours.ago) }

  def build_later
    DataExportJob.perform_later(self)
  end

  def build
    processing!

    with_context do
      ZipFile.create_for(file, filename: filename) do |zip|
        populate_zip(zip)
      end
      mark_completed
      ExportMailer.completed(self).deliver_later
    end
  rescue => e
    update!(status: :failed)
    raise e
  end

  private
    def populate_zip
      raise NotImplementedError, "Subclasses must implement populate_zip"
    end
end
```

```ruby
class Account::Import < ApplicationRecord
  broadcasts_refreshes

  belongs_to :account
  belongs_to :identity
  has_one_attached :file

  enum :status, %w[ pending processing completed failed ].index_by(&:itself), default: :pending

  def process_later
    Account::DataImportJob.perform_later(self)
  end

  def process(start: nil, callback: nil)
    processing!

    ZipFile.read_from(file.blob) do |zip|
      Account::DataTransfer::Manifest.new(account).each_record_set(start: start) do |record_set, last_id|
        record_set.import(from: zip, start: last_id, callback: callback)
      end
    end

    add_importer_to_all_access_boards
    reconcile_account_storage
    mark_completed
  rescue => e
    mark_as_failed
    raise e
  end

  private
    def mark_completed
      update!(status: :completed, completed_at: Time.current)
      ImportMailer.completed(identity, account).deliver_later
    end

    def add_importer_to_all_access_boards
      importer = account.users.find_by!(identity: identity)
      account.boards.all_access.find_each do |board|
        board.accesses.grant_to(importer)
      end
    end

    def reconcile_account_storage
      account.boards.each(&:reconcile_storage)
      account.reconcile_storage
      account.materialize_storage
    end
end
```

### Jobs for Async Operations

```ruby
class DataExportJob < ApplicationJob
  def perform(export)
    export.build
  end
end
```

## When Plain Objects/Services ARE Justified

### 1. Multi-Step Workflows with State Tracking

When you need to track progress over time:

```ruby
class Account::Import < ApplicationRecord
  # Handles import with status tracking:
  # - pending
  # - processing
  # - completed
  # - failed
end
```

### 2. Form Objects with Complex Validation

```ruby
class Signup
  include ActiveModel::Model

  validates :email_address, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :full_name, presence: true

  def create_identity
    # Multi-step process
  end

  def complete
    # Complex account creation with rollback handling
  end
end
```

### 3. External API Interactions

When coordinating with external services:

```ruby
class StripeEventManager
  def handle_invoice_paid(invoice)
    payment = Payment.from_stripe_invoice!(invoice)
    subscription = payment.subscription
    subscription.prolong
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

## Naming Guidelines

If you must create a service-like object:

1. **Name it for WHAT it does, not THAT it's a service**
   - Bad: `CardCreationService`, `UserActivationService`
   - Good: `Signup`, `ImportCards`, `StripeEventManager`, `DataExportJob`

2. **Use ActiveModel::Model for form-like objects**
   - Gets validations for free
   - Works with Rails form helpers
   - Clear that it's not a persisted model

3. **Use ApplicationRecord for stateful operations**
   - When you need to track progress
   - When you need to store the result
   - When users need to see the status

4. **Use Jobs for async operations**
   - Background processing
   - Scheduled work
   - Delegates to models for actual logic

## Alternatives to Services

Before creating a service, consider:

| Need | Alternative |
|------|-------------|
| Single model operation | Model method |
| Multi-model form | Form object (accepts nested attributes) |
| Complex query | Model scope |
| Async operation | Job |
| Stateful operation | ApplicationRecord model |
| Multi-step workflow | Plain object with ActiveModel::Model |

## Official Resources

For patterns that serve as alternatives to traditional service objects:
- [Active Model Basics](https://guides.rubyonrails.org/active_model_basics.html) - For using `ActiveModel::Model` in plain objects.
- [Active Job Basics](https://guides.rubyonrails.org/active_job_basics.html) - For async operations.

## Remember

> "Services are the waiting room for abstractions that haven't emerged yet." - DHH

If you find `app/services/` growing, it's a sign you're missing the right abstractions. The goal is to find the right objects, not to create a service layer.

> "Vanilla Rails is plenty." - DHH
