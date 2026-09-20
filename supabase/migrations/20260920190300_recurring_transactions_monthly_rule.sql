-- Widen monthly recurrence: alongside the existing day-of-month anchor, support
-- an "nth weekday of month" rule (e.g. "last Friday") for things like paychecks
-- that don't land on a fixed day-of-month. Flat nullable columns, not jsonb —
-- matches this table's existing flat-column style and keeps due.ts doing plain
-- string/date arithmetic. See docs/adr/0010-recurring-transactions-auto-posting.md.
--
-- first_due_date is never validated here against the rule (would need brittle
-- SQL for the "last" case) — the service layer always derives first_due_date
-- from the rule for nth-weekday templates, so drift is structurally impossible
-- rather than merely checked (see RecurringService.create/update).

alter table public.recurring_transactions
  add column monthly_rule_type text check (monthly_rule_type in ('day-of-month', 'nth-weekday')),
  add column monthly_weekday int check (monthly_weekday between 0 and 6),
  add column monthly_nth int check (monthly_nth in (1, 2, 3, 4, -1));

-- Backfill every existing monthly row to the day-of-month rule it already
-- implicitly used.
update public.recurring_transactions
set monthly_rule_type = 'day-of-month'
where frequency = 'monthly';

alter table public.recurring_transactions
  add constraint recurring_transactions_monthly_rule_check check (
    (frequency <> 'monthly' and monthly_rule_type is null and monthly_weekday is null and monthly_nth is null)
    or (frequency = 'monthly' and monthly_rule_type = 'day-of-month' and monthly_weekday is null and monthly_nth is null)
    or (frequency = 'monthly' and monthly_rule_type = 'nth-weekday' and monthly_weekday is not null and monthly_nth is not null)
  );

-- The old day-of-month check applied unconditionally to every monthly row; it
-- must now be narrowed to only the day-of-month rule, since an nth-weekday
-- first_due_date can legitimately fall on day 29-31 (e.g. a "last Friday").
alter table public.recurring_transactions
  drop constraint recurring_transactions_monthly_first_due_date_day_check;
alter table public.recurring_transactions
  add constraint recurring_transactions_monthly_day_of_month_check check (
    frequency <> 'monthly'
    or monthly_rule_type <> 'day-of-month'
    or extract(day from first_due_date) between 1 and 28
  );
