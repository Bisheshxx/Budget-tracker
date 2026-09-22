-- Make it structurally impossible to auto-post the same recurring occurrence
-- twice. `recurring_transaction_id` is null for ordinary (non-recurring)
-- transactions, and Postgres unique constraints treat null as never equal to
-- another null, so this only constrains auto-posted rows — manual
-- transactions on the same date are unaffected.
--
-- Without this, reconcileDue's application-level "create then check who won"
-- dance (recording confirmed on the occurrence, deleting the losing
-- transaction if beaten to it) leaves an orphaned duplicate transaction
-- whenever two reconcile calls both pass the "not yet resolved" check before
-- either writes — see RecurringService.reconcileDue.
alter table public.transactions
  add constraint transactions_recurring_transaction_id_transaction_date_key
  unique (recurring_transaction_id, transaction_date);
