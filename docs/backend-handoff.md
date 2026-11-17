# Backend handoff: the .NET API for Budget Tracker

Written 2026-11-17 for whoever (human or Claude Code session) builds the first-party backend in the sibling folder `Budget-tracker-api/`. This file lives in the **frontend** repo on purpose: it describes the frontend's contract and should change in the same commit as the ports it describes. The backend's `CLAUDE.md` should link here, not copy it.

**Source of truth, in order:** the port interfaces in `src/data/**/I*Repository.ts` and the domain types they import → `docs/adr/0011` (swap point, `DataError`) → `docs/adr/0012` (households) → `docs/adr/0010` (recurring auto-posting) → `CONTEXT.md` (vocabulary) → `supabase/migrations/` (the schema and rules the backend must reproduce). If this file disagrees with those, they win; fix this file.

## 1. What we are building

The app is a personal-finance web app: log income and expenses into a **ledger**, see Cashflow for a **Period**, compare Periods, auto-post **Recurring Transactions**, and share a ledger with others as a **Household** (UI: "group"). Today the data layer is Supabase (Postgres + RLS + RPC functions + an Edge Function on a daily cron). The frontend was built so the backend is replaceable in **one place**:

- `src/data/IDataSource.ts` is the whole backend as the app sees it: seven repositories (`auth`, `categories`, `households`, `profile`, `recurring`, `reports`, `transactions`).
- `src/data/index.ts` is the only swap point. To add a backend: implement the ports, add `createApiDataSource()` beside `createSupabaseDataSource()`, change that one file. **Nothing outside `src/data/` changes.**

So the backend's job is to expose an HTTP API that a thin `Api<X>Repository` class in the frontend can call to satisfy those ports. The frontend adapter is a separate task from the backend; do the API first, with an OpenAPI spec, then write the adapter against the spec.

## 2. Non-negotiable rules

1. **Identity comes from the token, never from the request.** Several ports currently accept `userId`/`profileId` (e.g. `TransactionCreate.userId`, `CategoryCreate.userId`). The API must ignore those for authorization and derive the actor from the bearer token. Do not design endpoints that accept a caller-supplied user id.
2. **Authorization is by Household membership.** Read/insert require active membership of the row's household; update/delete additionally require authorship, Admin, or the matching permission toggle (§5). Scope every query by `householdId` explicitly *and* enforce it in one central place (authorization policy/handler), not per endpoint.
3. **Money is integer cents** (`amountCents`). Never floats, never decimals on the wire.
4. **Dates are plain `YYYY-MM-DD` strings** (transaction dates, Period boundaries, occurrence dates). **Moments are UTC ISO-8601.** "Today" is decided by the **Household's IANA time zone**, never the server's clock zone. A Household's `timeZone` can be null for old Personal households; the client reads null as "device zone".
5. **Errors map to `DataError` codes.** The frontend only understands these (`src/data/data-error.ts`); the API must return enough for the adapter to produce exactly one of them:

   | `DataError.code` | HTTP | When |
   | --- | --- | --- |
   | `invalid` | 400 / 422 | validation failed |
   | `unauthenticated` | 401 | missing/expired token |
   | `forbidden` | 403 | not a member / not allowed by role or toggle |
   | `not-found` | 404 | no such row (or not visible to the caller) |
   | `conflict` | 409 | unique violation, or stale `version` on update |
   | `rate-limited` | 429 | |
   | `unknown` | 5xx | |

   Use RFC 9457 `application/problem+json` with a stable machine-readable `code` and a human `detail`. **User-facing copy is passed through unchanged** from the message, so write `detail` as a sentence a user can read.
6. **Cross-household isolation tests are mandatory**: "a member of A can never read or write B". Every household-scoped endpoint gets one.
7. **Removing a member never deletes their entries.** Membership is soft-ended (`left_at`); `created_by` is never cascade-deleted.

## 3. The contract: ports → endpoints

Every method below is a port method the API must make possible. Names and shapes are from the TypeScript; the REST paths are a **suggestion** — the backend owns the final design, but keep one operation per port method unless noted.

