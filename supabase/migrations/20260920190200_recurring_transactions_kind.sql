-- Recurring templates can now post income as well as expense transactions
-- (paychecks, etc). `kind` mirrors transactions.type's shape. Every existing
-- row predates this concept and was expense-only by construction, so the
-- default needs no separate backfill statement.

alter table public.recurring_transactions
  add column kind text not null default 'expense' check (kind in ('expense', 'income'));
