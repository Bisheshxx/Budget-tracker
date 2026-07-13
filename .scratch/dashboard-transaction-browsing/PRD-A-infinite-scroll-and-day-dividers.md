# PRD A: Paginated Transaction List with Day Dividers

Status: done

> Domain language: see [CONTEXT.md](../../CONTEXT.md). Architecture: see [ADR 0001](../../docs/adr/0001-client-side-swappable-repositories.md). Sibling: [PRD B — Range filter](./PRD-B-range-filter.md) layers on top of this.

## Problem Statement

The Dashboard's transaction list is a flat, fixed top-10 (`useRecentTransactions` → `listRecent(userId, 10)`). I can't see anything older than my last ten entries, the list is an undifferentiated wall of rows with no sense of *when* things happened, and there's no way to keep scrolling into my history. I want to browse all my transactions, grouped by day, loading more as I scroll.

## Solution

Replace the fixed top-10 list with an **infinite-scroll** list that loads transactions in pages of 25 as I scroll, with a loader at the bottom while the next page fetches. Transactions are **segmented by calendar day**: each day is a header showing the date (relative "Today"/"Yesterday", absolute beyond) and **that day's net**, with that day's transactions listed beneath it, newest day first. By default (no Range — see PRD B) the list is scoped to my **current Period**.

## User Stories

1. As a user, I want the transaction list to load more transactions as I scroll to the bottom, so that I can browse my history without a "load more" button.
2. As a user, I want a loading indicator at the bottom of the list while the next page fetches, so that I know more is coming.
3. As a user, I want my transactions grouped under per-day headers (newest day first), so that I can see what I spent on each day.
4. As a user, I want each day header to show that day's net, so that I get day-level spending awareness at a glance.
5. As a user, I want recent days labelled "Today" and "Yesterday" and older days shown as a date, so that the list reads naturally.
6. As a user, I want the default list scoped to my current Period, so that it matches the "This Period" card above it.

## Implementation Decisions

**Pagination — keyset/cursor, not offset.**
- Sort is `(transaction_date desc, id desc)`; the cursor is the last loaded row's `(transaction_date, id)`. Keyset paging stays stable when transactions are added/removed mid-scroll (offset would skip/duplicate rows).
- Page size **25**.
- New repository method on `ITransactionRepository` + Supabase impl:
  `listPage(userId, { from?, to?, limit, cursor? }): Promise<Transaction[]>`
  — `.eq('user_id')`, optional half-open `.gte('transaction_date', from).lt('transaction_date', to)`, `.order('transaction_date', desc).order('id', desc)`, `.limit(limit)`; when `cursor` is present apply the composite keyset predicate `transaction_date < cursor.date OR (transaction_date = cursor.date AND id < cursor.id)`.
- New `TransactionService.listPage(...)` passthrough.
- New hook `useTransactionsInfinite({ from?, to? })` in `use-transactions.ts` using `useInfiniteQuery` / `infiniteQueryOptions` (the repo's first). `getNextPageParam` returns the last row's `(transaction_date, id)` cursor, or `undefined` when a page returns `< limit` (terminates). Query key includes the date bounds.
- **Mutation invalidation:** existing create/update/delete mutations must invalidate the new infinite query too; keep the `['transactions', ...]` prefix consistent so prefix-match invalidation still clears every cached page/bound.

**Day grouping & dividers.**
- `RecentTransactions.tsx` consumes the infinite hook, **flattens all loaded pages**, then groups by `transactionDate`. Grouping runs over the **accumulated** flat list, not per-page, so a day split across a page boundary produces a single header (no duplicate divider mid-list).
- Within a day, rows keep the server order (`created_at`/`id` desc — already the tiebreak).
- Day header = date label + day net. Net summed client-side from that day's rows (income − expenses), rendered via `Money`. Relative labels for today/yesterday via the existing date helpers (`todayYmd` / `parseYmd` in `#/shared/period`); absolute date otherwise.
- Bottom **IntersectionObserver sentinel** triggers `fetchNextPage`; render the loader while `isFetchingNextPage`. Keep the existing empty/loading/error states.

**Default bounds.**
- The default (no Range) bounds = the current Period: reuse `resolvePeriod(todayYmd(), profile.budgetPeriodStartDay)` and pass `{ from: range.start, to: range.end }` into `useTransactionsInfinite`. (PRD B threads a Range in here instead when one is active.)

**Reuse (don't rebuild):** `resolvePeriod`/`PeriodRange`/`todayYmd`/`parseYmd` (`src/shared/period.ts`); `Money` (`#/shared/components/Money`); existing `toTransaction` row mapper and query/mutation patterns in `use-transactions.ts`.

**Representative files:** `src/data/transactions/ITransactionRepository.ts`, `src/data/transactions/supabase-transactions-repository.ts`, `src/features/transactions/transaction-service.ts`, `src/features/transactions/use-transactions.ts`, `src/features/transactions/components/RecentTransactions.tsx`.

## Testing Decisions

- **Service layer with in-memory fake repository** (primary seam, per the project testing convention — inject a fake `ITransactionRepository`, never the barrel):
  - `listPage` passes bounds/limit/cursor through and returns what the repo yields.
- **Pure-function unit tests** for the day-grouping helper (extract it so it's testable): a day split across two pages yields **one** header; per-day net = income − expenses; newest-day-first ordering; empty input.
- **Keyset cursor:** assert `getNextPageParam` returns the correct `(transaction_date, id)` and returns `undefined` on a short final page.
- **Out of unit suite:** the Supabase `listPage` query itself (thin data access; verify manually) and exhaustive component tests. At most a smoke test of scroll → second page appended.
- Tooling: Vitest (`pnpm test`), tests under `tests/` mirroring `src/`.

## Out of Scope

- The Range filter and any re-scoping of the "This Period" card — that's [PRD B](./PRD-B-range-filter.md).
- Virtualised/windowed rendering — plain DOM list is fine at expected volumes.
- Changing transaction row content, edit/delete behaviour, or the Period model.

## Further Notes

- Respect [CONTEXT.md](../../CONTEXT.md): the default scope is the **Period** (don't call it a "month").
- Money is integer cents end-to-end; day-net is summed in cents and only formatted at the `Money` boundary.
