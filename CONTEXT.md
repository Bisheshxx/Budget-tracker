# Budgeting App

A personal finance app for staying on top of your cashflow — knowing how much you earned and spent each week/month, with easy at-a-glance access. The core problem is awareness and ease of access, not enforcing a strict budget. Web first; a native app is planned later. AI-generated spending overviews are a planned _future_ feature (owned by a future backend), not part of V1.

## Language

**Period**:
The canonical budgeting cycle the user actively manages. A monthly cycle anchored on the user's `budget_period_start_day` (e.g. the 25th of one month to the 24th of the next), not necessarily the calendar 1st.
_Avoid_: Month (ambiguous with calendar month), cycle

**Recurring Expense**:
A user-defined template for a fixed, repeating cost (e.g. rent, gym, a subscription). Expenses only — income stays manual because it varies. Carries a category, a default amount, a frequency (weekly, fortnightly, or monthly), and a First Due Date. Weekly repeats every 7 days from that date, fortnightly every 14 days, and monthly repeats on that date's day-of-month (limited to 1–28). Deactivated rather than deleted when it ends, so its history is retained.
_Avoid_: Subscription (too narrow), bill, standing order

**First Due Date**:
The first date a Recurring Expense should prompt as Due. It is the recurrence anchor for all cadences. A past First Due Date is allowed; missed occurrences compute as Due until confirmed or skipped.
_Avoid_: Anchor day, start date (too vague)

**Recurring Occurrence**:
A single due instance of a Recurring Expense. Stored only once resolved — as `confirmed` (the user logged it, creating a linked transaction) or `skipped` (deliberately not paid this occurrence).
_Avoid_: Instalment, charge

**Due**:
A _computed_ state (never stored): an active Recurring Expense whose current window has no resolved Occurrence yet. The Dashboard surfaces Due items as prompt-to-confirm nudges.
_Avoid_: Pending, scheduled (nothing is auto-generated or scheduled)

**Budget Target**:
A deprecated V1 field retained in storage for future target work, but hidden from active onboarding, settings, dashboard, and reports. The headline outcome signal is Remaining from income, not target adherence.
_Avoid_: Budget limit, spending cap (it does not enforce anything), weekly budget

**Calendar Month**:
A reporting view from the first day of a calendar month to the first day of the next month. It summarizes real dated transactions and is separate from the user's Period.
_Avoid_: Period

**Calendar Week**:
A reporting view from the configured week start day to seven days later, defaulted from locale. It summarizes real dated transactions and is separate from recurring payment cadence.
_Avoid_: Weekly recurrence

**Range**:
A user-chosen arbitrary date span (any start date to any end date) used purely to _view_ spending — an exploratory lens, not a budgeting cycle. Distinct from a Period: a Range is free-form and carries no target, First Due Date, or pass/fail meaning. When a Range is active the Dashboard reports Cashflow over those dates instead of the current Period; with no Range active the Dashboard shows the current Period.
_Avoid_: Period (a Range is not a Period), filter, date filter

**Cashflow**:
The primary input signal: income in vs. expenses out over the selected window. This — together with simple "how much did I spend" awareness — is the app's foundation.
_Avoid_: Balance (implies a running account balance, which we don't track)

**Remaining from income**:
The primary outcome signal for a selected window: income minus expenses. It can be positive, zero, or negative and is derived from real dated transactions.
_Avoid_: Target remaining, balance

**Savings**:
A _derived outcome_, not a tracked transaction. What the user saved in a Period = Remaining from income (income − real expenses). Transfers to a savings account are deliberately NOT recorded — they aren't consumption and the user still holds the money. There is no Savings input category.
_Avoid_: Savings category, savings transaction, savings transfer (none exist as inputs)

**Category**:
A label for grouping transactions (and Recurring Expenses). **System/preset** categories (e.g. Housing, Food) are seeded and shared by everyone; **custom** categories are owned by one user. **Uncategorized** is the fallback bucket — a transaction with no category (null `category_id`) reads as Uncategorized; deleting a custom category falls its transactions back to it. Each carries a color and a lucide icon name.
_Avoid_: Tag, label (use "category"), folder

**Period Comparison**:
This Period vs. the previous Period, reported as both a percentage change and an absolute amount (e.g. "Food +18% (+$120)"), overall and per category. The payoff of tracking over time; part of V1 (no AI involved).
_Avoid_: Trend, delta (use "comparison")

**Onboarding**:
A one-screen setup gate shown after first signup, before the dashboard is reachable. Required: currency + Period start day. Everything else (display name, grocery day) is optional and editable later in Settings. A user is "onboarded" once `onboarding_completed_at` is stamped (the signup trigger leaves it null; completing Onboarding sets it). Display name is optional and is **not** the completion signal.
_Avoid_: Setup wizard, registration (that's auth/signup, a separate step)
