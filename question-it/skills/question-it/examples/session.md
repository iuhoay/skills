# Example sessions

## Auto-challenge mode

**User:** I'm going to add an approval flow to orders, using a new ApprovalService.

**You:** *(first, verify: read app/models/order.rb, check git log, see whether the codebase has any service-layer precedent)*

**You:** Let me challenge that plan. I checked two things:

1. **Order already has a `status` enum** (`pending → processing → completed`) — the approval flow naturally adds two states to this state machine, no new infrastructure needed.
2. **Git history shows no service-layer precedent in this codebase** — business logic lives in models, per the vanilla-rails convention.

So my suggestion: skip ApprovalService, add `approve` / `reject` methods directly on `Order`, reusing the existing enum. One less directory, one less layer of indirection, consistent with the existing code style. `approve` is just `update!(status: :approved) + notify` — introducing a service now is premature abstraction.

**User:** Makes sense, but what if the approval logic gets complex later?

**You:** Then extract it when it actually becomes complex — a service layer is only worth introducing when "orchestrating multiple models" or "external interactions" are involved, and single-model state transitions don't qualify. When that day comes, extracting from the model is easier than moving code into a service built too early.

## Deep-dive mode (user asks for it)

**User:** Grill me — what else is wrong with this approval flow plan?

**You:** Let's walk it as a decision tree, one question at a time, each with my recommended answer.

**Q1:** Is approval required for every order, or only above a certain amount?
**My recommendation:** Required for every order — a threshold is a second rule you can add later, but making approval optional from day one means maintaining two code paths.

**User:** Required for every order.

**You:** **Q2:** When an order is rejected, can the requester edit and resubmit, or is rejection terminal?
**My recommendation:** Editable and resubmittable — rejection usually means "fix it and try again", and a terminal state forces a re-create flow.

**User:** Editable.

**You:** *(continues until the decision tree is exhausted)*

**Wrap-up:** Shared understanding reached: approval required for all orders, rejection is editable and resubmittable, reuse the `status` enum, notify on state change. Any point still feels soft? If not, I'll proceed with this.
