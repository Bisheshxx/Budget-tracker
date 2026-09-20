-- Rename recurring_expenses -> recurring_transactions (and the occurrences
-- table/columns that reference it). Pure rename, no behavior change. Recurring
-- templates are about to gain a `kind` (expense|income), so "Expense" no longer
-- fits the vocabulary — see docs/adr/0010-recurring-transactions-auto-posting.md.

alter table public.recurring_expenses rename to recurring_transactions;
alter table public.recurring_expense_occurrences rename to recurring_transaction_occurrences;
alter table public.recurring_transaction_occurrences
  rename column recurring_expense_id to recurring_transaction_id;
alter table public.transactions
  rename column recurring_expense_id to recurring_transaction_id;

-- Postgres does not propagate a table/column rename into constraint or index
-- names that embedded the old name, so rename those explicitly. Names below are
-- Postgres's default auto-generated names for the unnamed constraints/indexes
-- declared in 20260622164356_recurring_expenses.sql and
-- 20260711000000_recurring_first_due_date.sql.
alter index idx_recurring_expenses_user_active
  rename to idx_recurring_transactions_user_active;
alter index idx_recurring_occurrences_template
  rename to idx_recurring_transaction_occurrences_template;
alter index idx_transactions_recurring_expense
  rename to idx_transactions_recurring_transaction;

alter table public.recurring_transactions
  rename constraint recurring_expenses_pkey to recurring_transactions_pkey;
alter table public.recurring_transactions
  rename constraint recurring_expenses_user_id_fkey to recurring_transactions_user_id_fkey;
alter table public.recurring_transactions
  rename constraint recurring_expenses_category_id_fkey to recurring_transactions_category_id_fkey;
alter table public.recurring_transactions
  rename constraint recurring_expenses_frequency_check to recurring_transactions_frequency_check;
alter table public.recurring_transactions
  rename constraint recurring_expenses_monthly_first_due_date_day_check
    to recurring_transactions_monthly_first_due_date_day_check;

alter table public.recurring_transaction_occurrences
  rename constraint recurring_expense_occurrences_pkey to recurring_transaction_occurrences_pkey;
alter table public.recurring_transaction_occurrences
  rename constraint recurring_expense_occurrences_recurring_expense_id_fkey
    to recurring_transaction_occurrences_recurring_transaction_id_fkey;
alter table public.recurring_transaction_occurrences
  rename constraint recurring_expense_occurrences_transaction_id_fkey
    to recurring_transaction_occurrences_transaction_id_fkey;
alter table public.recurring_transaction_occurrences
  rename constraint recurring_expense_occurrences_recurring_expense_id_occurren_key
    to recurring_transaction_occurrences_template_date_key;

alter table public.transactions
  rename constraint transactions_recurring_expense_id_fkey
    to transactions_recurring_transaction_id_fkey;

-- RLS: drop + recreate under new names, rewriting the occurrences policy body to
-- reference the renamed column. Both stay `for all using (...)` with no explicit
-- `with check` — Postgres reuses `using` for `with check` on `for all` policies,
-- which is correct here (read/write scoped identically), not an oversight.
drop policy "users can manage own recurring expenses" on public.recurring_transactions;
create policy "users can manage own recurring transactions"
  on public.recurring_transactions for all
  using (user_id = (
    select id from public.user_profiles where auth_user_id = auth.uid()
  ));

drop policy "users can manage own recurring occurrences" on public.recurring_transaction_occurrences;
create policy "users can manage own recurring transaction occurrences"
  on public.recurring_transaction_occurrences for all
  using (recurring_transaction_id in (
    select rt.id
    from public.recurring_transactions rt
    join public.user_profiles up on up.id = rt.user_id
    where up.auth_user_id = auth.uid()
  ));
