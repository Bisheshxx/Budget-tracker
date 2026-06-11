# Budgeting App

A personal finance app for staying on top of your cashflow — knowing how much you earned and spent each week/month, with easy at-a-glance access. The core problem is awareness and ease of access, not enforcing a strict budget. Web first; a native app is planned later. AI-generated spending overviews are a planned *future* feature (owned by a future backend), not part of V1.

## Language

**Period**:
The canonical budgeting cycle a budget target and reports are measured against. A monthly cycle anchored on the user's `budget_period_start_day` (e.g. the 25th of one month to the 24th of the next), not necessarily the calendar 1st.
_Avoid_: Month (ambiguous with calendar month), cycle

**Payday**:
A contextual signal (day + frequency) describing when the user gets paid. Informs AI narration and UI nudges only — it does NOT define Period boundaries or reset the budget.
_Avoid_: Pay cycle (suggests it bounds the budget — it does not)

**Budget Target**:
A soft reference amount the user sets to frame their mindset for a Period — NOT a pass/fail verdict. The headline signal is Cashflow, not target adherence. The Period is always monthly; the user configures its start day and this reference target.
_Avoid_: Budget limit, spending cap (it does not enforce anything), weekly budget

**Cashflow**:
The primary signal: income in vs. expenses out over a Period (and its weekly slices), and the resulting net. This — together with simple "how much did I spend" awareness — is the app's headline, above Budget Target.
_Avoid_: Balance (implies a running account balance, which we don't track)

**Savings**:
A *derived outcome*, not a tracked transaction. What the user saved in a Period = net Cashflow (income − real expenses). Transfers to a savings account are deliberately NOT recorded — they aren't consumption and the user still holds the money. There is no Savings input category.
_Avoid_: Savings category, savings transaction, savings transfer (none exist as inputs)

**Period Comparison**:
This Period vs. the previous Period, reported as both a percentage change and an absolute amount (e.g. "Food +18% (+$120)"), overall and per category. The payoff of tracking over time; part of V1 (no AI involved).
_Avoid_: Trend, delta (use "comparison")

**Onboarding**:
A one-screen setup gate shown after first signup, before the dashboard is reachable. Required: currency + Period start day. Everything else (display name, payday, target) is optional and editable later in Settings. A user is "onboarded" once `display_name` is set (the signup trigger leaves it null).
_Avoid_: Setup wizard, registration (that's auth/signup, a separate step)
