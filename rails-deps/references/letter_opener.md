# letter_opener

Preview emails in your browser instead of sending during development.

## What It Does

Intercepts outgoing emails in development and opens them in your browser for preview.

## Installation

Add to `Gemfile`:

```ruby
gem "letter_opener", group: :development
```

```bash
bundle install
```

## Configuration

Add to `config/environments/development.rb`:

```ruby
config.action_mailer.delivery_method = :letter_opener
config.action_mailer.perform_deliveries = true

# Optional: Change storage location
config.letter_opener.location = Rails.root.join('tmp', 'letter_opener')

# Optional: Open in new tab
config.letter_opener.open_on = true
```

## Usage

Send emails normally:

```ruby
UserMailer.welcome_email(@user).deliver_now
# or
UserMailer.welcome_email(@user).deliver_later
```

Email will open automatically in your browser.

## Advanced: letter_opener_web

Browse sent emails without leaving the browser:

Add to `Gemfile`:

```ruby
group :development do
  gem "letter_opener_web", "~> 3.0"
end
```

```bash
bundle install
```

Add to `config/routes.rb`:

```ruby
mount LetterOpenerWeb::Engine, at: "/letter_opener" if Rails.env.development?
```

Configure:

```ruby
# config/environments/development.rb
config.action_mailer.delivery_method = :letter_opener_web
config.action_mailer.perform_deliveries = true
```

Visit `http://localhost:3000/letter_opener` to see all sent emails.

## Features

| Feature | letter_opener | letter_opener_web |
|---------|---------------|-------------------|
| Browser preview | ✅ | ✅ |
| Email list | ❌ | ✅ |
| Multiple devices | ❌ | ✅ |
| No file writes | ❌ | ✅ |
| Zero-conf setup | ✅ | ⚠️ (needs route) |

## Testing Preview Styles

Use letter_opener to test:
- Responsive design
- Email client compatibility
- Plain text vs HTML versions
- Attachments
- Inline CSS vs stylesheets

## Alternative: Mailcatcher

```ruby
# Gemfile
gem "mailcatcher"
```

```bash
mailcatcher
# Visit http://localhost:1080
```

```ruby
# config/environments/development.rb
config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = { address: 'localhost', port: 1025 }
```

## Links

- [letter_opener GitHub](https://github.com/ryanb/letter_opener)
- [letter_opener_web GitHub](https://github.com/flyerhzm/letter_opener_web)
- [Rails Action Mailer Basics](https://guides.rubyonrails.org/action_mailer_basics.html)
