# bullet

Detect N+1 queries and unused eager loading in Rails applications.

## What It Does

Bullet helps you:
- Detect N+1 queries
- Detect unused eager loading
- Alert you in development before hitting production

## Installation

Add to `Gemfile`:

```ruby
gem "bullet", group: :development
```

```bash
bundle install
```

## Configuration

Add to `config/environments/development.rb`:

```ruby
config.after_initialize do
  Bullet.enable = true
  Bullet.alert = true
  Bullet.bullet_logger = true
  Bullet.console = true
  Bullet.rails_logger = true

  # Optional: Add notifications
  Bullet.add_footer = true
  Bullet.skip_html_injection = false
end
```

## Notification Channels

| Channel | Enable With | Description |
|---------|-------------|-------------|
| Browser alert | `Bullet.alert = true` | JavaScript alert in browser |
| Console | `Bullet.console = true` | Rails console output |
| Log file | `Bullet.bullet_logger = true` | `log/bullet.log` |
| Rails logger | `Bullet.rails_logger = true` | Rails log output |
| Footer | `Bullet.add_footer = true` | Inline on page |

## What Gets Detected

### N+1 Queries

```ruby
# BAD - N+1 query
users = User.all
users.each do |user|
  puts user.posts.count  # Queries posts for EACH user
end

# GOOD - Eager loading
users = User.includes(:posts).all
users.each do |user|
  puts user.posts.count  # Uses cached association
end
```

### Unused Eager Loading

```ruby
# BAD - Unused eager loading
users = User.includes(:posts).all
users.each do |user|
  puts user.name  # Never uses posts association
end

# GOOD - Remove includes
users = User.all
users.each do |user|
  puts user.name
end
```

### Counter Cache

```ruby
# Bullet suggests using counter cache
# Instead of:
@user.posts.count

# Use:
# Add posts_count column to users table
@user.posts_count
```

## Association Best Practices

| Pattern | Use When |
|---------|----------|
| `includes(:posts)` | You'll access the association |
| `preload(:posts)` | Disjoint loading, no joins |
| `eager_load(:posts)` | Always use LEFT OUTER JOIN |
| `joins(:posts)` | Filtering only, not accessing data |

## RSpec Integration

```ruby
# spec/spec_helper.rb
if Bullet.enable?
  config.before(:each) do
    Bullet.start_request
  end

  config.after(:each) do
    Bullet.perform_out_of_channel_notifications if Bullet.notification?
    Bullet.end_request
  end
end
```

## Debugging

Enable detailed logging:

```ruby
Bullet.n_plus_one_query_enable = false  # Disable specific checks
Bullet.unused_eager_loading_enable = false
Bullet.counter_cache_enable = false
```

## Links

- [GitHub](https://github.com/flyerhzm/bullet)
- [Rails N+1 Queries Guide](https://guides.rubyonrails.org/active_record_querying.html#eager-loading-associations)
