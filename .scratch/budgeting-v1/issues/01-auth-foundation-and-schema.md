# Auth foundation + schema

Status: done
Type: HITL

## Parent

[Budgeting App — V1 PRD](../PRD.md)

## What to build

The end-to-end spine: a provisioned Supabase project with the full schema applied, and a working email/password auth loop that protects the app.

- Apply the schema from the PRD: `user_profiles`, `categories`, `transactions`, `report_snapshots`, all RLS policies, and the `handle_new_user` signup trigger.
- Seed the system categories **without Savings**: Housing, Food, Transport, Health, Entertainment, Uncategorized.
- Install and configure `supabase-js`; env config for project URL + anon key.
- Email/password signup, login, and logout via Supabase Auth.
- A client-side route guard that redirects unauthenticated users to login and lets authenticated users reach a (possibly empty) protected page.

HITL: a human must create the Supabase cloud project and provide the secret/env values; the rest is implementable by an agent.

Per [ADR 0001](../../../docs/adr/0001-client-side-swappable-repositories.md): RLS is defense-in-depth, not the frontend's source of truth.

## Acceptance criteria

- [ ] All four tables exist with RLS enabled and the PRD's policies applied
- [ ] Signup trigger auto-creates a blank `user_profiles` row
- [ ] Seeded system categories are present and do **not** include Savings
- [ ] A user can sign up, log in, and log out
- [ ] An unauthenticated user hitting a protected route is redirected to login
- [ ] An authenticated user can reach the protected shell

## Blocked by

None - can start immediately