### 3.1 Auth (`IAuthRepository`) — decided: ASP.NET Core Identity
`signUp`, `signIn`, `signInWithOAuth('google', redirectTo)`, `signOut`, `getSession`, `onAuthStateChange`. See §11 for the full design; the short version:
- **ASP.NET Core Identity** (`Microsoft.AspNetCore.Identity.EntityFrameworkCore`) on EF Core + Npgsql owns users, password hashing, lockout and the Google external login. `IdentityUser<Guid>` as the user type.
- The API issues its own **short-lived JWT access token + rotating refresh token** and validates them with standard `JwtBearer`. (Chosen over cookies because the native app is planned; over `MapIdentityApi`'s opaque tokens because they are not standard JWTs and are awkward for a second client.)
- `AuthSession` on the client stays `{ user: { id, email } }`. Registration must create the **profile and the Personal household atomically** (replaces the `handle_new_user` DB trigger).

### 3.2 Profile (`IProfileRepository`)
`getByAuthUserId(authUserId) → UserProfile | null`, `update(authUserId, patch) → UserProfile`.
`UserProfile`: `id, authUserId, displayName, email, avatarUrl, currency, budgetPeriodStartDay, monthlyBudgetTargetCents, onboardingCompletedAt`. "Onboarded" = `onboardingCompletedAt` is non-null. Today profile currency / Period start day are mirrored onto the Personal household (expand phase of ADR 0012); the target state is that those live on the Household only.

### 3.3 Households (`IHouseholdRepository`)
| Method | Notes |
| --- | --- |
| `listForProfile → Household[]` | only households the caller is an **active** member of, with the caller's `role` and the `permissions` |
| `create(NewHousehold) → id` | caller becomes Admin. Personal households are created only at signup |
| `updateSettings(householdId, HouseholdSettings)` | Admin only: name, currency, `periodStartDay` (1–28), `timeZone`, four permission toggles |
| `listPeople → HouseholdMember[]` | current **and former** members (`leftAt`); the only way to read another member's name/avatar |
| `removeMember`, `transferAdmin` | Admin only |
| `leave(householdId, deleteIfLast)` | Admin leaving auto-transfers to the longest-standing member (earliest `joinedAt`); last member leaving deletes the household and its entries (client confirms first). **Personal households cannot be left, deleted or invited into** |
| `listPendingInvites`, `createInvite → { id, token, expiresAt }`, `revokeInvite` | token returned **once**, only its hash is stored. Single-use, expires in 7 days, revocable by Admin and the inviter. Creating requires Admin or the "contributors can invite" toggle |
| `previewInvite(token) → InvitePreview` | `{ householdId, householdName, invitedBy, expiresAt }`; callable before accepting |
| `acceptInvite(token) → householdId` | must be signed in |

Exactly **one active Admin** per household and **one active membership per person per household** — enforce with unique constraints, not just code.

### 3.4 Categories (`ICategoryRepository`)
`listAvailable(householdId) → Category[]` (system categories + that household's custom ones), `listAvailablePage(householdId, { limit, cursor? { createdAt, id } })` (keyset, `createdAt`/`id`), `create`, `update`, `delete`.
System categories (`isSystem`, no owner) are global and read-only. Deleting a custom category sets its transactions' `categoryId` to null (**Uncategorized**). Creating/editing/deleting requires Admin or the "contributors can manage categories" toggle. Each category has `colorHex` and a lucide `icon` name.

### 3.5 Transactions (`ITransactionRepository`)
| Method | Notes |
| --- | --- |
| `listPage(householdId, { from?, to?, limit, cursor? { transactionDate, id } })` | keyset, **`(transactionDate, id)` descending**; `[from, to)` half-open window on `transactionDate` |
| `listInRange(householdId, startInclusive, endExclusive)` | ascending; feeds Cashflow summaries |
| `create(TransactionCreate)` | `householdId, categoryId|null, type, amountCents, note, transactionDate, recurringTransactionId?` |
| `createForRecurringOccurrence(TransactionCreate)` | **idempotent, first-writer-wins** on `(recurringTransactionId, transactionDate)`: a losing concurrent call must receive the winning row, not an error or a duplicate |
| `update(id, TransactionUpdate)` | `categoryId, type, amountCents, note, transactionDate`. Optimistic concurrency: send/compare `version`; mismatch → **409 `conflict`** |
| `delete(id)` | |

`Transaction` returned: `id, userId, categoryId, type ('income'|'expense'), amountCents, note, transactionDate, createdAt, createdBy, recurringOwnerId`. `createdBy` is null for auto-posted rows; `recurringOwnerId` is the owning template's creator (null otherwise). **`createdBy`, `updatedBy`, `updatedAt`, `version` are stamped server-side, never taken from the client.** The server must not let a row move between households.

**Note rule (recent fix):** a transaction linked to a recurring template and saved without a note defaults its note to the **template's name**. The Supabase side enforces this with a before-insert trigger (`20261117000000_recurring_posts_keep_note.sql`); the API must do the same for every writer.

**Dual entry** (planned, not built): one request creating one independent row per target household. Design the create endpoint so adding `householdIds[]` later is not a breaking change.

### 3.6 Recurring (`IRecurringTransactionRepository`)
Templates: `listActive`, `listAll`, `create`, `update`, `deactivate`, `delete`, `hasConfirmedHistory`.
Occurrences: `listOccurrencesInRange(ids, start, endExclusive)`, `recordConfirmed(templateId, occurrenceDate, transactionId)`, `recordSkipped(templateId, occurrenceDate)`, `listRecentlyConfirmed(householdId, since) → { occurrence, recurringTransaction, transaction }[]`.

Rules (ADR 0010, `src/features/recurring/due.ts`):
- Template: `kind ('expense'|'income')`, `frequency ('weekly'|'fortnightly'|'monthly')`, `monthlyRule` (`day-of-month 1–28` **or** `nth-weekday { weekday 0–6, nth 1|2|3|4|-1 }`; non-null iff monthly), `firstDueDate`, `active`, `deactivatedAt`. **Category is required** for templates.
- For nth-weekday templates `firstDueDate` is **derived by the server** (anchor on the current month, roll to next if past) — never trusted from the client.
- Templates are **deactivated, not deleted**, once they have history; payment history is retained. Deleting is only allowed per `hasConfirmedHistory`.
- Occurrences are stored only once resolved (`confirmed` with a `transactionId`, or `skipped`); **Due is computed, never stored**. `(recurringTransactionId, occurrenceDate)` is unique.
- **Auto-posting.** Today the client runs `reconcileDue` on dashboard load *and* a daily cron calls an Edge Function. ADR 0011 recommends the backend offer **one transactional `reconcile` operation** (create the transaction + record the occurrence atomically, idempotent) plus a **scheduled job** (use a hosted background service/Hangfire/Quartz — one row per household per due date, in the **household's time zone**). The port can grow a `reconcileDue` method when this lands; flag it back to the frontend repo.
- Deleting a template is currently two non-atomic calls in the Supabase adapter; make it one transactional operation.
- **How to build all of this in .NET: see §10.**

### 3.7 Reports (`IReportRepository`)
`getPeriodReport(householdId, current: PeriodRange, previous: PeriodRange) → PeriodReport`.
`PeriodRange` is `{ start, end }` (half-open date strings). Returns `comparison` (income/expenses/net deltas: `currentCents, previousCents, deltaCents, deltaPercent|null`; plus `byCategory` deltas, largest absolute change first), `weeks[]` (`weekStart, weekEnd, incomeCents, expensesCents`), and `currentByCategory`. **Expenses only** feed spend-by-category. `deltaPercent` is null when the previous value is 0. The exact math lives in `src/shared/services/report-compute.util.ts` (`rollup`, comparison) — port it faithfully and add tests with the same fixtures (`tests/`), so the dashboard and reports never disagree.

## 4. Realtime (not built yet, design for it)
ADR 0012: a per-household change stream the client maps to `invalidateQueries`. For the first-party backend use **Server-Sent Events** emitting `household.changed { householdId, resources: ('transactions'|'categories'|'recurring'|'members'|…)[] }`. The payload is only a hint; the client never trusts it as data. Authorize the stream by active membership. Until built, the client relies on refetch-on-focus (known staleness: another member's browser does not see your new entry until it refocuses).

## 5. Roles & permission toggles
One **Admin** (transferable), the rest **Contributors**. Admin-only, always: rename/delete the household, change settings, remove members, transfer Admin, change the toggles. Contributors can always add entries and edit/delete **their own**. Toggles (defaults): edit others' entries **on**, delete others' entries **off**, manage categories **on**, invite **off**. The Admin can always do everything.

## 6. Data model to reproduce
Authoritative DDL: `supabase/migrations/*.sql` (start with `20260611032503_init_schema.sql` → `20261112000100_households.sql` → `20261117000000_recurring_posts_keep_note.sql`) and the RLS tests in `supabase/tests/households.test.sql` — port those tests as the backend's authorization tests. Tables: `user_profiles`, `households`, `household_members`, `household_invites`, `categories`, `transactions`, `recurring_transactions`, `recurring_transaction_occurrences`. Key constraints to carry over: unique `(recurring_transaction_id, transaction_date)` on transactions; unique `(recurring_transaction_id, occurrence_date)` on occurrences; partial unique indexes for one active Admin and one active membership; `periodStartDay` 1–28.

Note: **the existing data is in Supabase Postgres.** Decide whether the .NET API takes over that same database (simplest; EF Core against the existing schema, scaffolded not migrated) or a new one with a data migration. See §8.

## 7. Suggested approach
1. Read the ports and ADRs above; produce the **port→endpoint table** as the backend's first doc and agree it before coding.
2. Choose the architecture (vertical slice fits: one slice per port/domain) and set up the solution, test project, and CI. The `dotnet-claude-kit` skills in this environment (`architecture-advisor`, `vertical-slice`, `minimal-api`, `ef-core`, `authentication`, `openapi`, `testing`) apply.
3. Build in this order: auth + profile + households (everything depends on membership) → categories → transactions → recurring (+ scheduler) → reports → realtime.
4. Publish OpenAPI from day one; generate the frontend's types/client from it rather than hand-copying.
5. Cross-household isolation tests and the `DataError` status mapping are part of "done" for every endpoint.

## 8. Decisions

**Decided**
- **Backend:** .NET, in a sibling repo `Budget-tracker-api/`.
- **Auth:** ASP.NET Core Identity + EF Core (§11). *This supersedes the earlier suggestion to keep Supabase Auth.*
- **Recurring auto-posting:** server-owned (§10). The client never triggers it.

**Still open**
- **Database:** Identity needs its tables in a database the API controls, and Supabase's `auth` schema goes away. Either (a) the API uses the **same Postgres instance** (keep the `public` schema, add the Identity tables, import `auth.users` into them), or (b) a **new Postgres** with a one-time data migration of everything. (a) is less work; (b) is cleaner and decouples you from Supabase entirely. Decide before the first migration.
- **Hosting and scheduler:** where the API runs; `BackgroundService` to start (§10.5).
- **ADR 0012:** says households run on Supabase with the first-party backend deferred. Update its Status and add a new ADR for "first-party .NET backend with ASP.NET Core Identity" once the Database decision above is made.

## 9. What the frontend needs from you afterwards
A `createApiDataSource()` in `src/data/` with `Api<X>Repository` classes implementing the ports and **throwing `DataError` only**, adapter tests in `tests/data/<feature>/` asserting the `DataError` code on each failure, and a one-line change in `src/data/index.ts`. Do not edit services, hooks, components, or routes for the swap — if you feel you must, the port is wrong; change the port and this document together.

## 10. Recurring in .NET: design

Recurring is the one area with real server-side logic and a background job, so it gets its own design. The frontend today does the work in three places that must collapse into one server implementation: the pure Due math (`src/features/recurring/due.ts`), the orchestration (`RecurringService.reconcileDue`, `skip`, `skipUpcoming`), and the daily Edge Function (`supabase/functions/reconcile-recurring/index.ts`).

### 10.1 Pieces

| Piece | What it is | Ported from |
| --- | --- | --- |
| `RecurrenceCalculator` | **Pure static class**, no I/O. Occurrence dates for a template in a window; next occurrence on/after a date; nth-weekday-of-month | `due.ts`, `nthWeekdayOfMonth` in `#/shared/lib/period` |
| `DueCalculator` | Pure: active templates + resolved occurrences + `today` → sorted Due list (date, then name) | `computeDue` |
| `ReconcileService.ReconcileHouseholdAsync` | Loads templates, computes Due, posts each one idempotently, in one DB transaction per occurrence | `RecurringService.reconcileDue` |
| `POST /households/{id}/recurring/reconcile` | **Not called by the app.** Idempotent repair/test endpoint (membership required). Posting is owned by the server: the worker, plus an inline reconcile of that household whenever a template is created or edited | |
| `RecurringReconcileWorker` | `BackgroundService` that runs reconcile for every household on a schedule | the daily cron + Edge Function |
| `UndoOccurrence`, `SkipUpcoming`, `DeleteTemplate` | Each **one transaction** | `skip`, `skipUpcoming`, `delete` |

Use `DateOnly` everywhere for dates (it maps to Postgres `date`, has no time zone, and avoids DST bugs). `DayOfWeek` in .NET is Sunday = 0, matching the frontend's `weekday` 0 = Sunday, so no translation is needed. `nth = -1` means "last".

### 10.2 The Due rules to reproduce exactly
- A template is Due for date `d` when it is **active**, `d >= max(firstDueDate, windowStart)`, `d <= today` (in the household's zone), and there is no resolved occurrence for `(templateId, d)`.
- **Weekly/fortnightly:** every 7/14 days from `firstDueDate`.
- **Monthly:** day-of-month (1–28, so no month-length edge cases) or nth weekday (`nth` 1–4 or -1 = last). A monthly template with a missing rule falls back to the day of `firstDueDate` (defensive, mirror it).
- **Catch-up is unbounded:** reconcile looks from the *earliest* `firstDueDate` to today, not just the current Period. A template with an old `firstDueDate` posts **every** missed occurrence the first time reconcile runs. That is current behaviour; keep it, but log the count.
- Deactivated templates stop posting immediately; their history stays.
- **Port `tests/features/recurring/due.test.ts` first**, case for case, as xUnit theories. It is the spec.

### 10.3 Posting one occurrence (idempotent, concurrency-safe)
Two callers can race (a client opening the dashboard while the worker runs; two tabs; two API instances). Correctness rests on two **unique constraints**, not on locks:
`transactions (recurring_transaction_id, transaction_date)` and `recurring_transaction_occurrences (recurring_transaction_id, occurrence_date)`.

Per Due item, in one transaction:
1. `INSERT INTO transactions (...) VALUES (...) ON CONFLICT (recurring_transaction_id, transaction_date) DO NOTHING RETURNING id`. If nothing returned, `SELECT id` of the existing row. The loser must receive the winner's row, never an error and never a duplicate.
2. `INSERT INTO recurring_transaction_occurrences (...) VALUES (templateId, date, 'confirmed', txId) ON CONFLICT (recurring_transaction_id, occurrence_date) DO NOTHING`, then read the row back.

EF Core has no upsert, so use **raw SQL** (`ExecuteSqlInterpolatedAsync` / `SqlQuery`) for these two statements, or catch Npgsql's `PostgresException` with SqlState `23505` and re-read. Prefer raw `ON CONFLICT`.

The posted transaction: `type` = template `kind`, `amountCents` and `categoryId` from the template, `transactionDate` = the occurrence date, `householdId` = the template's household, **`created_by` = null** (that is what renders as "Recurring"), `recurring_transaction_id` set, and **`note` = template name** (the rule from §3.5; do it in the domain code, and keep the DB trigger as a backstop if you reuse the same database).

### 10.4 Time zone: do not repeat the old cron's mistake
The current Edge Function computes **one "today" for everyone** and groups templates **by `user_id`**. That predates households and gets the date wrong for anyone not in that zone. The .NET worker must:
- group by **household**, and compute `today` from **each household's IANA `timeZone`** (`TimeZoneInfo.FindSystemTimeZoneById("Pacific/Auckland")` works on Linux and on Windows with .NET 6+ ICU; null zone falls back to UTC server-side and logs it);
- never use `DateTime.Now`/`DateTime.UtcNow.Date` for a due decision; inject `TimeProvider` so tests can pin the clock.

### 10.5 The scheduler
- Start with a **`BackgroundService` + `PeriodicTimer` running hourly**, not once a day: "due today" depends on each household's local midnight, so a single 06:00 UTC run is wrong for most zones. Reconcile is idempotent and cheap when nothing is due, so an hourly pass over households that have active templates is fine.
- **Multiple API instances:** guard each run with a Postgres advisory lock (`pg_try_advisory_lock`) so only one instance runs the sweep, or use **Hangfire/Quartz** with Postgres storage if you want retries, a dashboard and persisted schedules. Even without a lock the constraints in §10.3 keep it correct; the lock just avoids wasted work.
- One household failing must not stop the sweep: catch per household, log, continue. Emit counts (`posted`, `skippedAsDuplicate`) like the Edge Function does.
- The worker acts as a **system actor** (not a user): it needs no membership check, writes `created_by = null`, and must not be callable over HTTP.
- After posting, publish the realtime event (§4) `household.changed { resources: ['transactions','recurring'] }`.

### 10.6 The user-triggered operations (each atomic)
- **Reconcile** is **server-owned (decided 2026-11-17)**: the worker sweeps hourly (§10.5), and creating/editing a template reconciles that household inline so something due today posts at once. The frontend **does not trigger it**: `useAutoReconcile` and `RecurringService.reconcileDue` are removed and the dashboard only reads. `POST .../recurring/reconcile` remains for repair and tests.
- **Undo a posted occurrence** (the "Undo" button): delete the linked transaction **and** set the occurrence to `skipped` with `transactionId = null`, in one transaction, so it never re-posts for that date.
- **Skip an upcoming occurrence:** insert a `skipped` occurrence ahead of time so Due treats it as resolved.
- **Delete a template:** in one transaction, null `transactions.recurring_transaction_id` for its rows, then delete the template (occurrences cascade). Confirmed transactions survive; `hasConfirmedHistory` only drives the dialog copy.
- **Edit a template:** a new default amount only affects *future* occurrences; already-posted rows keep their own amount. For nth-weekday templates the server recomputes `firstDueDate` (§3.6) and ignores the client's value.
- Permissions: creating/editing/deleting a template follows the household's entry rules (own template always; others' per the toggles). The template's creator is stored as `created_by` (the frontend shows "who set it up" from it; do not drop it in the contract migration).

### 10.7 Tests that make this safe
1. `RecurrenceCalculator` / `DueCalculator`: the ported `due.test.ts` cases, plus "last Friday" across months and a leap-year February.
2. **Concurrency** (Testcontainers Postgres): fire `ReconcileHouseholdAsync` 10 times in parallel for the same household; assert exactly one transaction and one occurrence per due date.
3. **Time zone:** a household in `Pacific/Auckland` at 23:00 UTC is already "tomorrow"; a household in `America/Los_Angeles` at the same instant is not. Pin the clock with a fake `TimeProvider`.
4. **Undo then reconcile** again: the occurrence stays skipped and nothing re-posts.
5. **Template deletion** keeps its posted transactions (with `recurring_transaction_id` null).
6. **Isolation:** a member of household A can neither trigger nor read reconcile results for household B.

### 10.8 Open recurring decisions
- Reuse the existing `pg_cron`/Edge Function in the interim, or switch it off the moment the worker ships? (They are safe to run together because of the unique constraints, but the old function's global-"today" bug will keep posting wrongly-timed rows until it is retired.)
- Hosted scheduler: plain `BackgroundService` (recommended to start) vs Hangfire/Quartz.
- ~~Should reconcile be part of the port?~~ **Resolved:** no. The server owns it; the port loses `reconcileDue` and keeps only reads and user actions (see §11 step 1).

## 11. Auth with ASP.NET Core Identity

Because auth moves into the API, **Supabase can no longer be the front door**: row-level security (which keys off `auth.uid()`) stops protecting anything the browser reaches directly. All data access goes through the API, and authorization is enforced there (§2 rules 1-2). Plan for the frontend to **delete `src/lib/supabase.ts` and the Supabase adapters at cutover**.

### 11.1 Server design
- `AppUser : IdentityUser<Guid>`; `AppDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>` (we use no roles; household roles live in `household_members`). Npgsql provider. Identity tables are created by EF migrations.
- **User id = profile link.** Keep `AppUser.Id` equal to today's `auth.users.id` when importing, so `user_profiles.auth_user_id` and every FK stays valid with no remapping.
- **Registration** (`POST /v1/auth/register`) runs in **one transaction**: create user, create the profile, create the Personal household and its Admin membership. This replaces the `handle_new_user` trigger.
- **No cookies, anywhere (decided 2026-11-17):** the API never sets or reads an auth cookie, so there is no cross-site/SameSite/CSRF handling and no `credentials: 'include'` CORS. Both tokens travel in JSON bodies and the `Authorization: Bearer` header only. CORS is a plain allow-list of the frontend origin(s) with **no** `AllowCredentials`.
- **Login** (`POST /v1/auth/login`): email + password, lockout on repeated failures, returns `{ accessToken, expiresIn, refreshToken }` in the body. `POST /v1/auth/refresh` takes the refresh token in the body and rotates it (store hashed, one-time use, **revoke the whole family on reuse** so a stolen token is detected, absolute lifetime cap). `POST /v1/auth/logout` revokes it.
- **Google**: `Microsoft.AspNetCore.Authentication.Google` as an external login. Flow for a SPA/SSR client: `GET /v1/auth/google/start?redirectTo=...` (validate `redirectTo` against an allow-list) → Google → API callback signs the user in or creates them → redirects to `redirectTo` with a short-lived one-time code the client exchanges at `POST /v1/auth/exchange` for tokens (never put tokens in a URL).
- **Tokens:** access JWT ~15 minutes, claims `sub` (user id) and `email` only; refresh token days/weeks. Validate with `AddJwtBearer`; the **actor is always read from `sub`** (§2 rule 1). No household/role claims in the token (they change; look them up per request).
- Email confirmation and password reset: decide whether v1 needs them (Identity supports both; they need an email sender).
- Rate-limit `/auth/*` (`AddRateLimiter`) and return `429`.

### 11.2 Migrating existing users
- Import `auth.users` into `AspNetUsers` preserving `id` and `email` (mark confirmed).
- **Password hashes:** Supabase stores **bcrypt**; Identity defaults to PBKDF2. Don't force a mass reset: add a custom `IPasswordHasher<AppUser>` that verifies bcrypt and returns `SuccessRehashNeeded`, so each user is silently re-hashed to Identity's format on next login.
- **Google users:** import `auth.identities` rows as `AspNetUserLogins` (`LoginProvider = "Google"`, `ProviderKey` = the Google subject id) so they keep signing in with Google to the same account.
- Rehearse the import on a copy first and verify counts and a login per provider.

### 11.3 What the frontend changes (at cutover)
Implement `ApiAuthRepository` against `IAuthRepository`:
- `signIn`/`signUp` → the endpoints above. **Access token in memory only. Refresh token in `localStorage`** (web) so a reload keeps the session; the native app uses the platform secure store. This is the known trade-off of avoiding cookies: JavaScript-readable storage is exposed to XSS, so compensate with a strict `Content-Security-Policy`, no `dangerouslySetInnerHTML`/untrusted HTML, short access-token life, refresh-token rotation with reuse detection (above), and a logout that revokes server-side. Don't put either token in a URL, a log, or query string.
- `getSession` → validate/refresh and return `{ user }`; `onAuthStateChange` → an in-app event emitter fired on login, logout and refresh failure (Supabase provided this for free; we now own it).
- `signInWithOAuth` → navigate to `/v1/auth/google/start`.
- A shared API client attaches the bearer token, refreshes once on `401`, then surfaces `unauthenticated` as a `DataError`.
- **SSR:** with no cookie, the server renders no per-user data; the session lives in the browser. Authenticated routes load their data client-side (as the app's Supabase session already does from browser storage). The SSR side of TanStack Start must never hold user tokens in module-level state.

## 12. Decide first, and the order to do it

These are cheap while the only backend is Supabase and expensive after the API exists. Frontend steps keep the Supabase adapter working by implementing the new port shapes with RPC functions, so the swap stays one file (ADR 0011).

1. **Reshape the ports around intent, not tables.** Remove `reconcileDue` and `useAutoReconcile`; add `undoOccurrence(id)`; make template delete one call; make `create` accept `householdIds[]` (dual entry); make `update` carry `version` (the column and the 409 rule already exist; adapters just never send it). Port, adapter, tests and this document change together.
2. **Remove the client-supplied `userId`/`profileId`** from port inputs (`TransactionCreate`, `CategoryCreate`, `RecurringTransactionCreate`, ...). The API ignores them; remove them first.
3. **Run the contract migration** (ADR 0012): drop `user_id` on ledger tables and the profile-level currency/Period/target columns, and **write each Personal household's `time_zone`** so the server never sees null.
4. **Add a realtime port** (`subscribe(householdId, onChange)` mapping to `invalidateQueries`) and implement it on Supabase Realtime now; the API later swaps in Server-Sent Events behind the same port. This also fixes "another member doesn't see my new entry until they refocus".
5. **API conventions, fixed before the first endpoint:** `/v1` prefix; problem+json errors with a stable `code` mapped to `DataError`; opaque cursor pagination; camelCase JSON; GUID string ids; an **`Idempotency-Key`** header on create endpoints (the native app will retry on flaky networks); generate the frontend's TypeScript types/client **from the OpenAPI spec** (pick the generator now, e.g. `openapi-typescript`).
6. Keep two repos; the OpenAPI document is the shared artifact; add a contract test in CI.
7. Decide the **Database** option (§8), then write the new ADR and update ADR 0012's Status.

Build order after that: auth + profile + households → categories → transactions → recurring (+ worker) → reports → realtime.
