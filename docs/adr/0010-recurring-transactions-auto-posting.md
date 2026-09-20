# Recurring Transactions: auto-posting, income, and weekday rules

Status: accepted

Supersedes [ADR 0006](./0006-recurring-expenses-templates-and-data-retention.md)
§1 ("Templates with prompt-to-confirm") and its "income out of scope"
non-goal. ADR 0006 §2's data-retention framing (deactivate-don't-delete,
generate-on-read occurrences, all payment history retained) is retained and
clarified below, not reversed. Also introduces a narrow, explicitly-scoped
exception to [ADR 0001](./0001-client-side-swappable-repositories.md)'s
"no backend scheduler" framing.

## Context

ADR 0006 chose prompt-to-confirm over silent auto-generation specifically
because a template's default amount can differ from the real one, and
auto-posting a possibly-wrong row into Cashflow seemed worse than a manual
step. In practice that manual step became the friction: every occurrence
still required opening the app and clicking through a dialog before it
counted anywhere, even for genuinely fixed amounts (rent, a subscription).
The user asked for confirmation to be removed entirely and replaced with a
real schedule — occurrences should post automatically on their due date,
whether or not the app is open that day, not merely skip the confirm dialog
on next app-open.

Since "recurring" now needs to cover income as well (a paycheck is exactly
the same "fixed schedule" shape as rent), the `RecurringExpense` vocabulary
is renamed to `RecurringTransaction` throughout, and monthly recurrence
gains an "nth weekday of month" rule alongside day-of-month, since paychecks
often land on something like "the last Friday of the month" rather than a
fixed day-of-month.

## Decisions

### 1. `kind: 'expense' | 'income'`; category stays required for both

A Recurring Transaction template now carries a `kind`, mirroring
`transactions.type`'s shape. Category remains **required** for every kind —
a deliberate deviation from `quickAddSchema`'s optional category on ordinary
transactions. Recurring templates are a small, deliberately curated set
(rent, gym, a paycheck); picking a category once is cheap and materially
improves reporting, so the "quick, low-friction" argument for optional
category on one-off quick-add transactions doesn't apply here.

### 2. Monthly recurrence: day-of-month or nth-weekday

Alongside the existing day-of-month anchor (1–28), a monthly template can
now repeat on the nth occurrence of a weekday in the month, including "last"
(e.g. "the last Friday"). `firstDueDate` is **always service-derived** for
an nth-weekday template, anchored on the current month and rolling to next
month if that date has already passed — never trusted from client input —
so the stored date can never drift from the rule it's supposed to represent.
This is enforced in code (`RecurringService.create`/`update`), not in a SQL
check constraint, which would be brittle for the "last" case.

### 3. Due occurrences auto-post; `confirm`/`confirmAll` are removed

`RecurringService.reconcileDue` replaces the old `confirm`/`confirmAll`
flow: every currently-Due occurrence gets a transaction created from the
template's default amount/date (type from `kind`), immediately recorded as
`confirmed`. The Dashboard's confirm/skip dialog (`DueNow`) is replaced by
`RecentlyPosted`, a purely informational list of what auto-posted, with
inline **Edit** (amount/date correction) and **Undo**.

This is a material behavior change worth stating explicitly: amount
corrections now happen **after** posting via Edit, rather than **before**
posting via confirm. Functionally equivalent for the user's end state, but
mechanically different — an occurrence briefly exists as a "wrong"
transaction if the template default doesn't match reality that time.
Accepted as the trade-off for removing manual confirmation.

Auto-posting must be safe under concurrent triggers (the client on page
load, and the daily cron below, can both observe the same occurrence as
Due). `RecordConfirmed` is an idempotent upsert on
`(recurring_transaction_id, occurrence_date)`; the service creates its
transaction first, then upserts the occurrence, and deletes its own
transaction if the upsert reveals another caller already won that slot. This
avoids ever inventing a `pending` occurrence status, which ADR 0006 already
ruled out — the occurrence table still stores only resolved rows.

### 4. `skip` repurposed as Undo; `skipUpcoming` added for pre-emptive skip

`skip` now means "undo an auto-posted transaction": delete the transaction,
flip its occurrence to `skipped`. A new, separate `skipUpcoming` covers
skipping an occurrence **before** it posts (e.g. "don't post rent this
month") — it records a `skipped` row ahead of time so `computeDue`/
`reconcileDue` treat that date as already resolved. Both go through the same
repository upsert, since "flip an existing confirmed row" and "insert a
fresh row for a date with no history yet" are the same operation.

### 5. Delete-guard fix

`RecurringService.delete`/the repository now **always** sever
`transactions.recurring_transaction_id` on any linked transactions before
deleting the template (a no-op when there are none), regardless of
confirmed history, before the cascade removes the template's own occurrence
rows. This closes a real gap: ADR 0006 documented a confirmed-history-aware
delete guard that the original implementation never actually had (a plain
unconditional `DELETE`). Always-sever-first achieves the same guarantee
(no confirmed transaction is ever touched) without branching.

### 6. Scheduling: a narrow exception to ADR 0001

A Supabase Edge Function (`supabase/functions/reconcile-recurring`) plus a
daily `pg_cron`/`pg_net` schedule now calls `reconcileDue`-equivalent logic
against a service-role client, across all users, once a day. This is a
deliberate, narrowly-scoped exception to ADR 0001's "no backend scheduler,
client-side repositories" framing for this one feature. ADR 0001's general
architecture is otherwise unchanged; a future feature wanting server-side
automation should get its own ADR rather than assume this sets a blanket
precedent. Because the Edge Function runs in an isolated Deno runtime with
no access to the app's `#/` path alias, Vite bundling, or session-bound
Supabase client, its due-date logic is a **duplicated**, framework-free copy
(`supabase/functions/_shared/due.ts`) of `src/features/recurring/due.ts`,
kept in sync by hand rather than through a shared build step.

## Consequences

- `RecurringExpense` → `RecurringTransaction` (and the underlying
  `recurring_expenses`/`recurring_expense_occurrences` tables /
  `transactions.recurring_expense_id` column) is a one-time, mechanical
  rename across the schema and codebase.
- There is a window between an occurrence becoming Due and the daily cron
  actually posting it (up to 24h) during which `skipUpcoming` is the only
  way to pre-empt a specific occurrence short of deactivating the whole
  template — accepted, not treated as a bug.
- The concurrency-handling design in `reconcileDue` (create-then-compensate
  on a lost race) is the trickiest new invariant introduced here and the one
  most worth extra scrutiny in any future change to that method.
- Yearly frequency remains out of scope, unchanged from ADR 0006.
