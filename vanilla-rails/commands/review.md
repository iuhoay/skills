# /vanilla:review

Code review from Vanilla Rails philosophy perspective.

## Usage

```
/vanilla:review                    # Review uncommitted changes
/vanilla:review [file_path]        # Review specific file
/vanilla:review --staged           # Review staged changes
/vanilla:review --branch main      # Review changes vs branch
```

## Process

1. **Identify changed files** (from git diff or provided paths)
2. **Detect over-engineering patterns**
   - Check for unnecessary service objects
   - Look for anemic models
   - Identify business logic in wrong places
3. **Evaluate controller thickness**
   - Controllers should be thin (5-10 lines max)
   - Should only parse params and call models
4. **Assess model richness**
   - Models should contain business logic
   - Look for intention-revealing APIs
5. **Generate review report** with prioritized suggestions

## Review Checklist

### Over-Engineering (Critical)
- [ ] No service objects for simple CRUD operations
- [ ] No business logic in services that belongs in models
- [ ] No unnecessary abstraction layers
- [ ] No "Manager" or "Handler" proxies

### Controller Health (Warning)
- [ ] Controllers are thin (< 10 lines)
- [ ] Controllers only handle HTTP concerns
- [ ] Controllers call rich model methods directly
- [ ] No business logic in controllers

### Model Health (Warning)
- [ ] Models contain business logic
- [ ] Models have intention-revealing APIs
- [ ] No anemic models (only attributes/associations)
- [ ] Proper use of concerns when needed

### Style (Suggestion)
- [ ] Proper conditional formatting (expanded over guards)
- [ ] Method ordering (class → public → private)
- [ ] Proper CRUD resource design
- [ ] Correct visibility modifier formatting

## Red Flags

🔴 **Critical: Unnecessary Service Layer**
- Service for simple CRUD that should be in controller
- Service containing domain logic that belongs in model
- Service that's just a thin wrapper around one model method

🔴 **Critical: Anemic Model**
- Model with only attributes and associations
- All business logic extracted to services
- Missing intention-revealing APIs

⚠️ **Warning: Fat Controller**
- Controller with business logic
- Controller coordinating multiple services
- Controller doing data transformation

⚠️ **Warning: Service Explosion**
- Service for every controller action
- Services sharing logic that should be in models
- No clear justification for service layer

## Output Format

```markdown
## Vanilla Rails Review

### Files Reviewed
- app/controllers/orders_controller.rb
- app/models/order.rb
- app/services/process_order_service.rb

### Issues Found

🔴 **Critical: Unnecessary Service Layer**
Location: `app/services/process_order_service.rb`
```ruby
class ProcessOrderService
  def call(order, params)
    order.update!(status: "processing")
    order.calculate_total
    order.send_confirmation
  end
end
```
**Problem:** This service is orchestrating a single model's behavior. The logic belongs in the Order model itself.
**Fix:** Move to rich model API:
```ruby
class OrdersController < ApplicationController
  def create
    @order = Order.create!(order_params)
    @order.process
  end
end

class Order < ApplicationRecord
  def process
    update!(status: "processing")
    calculate_total
    send_confirmation
  end
end
```

⚠️ **Warning: Fat Controller**
Location: `app/controllers/cards_controller.rb:15-30`
**Problem:** Controller contains business logic for card validation rules.
**Recommendation:** Extract validation logic to Card model.

⚠️ **Warning: Anemic Model Risk**
Location: `app/models/user.rb`
**Problem:** User model only has attributes and associations. All business logic (authentication, permissions, profile updates) extracted to services.
**Recommendation:** Move business logic back into User model. Create intention-revealing methods like `user.authenticate(credential)`, `user.can_perform?(action)`.

💡 **Suggestion: Guard Clause**
Location: `app/controllers/comments_controller.rb:8`
**Problem:** Guard clause makes code harder to read.
**Recommendation:** Use expanded conditional instead.

### Summary

**Good:**
- Clean use of strong parameters
- Proper RESTful routing

**Needs Attention:**
1. 🔴 Remove ProcessOrderService, move logic to Order model
2. ⚠️ Extract validation logic from controller to Card model
3. ⚠️ Move business logic from services back to User model

**Priority:** Address unnecessary service layer first, then enrich models.
```

## Severity Levels

### 🔴 Critical
Must fix before merge:
- Unnecessary service layer for simple operations
- Business logic in services that belongs in models
- Anemic models with all logic extracted

### ⚠️ Warning
Should fix or acknowledge:
- Fat controllers with business logic
- Service explosion without justification
- Missing intention-revealing model APIs

### 💡 Suggestion
Consider for improvement:
- Style preferences (conditionals, formatting)
- Code organization opportunities
- Pattern simplifications

## Automation Level

This command runs with mid-to-high automation:

1. **Automatic:** File identification, over-engineering detection
2. **Automatic:** Controller thickness analysis
3. **Automatic:** Model health assessment
4. **Automatic:** Issue categorization and prioritization
5. **Manual input needed:** Only for complex architectural decisions
