-- Recurring Expenses — schema + data spine (issue 09)
-- See .scratch/budgeting-v1/issues/09-recurring-expenses-schema-and-data-layer.md
-- and docs/adr/0006-recurring-expenses-templates-and-data-retention.md
--
-- Recurring Expenses are first-class, expense-only templates (not a per-transaction
-- label). "Recurring" is derived from transactions.recurring_expense_id; the old
-- per-transaction is_recurring boolean is dropped. Occurrences hold ONLY resolved
-- rows (confirmed/skipped) — "Due" is computed on read, never pre-materialized.

-- ---------------------------------------------------------------------------
-- recurring_expenses (templates)
-- ---------------------------------------------------------------------------
-- Created before the transactions FK below so the reference resolves.
create table public.recurring_expenses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.user_profiles(id) on delete cascade,
  category_id    uuid not null references public.categories(id),
  name           text not null,
  amount_cents   int not null check (amount_cents > 0),
  frequency      text not null check (frequency in ('weekly', 'monthly')),
  -- One anchor column, interpreted by frequency: weekly = day-of-week 0..6,
  -- monthly = day-of-month 1..28 (mirrors budget_period_start_day's 1..28 clamp).
  anchor_day     int not null,
  active         bool not null default true,
  created_at     timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint recurring_expenses_anchor_day_per_frequency check (
    (frequency = 'weekly'  and anchor_day between 0 and 6) or
    (frequency = 'monthly' and anchor_day between 1 and 28)
  )
);

create index idx_recurring_expenses_user_active
  on public.recurring_expenses (user_id, active);

-- ---------------------------------------------------------------------------
-- recurring_expense_occurrences (resolved rows only: confirmed | skipped)
-- ---------------------------------------------------------------------------
create table public.recurring_expense_occurrences (
  id                   uuid primary key default gen_random_uuid(),
  recurring_expense_id uuid not null references public.recurring_expenses(id) on delete cascade,
  occurrence_date      date not null,
  status               text not null check (status in ('confirmed', 'skipped')),
  -- Set when confirmed (links to the created transaction); null for skipped.
  -- on delete set null so deleting the transaction never erases the resolution.
  transaction_id       uuid references public.transactions(id) on delete set null,
  created_at           timestamptz not null default now(),
  unique (recurring_expense_id, occurrence_date)
);

create index idx_recurring_occurrences_template
  on public.recurring_expense_occurrences (recurring_expense_id);

-- ---------------------------------------------------------------------------
-- transactions: drop is_recurring, add recurring_expense_id FK
-- ---------------------------------------------------------------------------
-- on delete set null: hard-deleting a template severs the link and PRESERVES the
-- transaction (confirmed history is real spending), per ADR 0006.
alter table public.transactions drop column is_recurring;
alter table public.transactions
  add column recurring_expense_id uuid
    references public.recurring_expenses(id) on delete set null;

create index idx_transactions_recurring_expense
  on public.transactions (recurring_expense_id);

-- ---------------------------------------------------------------------------
-- Row Level Security (mirrors transactions: owner-only via user_profiles)
-- ---------------------------------------------------------------------------
alter table public.recurring_expenses            enable row level security;
alter table public.recurring_expense_occurrences enable row level security;

create policy "users can manage own recurring expenses"
  on public.recurring_expenses for all
  using (user_id = (
    select id from public.user_profiles where auth_user_id = auth.uid()
  ));

-- Occurrences are scoped through their parent template's owner.
create policy "users can manage own recurring occurrences"
  on public.recurring_expense_occurrences for all
  using (recurring_expense_id in (
    select re.id
    from public.recurring_expenses re
    join public.user_profiles up on up.id = re.user_id
    where up.auth_user_id = auth.uid()
  ));
