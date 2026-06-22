# Recurring Expense template CRUD + Recurring screen

Status: done
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md) · [ADR 0006](../../../docs/adr/0006-recurring-expenses-templates-and-data-retention.md)

## What to build

Let the user create, edit, and deactivate Recurring Expense templates.

- `RecurringService` over `IRecurringExpenseRepository` + a zod `schema.ts` (single source of truth): name, category (required), default amount (display units → cents), frequency (weekly/monthly), `anchor_day` validated per frequency.
- A dedicated `_authed/recurring` route with an **"Add Recurring Expense"** button and a management list of templates (edit / deactivate).
- Create + edit forms built with the shadcn `Form` primitives (per CLAUDE.md form conventions).
- **Deactivate** flips `active=false` + sets `deactivated_at`, behind a confirmation dialog that warns it will stop tracking N upcoming Due items. History is retained (no delete). Editing the default amount affects only future occurrences.
- Hard delete is reserved for clearly-wrong templates and is a separate, explicit action.

## Acceptance criteria

- [ ] A user can create a Recurring Expense (category + amount required; anchor validated per frequency)
- [ ] A user can edit a template; amount changes affect only future occurrences
- [ ] A user can deactivate a template via a confirmation dialog; it disappears from active prompts but its history remains
- [ ] The Recurring screen lists templates with an "Add Recurring Expense" entry point
- [ ] Service-layer tests with a fake repo cover validation + create/edit/deactivate

## Blocked by

- 09 — Recurring Expenses schema + data layer
