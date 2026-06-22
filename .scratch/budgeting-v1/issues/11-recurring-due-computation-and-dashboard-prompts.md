# Recurring due computation + Dashboard prompts

Status: done
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md) · [ADR 0006](../../../docs/adr/0006-recurring-expenses-templates-and-data-retention.md)

## What to build

The generate-on-read engine and the prompt-to-confirm UX.

- A **pure helper** that, given the active templates, the current date, and `budget_period_start_day`, computes the **Due** occurrences for the current window — weekly templates per weekly slice, monthly per Period — **minus** any occurrence already resolved (`confirmed`/`skipped`). Nothing is pre-materialized; "Due" is computed, never stored.
- Dashboard **"Due now"** list rendering the computed Due items.
- **Confirm**: opens a pre-filled expense transaction (template amount/category/`occurrence_date`) with the **amount and date editable**; saving creates a transaction with `recurring_expense_id` set AND writes a `confirmed` occurrence row (with `transaction_id`). It counts in Cashflow.
- **Skip**: writes a `skipped` occurrence row so it isn't prompted again that window.

## Acceptance criteria

- [ ] Due computation: weekly templates surface per weekly slice, monthly once per Period; deactivated templates never surface
- [ ] An occurrence already `confirmed` or `skipped` is excluded from Due
- [ ] Confirming creates a linked transaction (amount/date tweakable) that appears in Cashflow + a `confirmed` occurrence
- [ ] Skipping records a `skipped` occurrence and stops the prompt for that window
- [ ] Pure-function tests cover the window/anchor math; service-layer tests with a fake repo cover confirm/skip and Due exclusion

## Blocked by

- 05 — Dashboard cashflow summary
- 10 — Recurring Expense template CRUD + Recurring screen
