# /vanilla:simplify

Plan incremental simplification of a Rails codebase toward Vanilla Rails philosophy.

## Usage

```
/vanilla:simplify                           # Plan overall simplification
/vanilla:simplify [goal]                    # Plan specific goal
/vanilla:simplify:services                  # Plan service layer reduction
/vanilla:simplify:models                    # Plan model enrichment
```

## Examples

```
/vanilla:simplify "remove unnecessary services"
/vanilla:simplify "enrich Order model"
/vanilla:simplify "slim down OrdersController"
```

## Process

1. **Understand current state** - Analyze existing architecture
2. **Identify simplification opportunities** - Find over-engineering
3. **Create incremental plan** - Small, reversible steps
4. **Prioritize by impact** - Quick wins first
5. **Generate migration guide** - Step-by-step instructions

## Simplification Strategies

### Service Layer Reduction

**Phase 1: Delete obvious cruft**
- Services called by only one place
- Services that wrap single model methods
- Services with < 10 lines

**Phase 2: Move domain logic**
- Identify business logic in services
- Move to appropriate models
- Update callers

**Phase 3: Reevaluate borderline cases**
- Services coordinating multiple models
- Consider if controller could orchestrate instead

### Model Enrichment

**Phase 1: Add missing APIs**
- Identify operations done TO models
- Create intention-revealing methods
- Example: `order.complete!` instead of service calling multiple methods

**Phase 2: Consolidate scattered logic**
- Find business logic in services
- Move into appropriate models
- Update all call sites

**Phase 3: Improve queries**
- Extract complex queries to scopes
- Add query methods for common patterns
- Consider query objects only for complex, reusable queries

### Controller Slimming

**Phase 1: Extract business logic**
- Move calculations to models
- Move validation to models
- Move state changes to models

**Phase 2: Simplify orchestration**
- Call single model method instead of multiple services
- Use model callbacks appropriately
- Keep only HTTP concerns in controller

## Output Format

```markdown
## Vanilla Rails Simplification Plan

### Goal: [Your specified goal]

### Current State
[Brief description of current architecture]

### Proposed Changes

#### Step 1: Quick Win (Low Risk, High Impact)
**Action:** [What to do]
**Files:** [Affected files]
**Effort:** ~30 minutes
**Risk:** Low

```ruby
# Before
class OrdersController
  def create
    @order = ProcessOrderService.new(params).call
  end
end

# After
class OrdersController
  def create
    @order = Order.create!(order_params)
    @order.process
  end
end
```

#### Step 2: Medium Win
**Action:** [What to do]
**Files:** [Affected files]
**Effort:** ~2 hours
**Risk:** Medium

[Details with code examples]

#### Step 3: Larger Change
**Action:** [What to do]
**Files:** [Affected files]
**Effort:** ~1 day
**Risk:** Higher

[Details with code examples]

### Rollback Plan
[How to revert if needed]

### Success Criteria
[How to verify the simplification worked]
```

## Stop Points

Each step should be independently valuable and reversible. User can stop after any step.

**Stop here if:**
- Goal achieved
- Risk becomes unacceptable
- Team disagrees with direction
