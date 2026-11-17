# Households: shared ledgers with one admin and contributors

## Status

accepted — partly built.

- **Built:** the schema, authorization and membership functions (`supabase/migrations/20261112000100_households.sql`, tests in `supabase/tests/households.test.sql`); the households port and feature; the header switcher and "New group" dialog; household scoping of every ledger read and write (transactions, categories, recurring, reports) through `useLedger`; and, on the Settings page, a group's own settings and permission toggles (Admin), its member list with remove / hand over Admin / leave, and invite links. An invite link is `/join/<token>`: the page sits outside the signed-in layout so a signed-out visitor keeps the link — the token is parked in `localStorage` and the signed-in layout returns them to it after login or Onboarding. In a group, the Dashboard transaction list says who added each entry (`useEntryAuthors`: "You", a member's name — kept after they leave — or "Recurring" for auto-posted entries); a Personal household shows no author. The Recurring screen likewise says who set each template up, read from the template's `user_id` — so the contract migration must keep that column for recurring templates (rename it to `created_by` and stamp it from the token, as transactions already do) rather than drop it.
- **Not built yet:** dual entry, hiding edit / delete controls a Contributor's permissions rule out (the database refuses them either way), optimistic-concurrency on edits (the `version` column exists, adapters do not send it yet), realtime, editing a Personal household's time zone (and writing the browser zone onto backfilled ones), and the contract migration.

**Backend (decided 2026-11-12): households are built on Supabase.** The first-party backend is not being started now. Where this ADR was written with that backend in mind, read it as: authorization is Postgres RLS plus `security definer` functions, multi-step writes are RPC functions, and realtime is Supabase Realtime. The model, roles and rules are unchanged, and [ADR 0011](./0011-data-source-factory-and-error-contract.md)'s swap point still holds for a later move.

## Context

Every row today belongs to one person (`user_id` on `transactions`, `categories`, `recurring_transactions`; `profile.id` threads through every service, hook and query key). The next product step is collaboration: several people logging income and expenses into one shared ledger and seeing each other's entries, modelled on a messenger group — someone creates it, invites others, and an admin controls it.

Doing this on top of a single-owner model later would mean migrating every table, every port and every cache key, so the model is settled before the new backend is built. [ADR 0001](./0001-client-side-swappable-repositories.md) already requires the backend to derive identity from the token and never trust a client-supplied `userId`; households make that rule load-bearing.

## Decision

### Households

- A **household** (UI name: "group") is the unit that owns ledger data: transactions, categories, recurring templates and their occurrences, and reports.
- A user can belong to **many** households. Everyone gets a **personal household** (a household of one) at signup; shared households are created explicitly. Existing data migrates into each user's personal household and stays separate from any group they later join.
- The creator becomes the **admin**. Joining a household never moves or merges a user's existing data.
- One household is **active** in the UI at a time; every query key and port call is scoped by `householdId`. Switching households switches the active id, not the data model.
- The active id is a **per-device preference**, remembered per profile in `localStorage` (`#/shared/lib/active-household-storage`) — not in the zustand UI store, which must never hold per-user data (ADR 0007), and not in the URL. It grants nothing: it is only matched against the households the backend lists for the user, and falls back to the Personal household when it no longer matches.
- Ledger screens read the active household through one hook, **`useLedger`** (`#/shared/hooks/use-ledger`): the household id, the writer's profile id, the household's currency, Period start day, time zone, and "today" in that zone. Services take a `LedgerScope` (`{ householdId, profileId }`) for creates and a `householdId` for reads.

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

On Supabase: a Realtime `postgres_changes` subscription per active household, filtered by `household_id`, behind a port in `src/data/` so nothing above the data layer names Supabase. The client treats an event only as "this household's `<resource>` changed" and maps it to `invalidateQueries` through the query-key factory (ADR 0011), so no component changes and the payload is never trusted as data. Until that is built, `refetchOnWindowFocus` covers staleness.

A first-party backend would do the same with Server-Sent Events (one-way, reconnects by itself, plain HTTP), emitting `household.changed { householdId, resources }`; the client mapping is identical.

### Schema sketch

- `households` — id, name, `personal_owner_id` (set and unique for a Personal household, null for a group), currency, period_start_day, time_zone, four permission-toggle columns, created_by, created_at
- `household_members` — household_id, profile_id, role (`admin` | `contributor`), joined_at, left_at; partial unique indexes enforce one active membership per person and one active admin per household
- `household_invites` — id, household_id, token hash (the raw token is returned once and never stored), created_by, expires_at, used_at / used_by / revoked_at
- `transactions`, `categories`, `recurring_transactions` — gain `household_id`; transactions add `created_by`, `updated_by`, `updated_at`, `version`. Authorship and version are stamped by trigger, never taken from the client
- `grocery_day_of_week` is dropped (it was never read). Profile-level `currency`, `budget_period_start_day` and `monthly_budget_target` move to the household in the contract step below

**Expand, then contract.** The migration is additive: `user_id` stays on the ledger tables, a trigger files a row written without `household_id` under its owner's Personal household, and profile currency / Period start day are mirrored onto the Personal household. The current app therefore keeps working while adapters move to `household_id` one domain at a time. A later contract migration drops `user_id`, the two bridging triggers and the profile-level settings columns.

**Personal households** cannot be left, deleted or invited into. **Backfilled households have a null `time_zone`** (the creator's zone was never recorded): the client reads null as "device zone" and writes the browser's zone on the owner's next load; households created from now on must supply one.

### Authorization

The actor is always derived from the token; no function or policy accepts a caller-supplied user id. On Supabase this is enforced in the database:

- **RLS** on every ledger table: read and insert require active membership of the row's household; update and delete additionally require authorship, the Admin role, or the matching permission toggle. A row cannot be moved between households.
- **Functions** (`create_household`, `create_household_invite`, `preview_household_invite`, `accept_household_invite`, `revoke_household_invite`, `remove_household_member`, `transfer_household_admin`, `leave_household`, `household_people`) own every membership and invite change; those tables are read-only through the API. `household_people` is the only way to read another member's name and avatar — profiles stay otherwise private.
- Failures use SQLSTATEs that `toDataError` already maps: `42501` → `forbidden`, `23505` → `conflict`, `23514` → `invalid`.

Repository ports change from `userId` to `householdId`; the adapters still scope every query by `householdId` explicitly, with RLS as the guarantee rather than the only filter (ADR 0001). Cross-household access tests ("a member of A can never read or write B") are mandatory: `supabase/tests/households.test.sql` covers the database, and each household-scoped port gets the same at the service seam.

## Consequences

- Port signatures, query keys (`queryKeys.*` gain `householdId`), the profile hook, onboarding and settings all change; this is done once, in the new backend's contract, rather than retrofitted.
- Moving to the household model is a one-time data migration: create a personal household per user and backfill `household_id` / `created_by`.
- Because dual entry creates independent copies, the same spend can appear in two ledgers and the two can drift. Accepted for simplicity.
- A user-level period start day no longer exists, so a person in several households can see different Period boundaries per household. That is intended.
- Deferred: private entries, an edit-history/audit log, notifications, merging a personal ledger into a group, multi-currency households.
