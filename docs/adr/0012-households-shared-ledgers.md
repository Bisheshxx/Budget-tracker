# Households: shared ledgers with one admin and contributors

## Status

proposed — design agreed; the schema, API and frontend changes below are not built yet. The backend language/framework is still to be confirmed (TypeScript + Fastify recommended); nothing here depends on it except the realtime transport detail.

## Context

Every row today belongs to one person (`user_id` on `transactions`, `categories`, `recurring_transactions`; `profile.id` threads through every service, hook and query key). The next product step is collaboration: several people logging income and expenses into one shared ledger and seeing each other's entries, modelled on a messenger group — someone creates it, invites others, and an admin controls it.

Doing this on top of a single-owner model later would mean migrating every table, every port and every cache key, so the model is settled before the new backend is built. [ADR 0001](./0001-client-side-swappable-repositories.md) already requires the backend to derive identity from the token and never trust a client-supplied `userId`; households make that rule load-bearing.

## Decision

### Households

- A **household** (UI name: "group") is the unit that owns ledger data: transactions, categories, recurring templates and their occurrences, and reports.
- A user can belong to **many** households. Everyone gets a **personal household** (a household of one) at signup; shared households are created explicitly. Existing data migrates into each user's personal household and stays separate from any group they later join.
- The creator becomes the **admin**. Joining a household never moves or merges a user's existing data.
- One household is **active** in the UI at a time; every query key and port call is scoped by `householdId`. Switching households switches the active id (route/store), not the data model.

### Dual entry (add once, post to several ledgers)

When adding a transaction the user chooses the target ledgers (their personal household and/or any group they belong to). One request creates **one independent row per target**. The copies are not linked or synced afterwards — editing one does not change the others. This is deliberately simple; a link column can be added later if sync is wanted.

### Household settings

Currency, period start day and time zone are **household settings**, independent of the user's own preferences (display name and avatar stay per user). Onboarding splits: creating a household collects its settings; accepting an invite skips them.

**Time zone:** each household stores one IANA zone (e.g. `Pacific/Auckland`), defaulted from the creator's browser. Transaction dates stay plain calendar dates (`YYYY-MM-DD`), timestamps are stored in UTC, and the zone is used only to decide what "today" is — so the current Period is the same for every member and for the server-side recurring job. Today's `todayYmd()` (browser-local) is replaced by "today in the household's zone".

### Roles and permissions

- Exactly **one admin** per household; the rest are **contributors**. Admin is transferable to any member.
- Contributors can add and edit entries. Admin-only, always: rename/delete the household, change household settings, remove members, transfer admin, change the permission toggles below.
- Messenger-style **permission toggles**, set by the admin in group settings and stored on the household. Proposed defaults:

  | Toggle                                  | Default |
  | --------------------------------------- | ------- |
  | Contributors can edit others' entries   | on      |
  | Contributors can delete others' entries | off     |
  | Contributors can manage categories      | on      |
  | Contributors can invite                 | off     |

- **Admin leaves:** admin transfers automatically to the longest-standing remaining member (earliest `joined_at`). If nobody remains, the household is deleted after an explicit confirmation.

### Invites

Single-use, token-based link, **expires after 7 days**, revocable by the admin (and by the inviter). Accepting requires being signed in.

### Attribution and removal

- Every transaction stores `created_by` and `updated_by` (member ids) plus `updated_at`; the UI shows the author's name. Names are resolved at read time from the profile, never copied into the row.
- Removing a member or a member leaving **keeps their entries**. Membership is soft-ended (`left_at`), `created_by` is never cascade-deleted, and the UI shows the person's name (or "Former member").
- Auto-posted recurring entries have no author (`created_by` null, `recurring_transaction_id` set) and display as "Recurring".

### Categories, visibility, concurrency

- Custom categories belong to the household; system categories stay global. Deleting a category still sets its transactions to Uncategorized.
- Everything in a household is visible to every member. A per-entry "private" flag is deferred.
- Edits use optimistic concurrency: updates carry the row's `version`/`updated_at`; a mismatch returns `conflict` (`DataError` code, HTTP 409) instead of silently overwriting.
- A **per-member breakdown** in reports is a planned nice-to-have; `created_by` makes it a grouping, not a migration.

### Realtime

Server-Sent Events, not WebSockets: updates are one-way (server → client), SSE reconnects by itself and rides plain HTTP. The server emits `household.changed { householdId, resources }` after a write; the client maps that to `invalidateQueries` through the query-key factory (ADR 0011), so no component changes. A single server instance can use an in-process event bus; multiple instances need Postgres `LISTEN/NOTIFY` or Redis pub/sub. Until the backend exists, `refetchOnWindowFocus` covers staleness.

### Schema sketch

- `households` — id, name, currency, period_start_day, time_zone, permission toggles (columns or jsonb), created_at
- `household_members` — household_id, profile_id, role (`admin` | `contributor`), joined_at, left_at; a partial unique index enforces one active admin per household
- `household_invites` — id, household_id, token hash, created_by, expires_at, used_at / revoked_at
- `transactions`, `categories`, `recurring_transactions` — `user_id` → `household_id`; transactions add `created_by`, `updated_by`, `updated_at`, `version`
- Profile-level `currency`, `budget_period_start_day`, `monthly_budget_target` and `grocery_day_of_week` move to / are retired from the household

### Authorization

The API derives the actor from the token and checks, on every call, membership of the target household and the relevant permission. Methods addressed by id only (`update`, `delete`, `deactivate`, …) additionally confirm the row's household equals the caller's — today they lean on RLS. Repository ports change from `userId` to `householdId` plus the request's actor. Cross-household access tests ("a member of A can never read or write B") are mandatory and run against every port.

## Consequences

- Port signatures, query keys (`queryKeys.*` gain `householdId`), the profile hook, onboarding and settings all change; this is done once, in the new backend's contract, rather than retrofitted.
- Moving to the household model is a one-time data migration: create a personal household per user and backfill `household_id` / `created_by`.
- Because dual entry creates independent copies, the same spend can appear in two ledgers and the two can drift. Accepted for simplicity.
- A user-level period start day no longer exists, so a person in several households can see different Period boundaries per household. That is intended.
- Deferred: private entries, an edit-history/audit log, notifications, merging a personal ledger into a group, multi-currency households.
