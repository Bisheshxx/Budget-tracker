-- A transaction auto-posted by a Recurring Transaction always carries a note:
-- when it is inserted linked to a template with no note of its own, default the
-- note to the template's name. Enforced in the database so every writer (the
-- app's reconcileDue, the reconcile-recurring Edge Function / cron) keeps notes
-- regardless of which version of that code is deployed. Existing rows are
-- untouched.

create or replace function public.default_recurring_transaction_note()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.recurring_transaction_id is not null
     and (new.note is null or btrim(new.note) = '') then
    select rt.name into new.note
    from public.recurring_transactions rt
    where rt.id = new.recurring_transaction_id;
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_default_recurring_note on public.transactions;
create trigger transactions_default_recurring_note
  before insert on public.transactions
  for each row execute function public.default_recurring_transaction_note();
