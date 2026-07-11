# Recurring Expenses: templates, prompt-to-confirm, and data retention

Status: accepted

## Context

V1 originally treated "recurring" as a **label only** — a boolean checkbox on a
transaction — and explicitly listed a recurrence engine, auto-generated transactions, and
Recurring Expense templates as **non-goals** (see the original `.scratch/budgeting-v1/PRD.md`).
That framing assumed the user's fixed commitments were easy to log by hand.

In practice the user's _income_ is variable (hours-based pay), which is why the **Payday**
feature was removed entirely. What _is_ fixed is the **cost** side — rent, subscriptions,
gym. The user wants these to be first-class, recognised objects they can manage and analyse,
not loose per-transaction labels.

## Decision

We reverse the non-goal and introduce **Recurring Expenses** as first-class templates, with
two deliberate, hard-to-reverse choices:

### 1. Templates with prompt-to-confirm (not auto-generation)

A Recurring Expense is a template (name, required category, required default amount,
frequency `weekly`/`fortnightly`/`monthly`, and First Due Date). Weekly repeats every 7
days from First Due Date, fortnightly every 14 days, and monthly repeats on the First Due
Date's day-of-month. When an occurrence is **Due**, the Dashboard prompts the user to
confirm; confirming pre-fills a normal expense transaction whose amount/date the user can
tweak before saving. Nothing reaches Cashflow until confirmed.

We chose prompt-to-confirm over silent auto-generation because the real amount can differ
from the template default (the same variability that killed Payday), and the app's stance is
"awareness and ease of access, not enforcement" (see `CONTEXT.md`). Auto-generating possibly
wrong rows into real Cashflow would reintroduce exactly the problem we removed.

The manual `is_recurring` boolean on transactions is **dropped**; "recurring" is derived from
`transactions.recurring_expense_id IS NOT NULL`, so the concept has a single source of truth.

### 2. Generate-on-read occurrences + deactivate-don't-delete (data retention)

This app is client-side with swappable Supabase repositories and **no backend scheduler**
(see [ADR 0001](./0001-client-side-swappable-repositories.md)). So occurrences are
**computed on read**, never pre-materialized: "Due" = an active template occurrence on or
after its First Due Date, up to today, with no resolved occurrence row yet. The occurrence
table stores **only resolved** rows — `confirmed` or `skipped`. There are no `pending` or
`cancelled` rows.

Prompt-to-confirm remains the rule, but grouped batch confirmation is allowed when multiple
missed occurrences are shown together (setup backfill or a long gap between app opens).
**Accept all** creates one expense transaction per occurrence using the template defaults.

Templates are **deactivated, not deleted** (set inactive + `deactivated_at`), which stops
them being computed/prompted while preserving all history. Editing a template's default
amount affects only future occurrences; past confirmed transactions keep their logged amount.
Hard deletion is reserved for genuinely _wrong_ data (a template created by mistake) and
**never erases confirmed payment history**. It is only permitted when the template has **no
confirmed linked transactions** — a template with no occurrences, or only `skipped` ones, is
removed outright together with its own occurrence rows. If hard delete is invoked on a template
that _does_ have confirmed history, it instead **severs the template link** from those
transactions — their rows and logged amounts are preserved — rather than cascade-deleting them,
removing only the template's own (unconfirmed) occurrence rows. Ending a service instead uses
deactivation (set inactive + `deactivated_at`). The driving constraint: **all payment
history is retained for analytics**, distinguishing a one-off `skipped` window from ending a
service entirely (template inactive).

## Consequences

- The V1 PRD's "label only" non-goal is superseded; the PRD and issues are updated to match.
- New tables `recurring_expenses` and `recurring_expense_occurrences`, a
  `transactions.recurring_expense_id` FK, and an `IRecurringExpenseRepository` port are added.
- If the user does not open the app for a long stretch, multiple occurrences compute as Due
  at once on next open — accepted as correct (they _were_ due), with grouped confirmation to
  reduce repetitive work.
- Yearly frequency and recurring _income_ are intentionally out of scope; both are clean
  additive extensions (a wider frequency enum / a type column) if a real need appears.
