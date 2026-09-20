-- Daily schedule that invokes the reconcile-recurring Edge Function, so Due
-- recurring transactions auto-post on their actual due date whether or not
-- anyone opens the app that day. See
-- supabase/functions/reconcile-recurring/index.ts and
-- docs/adr/0010-recurring-transactions-auto-posting.md.
--
-- The project URL and cron secret can't live in a versioned migration file
-- portably across local/staging/prod — provision them per environment via
-- Supabase Vault (recommended) or dashboard secrets, e.g.:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<a long random value>', 'reconcile_recurring_cron_secret');
-- and set the same secret value as the Edge Function's
-- RECONCILE_RECURRING_CRON_SECRET environment variable (`supabase secrets set`).
-- This repo has no prior vault usage, so this is a new pattern here — do this
-- setup once per environment before the schedule below can succeed.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'reconcile-recurring-transactions',
  '0 6 * * *', -- once daily, 06:00 UTC
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/reconcile-recurring',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reconcile_recurring_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
