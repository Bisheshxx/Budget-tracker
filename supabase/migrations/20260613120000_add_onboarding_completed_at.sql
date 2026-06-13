-- Forward migration for environments where the init migration (20260611032503)
-- was already applied BEFORE onboarding_completed_at was added to it. Supabase
-- replays migrations by version number, so the edited init never re-runs on the
-- remote — this adds the column there. Idempotent (`if not exists`) so a fresh
-- `db reset`, which runs the edited init first, treats this as a harmless no-op.
--
-- "Onboarded" is detected via onboarding_completed_at IS NOT NULL (stamped when
-- Onboarding completes); see src/features/profile/profile-service.ts.

alter table public.user_profiles
  add column if not exists onboarding_completed_at timestamptz;
