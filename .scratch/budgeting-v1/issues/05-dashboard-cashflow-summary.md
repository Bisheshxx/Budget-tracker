# Dashboard cashflow summary

Status: ready-for-agent
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md)

## What to build

The primary surface: the current Period at a glance.

- Pure Period-boundary helpers: given a date and `budget_period_start_day`, resolve the current Period's range (monthly cycle anchored on the start day, including month-flip and the 1–28 clamp). Plus `getPeriodKey`.
- `getPeriodSummary` on the transaction service: total income, total expenses, and **net** for the current Period, computed from cents.
- Dashboard UI: income in / expenses out / net; days-into-Period context; spend-by-category breakdown; recent transactions; Budget Target shown as a **soft reference** (never pass/fail). (The Recurring Expenses "Due now" prompts are added later, in issue 11.)
- All amounts display in the user's chosen currency.

## Acceptance criteria

- [ ] Period range resolves correctly for start days across month boundaries (e.g. start day 25)
- [ ] Dashboard shows current-Period income, expenses, and net
- [ ] Days-into-Period is shown
- [ ] Spend-by-category breakdown and recent transactions render
- [ ] Budget Target is presented as a soft anchor, not a verdict
- [ ] Pure unit tests cover Period-boundary math, `getPeriodKey`, and cents↔display formatting
- [ ] Service-layer tests with a fake repository cover the income/expenses/net summary

## Blocked by

- 04 — Categories management + picker
