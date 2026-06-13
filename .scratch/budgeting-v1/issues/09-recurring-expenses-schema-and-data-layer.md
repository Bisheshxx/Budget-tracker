# Recurring Expenses schema + data layer

Status: ready-for-agent
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md) · [ADR 0006](../../../docs/adr/0006-recurring-expenses-templates-and-data-retention.md)

## What to build

The persistence spine for Recurring Expenses. No UI yet.

- Migration: drop `transactions.is_recurring`; add `transactions.recurring_expense_id uuid` FK (`references recurring_expenses(id) on delete set null`, so hard-deleting a template severs the link and preserves the transaction rather than cascade-deleting confirmed history — see ADR 0006).
- New `recurring_expenses` table: `id`, `user_id` FK, `name`, `category_id` FK (**required**), `amount_cents int not null check (> 0)`, `frequency text check (frequency in ('weekly','monthly'))`, `anchor_day int`, `active bool not null default true`, `created_at`, `deactivated_at`. Row-level CHECK keyed on frequency: `(frequency='weekly' and anchor_day between 0 and 6) or (frequency='monthly' and anchor_day between 1 and 28)`.
- New `recurring_expense_occurrences` table holding **only resolved** rows: `id`, `recurring_expense_id` FK, `occurrence_date date`, `status text check (status in ('confirmed','skipped'))`, `transaction_id uuid` (set when confirmed), `created_at`. Unique `(recurring_expense_id, occurrence_date)`.
- RLS policies mirroring `transactions` (owner-only via `user_profiles`).
- Domain types in `src/features/recurring/types.ts` (`RecurringExpense`, `RecurringExpenseCreate`, `RecurringOccurrence`, `RecurringFrequency`).
- `IRecurringExpenseRepository` port in `src/data/recurring/` + Supabase implementation + wiring `index.ts` (ADR 0001 / 0004).
- Regenerate `src/lib/database.types.ts`.

## Acceptance criteria

- [ ] Migrations create both tables with the frequency-keyed CHECK and RLS; `transactions.is_recurring` is gone and `recurring_expense_id` exists
- [ ] Domain types live in the feature; the port imports them from `#/features/recurring/types`
- [ ] All data access is behind `IRecurringExpenseRepository`; no data client in components
- [ ] `database.types.ts` regenerated and type-checks

## Blocked by

- 04 — Categories management + picker
- 06 — Transaction edit + delete
