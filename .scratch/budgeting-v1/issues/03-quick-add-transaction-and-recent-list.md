# Quick-add transaction + recent list

Status: ready-for-agent
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md)

## What to build

The core data-layer spine and the most-used action: log a transaction and see it.

- Establish the repository pattern end-to-end: `ITransactionRepository` → Supabase implementation → `TransactionService` → wiring container → TanStack Query in the UI. Components call the service via the container only (ADR 0001).
- A one-tap quick-add form: amount, type (income/expense), category (optional for now → Uncategorized), date (defaults to today), and note. (No recurring toggle — recurring is template-driven via the Recurring Expenses feature, issues 09–11.)
- Amounts entered in display units, stored as integer cents (`amount_cents`); zero/negative amounts rejected.
- A recent-transactions list reflecting newly added entries.

## Acceptance criteria

- [ ] A user can add an income and an expense from a quick-add action
- [ ] Amount is stored as integer cents; entering a non-positive amount is rejected
- [ ] Date defaults to today; note is captured
- [ ] New transactions appear in a recent list
- [ ] All data access is behind `ITransactionRepository`; no data client in components
- [ ] Service-layer tests with an in-memory fake repository cover positive-amount validation and create/list behavior

## Blocked by

- 02 — Gated Onboarding
