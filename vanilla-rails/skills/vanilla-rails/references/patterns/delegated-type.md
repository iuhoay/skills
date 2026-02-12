# Delegated Type

`ActiveRecord::DelegatedType` is the preferred way in Vanilla Rails to handle "is-a" relationships where multiple models share a common interface and identity, but have distinct data requirements.

## Why Delegated Type?

In traditional Rails, we often chose between:
1. **STI (Single Table Inheritance):** All data in one table. Leads to "sparse" tables with many null columns.
2. **Polymorphic Associations:** Flexible, but loses database integrity and makes it harder to treat the "parent" as a first-class citizen.

**Delegated Type** provides a middle ground:
- A "supertype" table (e.g., `Entry`, `Recording`) handles shared concerns (identity, timestamps, common attributes).
- "Subtype" tables (e.g., `Post`, `Comment`, `Todo`) handle specific data.

## Implementation Example

Imagine a `Message` system where different types of content can be sent.

### 1. The Supertype (The "Entry")

```ruby
# db/migrate/20260101000001_create_messages.rb
create_table :messages do |t|
  t.references :subject, polymorphic: true, null: false
  t.references :sender, null: false
  t.string :status
  t.timestamps
end

# app/models/message.rb
class Message < ApplicationRecord
  # Define the delegated type
  delegated_type :subject, types: %w[ TextContent ImageContent VideoContent ]
  
  belongs_to :sender, class_name: "User"
  
  # Shared business logic
  def deliver
    update!(status: "delivered")
    subject.deliver_notifications
  end
end
```

### 2. The Subtypes

```ruby
# app/models/text_content.rb
class TextContent < ApplicationRecord
  include Messageable # Optional concern for shared subtype behavior
  
  def deliver_notifications
    # Text-specific notification logic
  end
end

# app/models/image_content.rb
class ImageContent < ApplicationRecord
  include Messageable
  has_one_attached :file
  
  def deliver_notifications
    # Image-specific notification logic
  end
end
```

### 3. Usage

```ruby
# Creation
Message.create! subject: TextContent.new(body: "Hello"), sender: current_user

# Querying
Message.text_contents # Returns all Messages with TextContent
Message.first.text_content? # true/false
Message.first.subject # returns the TextContent instance
```

## When to Use

Use Delegated Type when:
- You have several models that share a lot of behavior and metadata.
- You want to query across all types (e.g., a "Feed" or "Inbox").
- Each type has significantly different attributes (avoiding STI bloat).
- You want to keep the "Rich Model" principle by putting type-specific logic in the subtypes and shared logic in the supertype.

## Comparison

| Feature | STI | Polymorphic | Delegated Type |
|---------|-----|-------------|----------------|
| **Database Integrity** | High | Low | High |
| **Table Bloat** | High | Low | Low |
| **Shared Identity** | Yes | No | Yes |
| **Ease of Querying** | High | Medium | High |

## Fizzy/37signals Pattern

37signals uses this extensively (e.g., `Entry` in HEY, `Recording` in Basecamp). It allows the supertype to handle "infrastructure" concerns like access control, activity tracking, and search indexing, while the subtypes handle the actual domain content.

> "Delegated types are a powerful alternative to STI when you have many different types that share a common set of attributes, but also have many that are specific to each type." - Rails Guides (inspired by DHH)
