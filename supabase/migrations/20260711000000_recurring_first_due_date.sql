-- Recurring Expenses: replace anchor_day with first_due_date and add fortnightly.
-- Existing weekly/monthly rows are migrated to the nearest occurrence on or
-- after their creation date so historical templates keep a deterministic start.

alter table public.recurring_expenses
  drop constraint recurring_expenses_frequency_check,
  drop constraint recurring_expenses_anchor_day_per_frequency;

alter table public.recurring_expenses
  add column first_due_date date;

update public.recurring_expenses
set first_due_date =
  case
    when frequency = 'monthly' then
      make_date(
        extract(year from created_at)::int,
        extract(month from created_at)::int,
        anchor_day
      )
    else
      (
        (created_at::date)
        + (((anchor_day - extract(dow from created_at)::int + 7) % 7) || ' days')::interval
      )::date
  end;

update public.recurring_expenses
set first_due_date = first_due_date + interval '1 month'
where frequency = 'monthly'
  and first_due_date < created_at::date;

alter table public.recurring_expenses
  alter column first_due_date set not null,
  drop column anchor_day,
  add constraint recurring_expenses_frequency_check
    check (frequency in ('weekly', 'fortnightly', 'monthly')),
  add constraint recurring_expenses_monthly_first_due_date_day_check
    check (frequency <> 'monthly' or extract(day from first_due_date) between 1 and 28);
