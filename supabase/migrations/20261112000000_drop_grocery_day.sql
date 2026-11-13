-- Grocery day was collected in Onboarding and stored, but never read by any
-- screen, report or job. Retired ahead of the household work (docs/adr/0012).
alter table public.user_profiles drop column if exists grocery_day_of_week;
