-- Budgeting App — V1 initial schema
-- See .scratch/budgeting-v1/PRD.md and docs/adr/0001-client-side-swappable-repositories.md
-- Money is stored as integer cents. Savings is NOT a tracked category (derived from net cashflow).

-- Uses gen_random_uuid() (built into Postgres 13+), no extension required.

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
create table public.user_profiles (
  id                      uuid primary key default gen_random_uuid(),
  auth_user_id            uuid not null references auth.users(id) on delete cascade,
  display_name            text,
  currency                text not null default 'USD',
  grocery_day_of_week     int check (grocery_day_of_week between 0 and 6),
  monthly_budget_target   int not null default 0,
  budget_period_start_day int not null default 1 check (budget_period_start_day between 1 and 28),
  created_at              timestamptz not null default now(),
  unique (auth_user_id)
);

-- Auto-create a blank profile on signup. "Onboarded" is detected via display_name IS NULL.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (auth_user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.user_profiles(id) on delete cascade,
  name        text not null,
  color_hex   text not null default '#888780',
  icon        text,
  is_default  bool not null default false,
  is_system   bool not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- Seeded system categories (user_id null = visible to all). Savings intentionally omitted.
insert into public.categories (user_id, name, color_hex, icon, is_system) values
  (null, 'Housing',       '#378ADD', 'ti-home',          true),
  (null, 'Food',          '#639922', 'ti-shopping-cart', true),
  (null, 'Transport',     '#BA7517', 'ti-car',           true),
  (null, 'Health',        '#D4537E', 'ti-heart',         true),
  (null, 'Entertainment', '#7F77DD', 'ti-device-tv',     true),
  (null, 'Uncategorized', '#888780', 'ti-tag',           true);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.user_profiles(id) on delete cascade,
  category_id      uuid references public.categories(id) on delete set null,
  type             text not null check (type in ('income', 'expense')),
  amount_cents     int not null check (amount_cents > 0),
  note             text,
  transaction_date date not null default current_date,
  is_recurring     bool not null default false,
  created_at       timestamptz not null default now()
);

create index idx_transactions_user_date on public.transactions (user_id, transaction_date desc);
create index idx_transactions_category  on public.transactions (category_id);

-- ---------------------------------------------------------------------------
-- report_snapshots (numeric report cache; ai_summary unused in V1)
-- ---------------------------------------------------------------------------
create table public.report_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.user_profiles(id) on delete cascade,
  period_key           text not null,
  period_type          text not null check (period_type in ('monthly', 'weekly')),
  total_income_cents   int not null default 0,
  total_expenses_cents int not null default 0,
  category_breakdown   jsonb,
  ai_summary           text,
  generated_at         timestamptz not null default now(),
  unique (user_id, period_key, period_type)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.user_profiles    enable row level security;
alter table public.categories       enable row level security;
alter table public.transactions     enable row level security;
alter table public.report_snapshots enable row level security;

create policy "users can manage own profile"
  on public.user_profiles for all
  using (auth_user_id = auth.uid());

create policy "users can read system and own categories"
  on public.categories for select
  using (user_id is null or user_id = (
    select id from public.user_profiles where auth_user_id = auth.uid()
  ));

create policy "users can insert own categories"
  on public.categories for insert
  with check (user_id = (
    select id from public.user_profiles where auth_user_id = auth.uid()
  ));

create policy "users can update own categories"
  on public.categories for update
  using (user_id = (
    select id from public.user_profiles where auth_user_id = auth.uid()
  ));

create policy "users can delete own non-system categories"
  on public.categories for delete
  using (
    is_system = false and
    user_id = (
      select id from public.user_profiles where auth_user_id = auth.uid()
    )
  );

create policy "users can manage own transactions"
  on public.transactions for all
  using (user_id = (
    select id from public.user_profiles where auth_user_id = auth.uid()
  ));

create policy "users can manage own reports"
  on public.report_snapshots for all
  using (user_id = (
    select id from public.user_profiles where auth_user_id = auth.uid()
  ));
