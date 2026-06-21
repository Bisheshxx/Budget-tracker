# Settings

Status: done
Type: AFK

## Parent

[Budgeting App — V1 PRD](../PRD.md)

## What to build

A Settings screen to edit profile fields after Onboarding, reusing the profile repository/service.

- Edit currency, Period start day, grocery day, display name, and Budget Target.
- Changes are reflected wherever they're used (currency display, Period boundaries, soft target).

## Acceptance criteria

- [ ] A user can update any profile field and see it persisted
- [ ] Changing currency updates displayed amounts app-wide
- [ ] Changing Period start day shifts the current-Period boundaries
- [ ] Budget Target edits are reflected as the soft reference on the Dashboard
- [ ] Profile writes go through the repository interface
- [ ] Service-layer tests with a fake repository cover profile update

## Blocked by

- 02 — Gated Onboarding
