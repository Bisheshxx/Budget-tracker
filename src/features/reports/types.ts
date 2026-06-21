// Domain types owned by the reports feature — the vocabulary the service, hook,
// components, and the repository port all speak. `PeriodReport` is deliberately
// the shape the future Node.js reports endpoint will return: when the data
// source is swapped (see #/data/reports), the axios impl deserializes this same
// contract, so nothing above the repository changes. See docs/adr/0001.

import type { CategorySpend } from '#/features/transactions/types'

// A single metric compared across two Periods: the raw amounts plus the change
// as both an absolute amount and a percentage. `deltaPercent` is null when the
// previous Period was zero (no base to divide by) — rendered as "new" rather
// than ∞/NaN.
export interface Delta {
  currentCents: number
  previousCents: number
  /** current − previous (signed). */
  deltaCents: number
  /** Fractional change (0.18 = +18%), or null when previous is 0. */
  deltaPercent: number | null
}

// The same comparison scoped to one expense category. `categoryId` null =
// Uncategorized.
export interface CategoryDelta extends Delta {
  categoryId: string | null
}

// Period Comparison: this Period vs. the previous one, overall (income, expenses,
// net) and broken down per expense category so a user sees which categories drove
// the change.
export interface PeriodComparison {
  income: Delta
  expenses: Delta
  net: Delta
  /** Per-category expense deltas, largest absolute change first. */
  byCategory: CategoryDelta[]
}

// One week within the current Period (a 7-day slice from the Period start; the
// final slice may be shorter since Periods run 28–31 days).
export interface WeekSlice {
  /** Inclusive week start, 'YYYY-MM-DD'. */
  weekStart: string
  /** Exclusive week end, 'YYYY-MM-DD'. */
  weekEnd: string
  incomeCents: number
  expensesCents: number
}

// The full Reports payload for a Period: the comparison, the weekly breakdown,
// and the current Period's spend-by-category (for the category chart). Reuses
// CategorySpend from the transactions feature so the chart and the Dashboard
// speak the same shape.
export interface PeriodReport {
  comparison: PeriodComparison
  weeks: WeekSlice[]
  currentByCategory: CategorySpend[]
}
