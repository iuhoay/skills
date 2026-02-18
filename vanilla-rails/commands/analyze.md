# /vanilla:analyze

Analyze a Rails codebase for over-engineering and opportunities to simplify toward Vanilla Rails.

## Usage

```
/vanilla-rails:analyze                    # Analyze entire codebase
/vanilla-rails:analyze [path]             # Analyze specific directory
/vanilla-rails:analyze:services           # Focus on service layer analysis
/vanilla-rails:analyze:models             # Focus on model health
```

## Analysis Areas

### 1. Service Layer Audit

Check `app/services` for over-engineering:

**Findings:**
- Count total service objects
- Identify services called by only one place
- Find services that wrap single model methods
- Detect services with domain logic that belongs in models

**Commands:**
```bash
# Count services
find app/services -name "*_service.rb" | wc -l

# Find single-use services
grep -r "ProcessOrderService" app/ --exclude-dir=services

# Find thin wrapper services
# (services with < 10 lines)
```

### 2. Model Health Assessment

Analyze `app/models` for anemia:

**Findings:**
- Models with only associations and validations
- Missing business methods
- Models that are just data containers

**Good Model Indicators:**
- Business methods (domain logic)
- Intention-revealing APIs
- State-changing methods
- Query scopes

### 3. Controller Thickness

Analyze `app/controllers` for fat controllers:

**Findings:**
- Controllers with > 10 lines per action
- Business logic in controllers
- Controllers coordinating multiple services

**Red Flags:**
- `before_action` with business logic
- Instance variables set with complex logic
- Conditional business logic in actions

### 4. Abstraction Layers

Detect unnecessary abstractions:

**Findings:**
- "Manager", "Handler", "Processor" classes
- Form objects for simple forms
- Query objects for simple scopes
- Presenters for trivial formatting

### 5. Style Consistency

Check code style against Vanilla Rails preferences:

**Findings:**
- Guard clauses vs expanded conditionals
- Method ordering
- Visibility modifier formatting
- CRUD resource design

## Output Format

```markdown
## Vanilla Rails Analysis

### Service Layer Audit

**Total Services Found:** 42

🔴 **Over-Engineered:**
- `ProcessOrderService` (5 lines) - Thin wrapper around Order
- `CalculateCartTotalService` - Domain logic belongs in Cart model
- `UserAuthenticationService` - Should be User.authenticate method

⚠️ **Questionable:**
- `StripeEventManager` - Coordinates multiple models, potentially justified
- `SignupIdentityCreator` - Multi-step workflow, may be appropriate

💡 **Services Actually OK:**
- `ImportBulkRecordsJob` - External API interaction, good candidate
- `GenerateMonthlyReportService` - Complex coordination, justified

### Model Health

**Anemic Models Detected:**
- `User` - Only has associations. All auth logic in UserAuthenticationService
- `Order` - Missing business APIs like `process`, `complete`, `cancel`

**Rich Models (Good):**
- `Card` - Has `gild`, `close`, `archive` methods
- `Bucket` - Contains business logic for recordings

### Controller Thickness

**Fat Controllers Found:**
- `OrdersController#create` (45 lines) - Contains pricing logic
- `UsersController#update` (30 lines) - Profile update logic in controller

### Recommendations

**Immediate Wins:**
1. Delete `ProcessOrderService` (42 LOC → 0 LOC), move to `Order#process`
2. Move `calculate_total` from CartTotalService to Cart model
3. Extract pricing logic from OrdersController to Order model

**Consider:**
1. Review StripeEventManager - could be model concern
2. Flatten SignupIdentityCreator into controller + model calls
3. Add business methods to User model

**Stats:**
- Potential LOC reduction: ~500 lines
- Services to remove: 8
- Models to enrich: 5
```

## Automation Level

1. **Automatic:** Scan codebase for patterns
2. **Automatic:** Categorize findings by severity
3. **Automatic:** Generate recommendations
4. **Manual judgment:** Whether specific services are justified
