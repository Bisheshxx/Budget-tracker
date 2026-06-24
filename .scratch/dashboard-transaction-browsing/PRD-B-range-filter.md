# PRD B: Range Filter (re-scopes the This Period card + list)

Status: ready-for-agent

> Domain language: see [CONTEXT.md](../../CONTEXT.md) — note the new **Range** term. Architecture: see [ADR 0001](../../docs/adr/0001-client-side-swappable-repositories.md). Depends on: [PRD A — paginated list with day dividers](./PRD-A-infinite-scroll-and-day-dividers.md).

## Problem Statement

The "This Period" card and the transaction list are locked to my current Period. I have no way to look at an arbitrary stretch of time — "what did I spend between these two dates?" — to get a sense of my spending over a custom window.

## Solution

Add a **Range** filter inside the "This Period" card: two date pickers (year/month/day) plus **Apply** and **Clear**. Applying a Range re-scopes **both** the card and the transaction list below it to that arbitrary date span. The card retitles to the Range, recomputes Cashflow (income/expenses/net) and spend-by-category for the span, and **hides the Budget Target** (a monthly-Period concept that's meaningless over an arbitrary Range). The list (from PRD A) shows transactions within the Range, still infinite-scrolled and day-divided. Clearing returns everything to the default current-Period view. The active Range lives in the URL so it survives refresh and is shareable.

A **Range is not a Period** — it's a free-form exploratory lens (see [CONTEXT.md](../../CONTEXT.md)). The Period model is unchanged; the custom start day stays meaningful.

## User Stories

1. As a user, I want to pick a start and end date and apply them, so that I can view my spending over a custom span.
2. As a user, I want the "This Period" card to recompute its income/expenses/net and spend-by-category for the Range I picked, so that the summary reflects that span.
3. As a user, I want the transaction list to show only the Range's transactions (still grouped by day, still infinite-scroll), so that the list matches the card.
4. As a user, I want the Budget Target hidden while a Range is active, so that I'm not shown a meaningless monthly target against an arbitrary span.
5. As a user, I want to clear the Range, so that I return to my normal current-Period dashboard.
6. As a user, I want my Range to survive a page refresh and be in the URL, so that I can bookmark or share the view.
7. As a user, I want invalid ranges rejected (start after end, end in the future), so that I can't apply a nonsensical span.

## Implementation Decisions

**Range = distinct concept** (added to [CONTEXT.md](../../CONTEXT.md)): free-form `from`/`to` date span, no Budget Target / anchor / pass-fail meaning. Does **not** redefine Period.

**One Range drives both surfaces.** A single piece of Range state (from the URL) feeds both `CashflowSummary` and `RecentTransactions`. No Range = current Period for both (the default from PRD A).

**Persistence — URL search params.**
- Typed search params on `/_authed/dashboard`: `from`, `to` (`YYYY-MM-DD`), both optional; validate via the route's `validateSearch`. Empty/absent = current Period.
- The dashboard reads the Range from search params and threads it into both components; Apply/Clear navigate (update search params) rather than setting local state.

**Filter control — in the card.**
- A new Range filter component (two date pickers + Apply/Clear) rendered **inside `CashflowSummary`** (the "This Period" card).
- zod schema in `src/features/transactions/schema.ts`; build with RHF + shadcn `Form` primitives per `CLAUDE.md`. Validation: both dates required to apply, `from <= to`, `to` not in the future.
- Apply writes `?from=&to=`; Clear removes them.

**Card behaviour under a Range.**
- `usePeriodSummary` (or a thin wrapper hook) accepts an optional bounds/`PeriodRange` instead of always deriving from `today`; when a Range is active, pass `{ start: from, end: to+1day }` (half-open, matching `listInRange`). The unpaginated summary path stays `listInRange` → `rollup` (reused unchanged).
- When a Range is active: card **title** shows the Range (e.g. "Jan 3 – Mar 18"), **`BudgetTargetReference` is not rendered**, Cashflow totals + spend-by-category stay.
- No Range: title "This Period", Budget Target shown — exactly as today.

**List behaviour under a Range.**
- Dashboard passes the Range to PRD A's `useTransactionsInfinite({ from, to })`; with no Range it passes the current-Period bounds (PRD A default). The list heading mirrors the card (Range vs the existing "Recent transactions").

**Two queries, shared bounds.** The card summary totals *every* row in the span (`listInRange` → `rollup`, unpaginated); the list pages (PRD A). They share `from`/`to` but cannot be one query — a correct total can't come from a half-loaded list.

**Reuse (don't rebuild):** `rollup()` (`src/features/transactions/summary.ts`); `listInRange()` (repo); `resolvePeriod`/`PeriodRange`/`todayYmd` (`src/shared/period.ts`); `Money`/`MoneyBadge`; the shadcn `Form` + zod + RHF convention.

**Representative files:** `src/routes/_authed/dashboard.tsx`, `src/features/transactions/components/CashflowSummary.tsx`, `src/features/transactions/use-transactions.ts`, `src/features/transactions/schema.ts`, plus a new Range filter component under `src/features/transactions/components/`.

## Testing Decisions

- **Range schema (zod) unit tests:** rejects `from > to`, rejects future `to`, requires both, accepts a valid span.
- **Service layer (fake repo):** the summary for a given `from`/`to` rolls up exactly the rows in `[from, to+1)` (half-open) — reuses existing `getPeriodSummary`/`rollup` coverage with Range bounds.
- **Hook bounds threading:** `usePeriodSummary` and `useTransactionsInfinite` use the Range bounds in their query keys when a Range is active, and fall back to Period bounds otherwise.
- **Out of unit suite:** the search-param round-trip and component retitle/Budget-Target-hide — verify manually (one optional smoke test).
- Tooling: Vitest (`pnpm test`), tests under `tests/` mirroring `src/`.

## Out of Scope

- Saved/named ranges, presets (last 7/30/90 days), or a calendar quick-picker — just two date inputs for now.
- Changing the Period model, start day, or Onboarding (explicitly unchanged — see the grilling outcome).
- Period Comparison or any Reports changes.
- Pro-rating the Budget Target to a Range — it's hidden, not scaled.

## Further Notes

- Respect [CONTEXT.md](../../CONTEXT.md): a **Range** is never called a "Period" or a "filter" in user-facing copy where precision matters; the card title is the Range dates, the Period is the Period.
- Half-open date math: a Range `from`/`to` (both inclusive in the UI) maps to `listInRange(from, to+1day)` — keep the +1-day conversion in one place.
- Money is integer cents end-to-end.
