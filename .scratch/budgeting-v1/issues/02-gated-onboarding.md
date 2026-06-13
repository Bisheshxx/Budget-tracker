# Gated Onboarding

Status: ready-for-agent
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md)

## What to build

A one-screen Onboarding gate shown after first signup, before the Dashboard is reachable.

- Required fields: currency + Period start day (`budget_period_start_day`, 1–28). Optional: display name, grocery day, Budget Target.
- "Onboarded" is detected via `user_profiles.display_name IS NULL` (the signup trigger leaves it null; completing Onboarding sets it).
- Routing rules: unauthenticated → login; authenticated but not onboarded → Onboarding; onboarded → app. An onboarded user cannot re-enter Onboarding.
- Establishes the profile data path end-to-end (profile repository + service behind interfaces, per ADR 0001).

## Acceptance criteria

- [ ] A brand-new user is routed to Onboarding immediately after first signup
- [ ] Currency and Period start day are required; saving is blocked without them
- [ ] Optional fields can be skipped and saved later
- [ ] Completing Onboarding sets `display_name` and routes to the Dashboard
- [ ] An already-onboarded user is redirected away from Onboarding
- [ ] Profile read/write goes through a repository interface (no direct data client in components)

## Blocked by

- 01 — Auth foundation + schema
