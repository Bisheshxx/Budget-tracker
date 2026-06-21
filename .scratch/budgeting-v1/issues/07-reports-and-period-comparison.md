# Reports + Period Comparison

Status: done
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md)

## What to build

The secondary Reports surface: understand spending over time. No AI (deferred per ADR 0001).

- Period Comparison: current Period vs. previous Period, reported as **both a percentage change and an absolute amount**, overall and **per category** (e.g. "Food +18% (+$120)").
- Charts (Recharts): income vs. expenses and category spend for the current Period.
- Weekly slices: break the current Period into its weeks and show weekly spend within the Period.
- Comparison/aggregation logic lives in the report/transaction service over two Period queries; pure delta computation is unit-testable.

## Acceptance criteria

- [ ] Reports view shows current Period vs. previous Period as % and absolute amount, overall
- [ ] Per-category comparison shows which categories drove the change (% and amount)
- [ ] Income-vs-expenses and category-spend charts render
- [ ] The current Period can be sliced into weeks showing weekly spend
- [ ] Pure unit tests cover the comparison delta math (percentage and absolute, including zero/empty previous-Period edge cases)
- [ ] Service-layer tests with a fake repository cover the two-Period aggregation

## Blocked by

- 05 — Dashboard cashflow summary
