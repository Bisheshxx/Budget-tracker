// Pure Reports math — no React, no I/O. Given lists of transactions (already
// fetched for two Period ranges), produce the Period Comparison, the weekly
// breakdown, and the per-Period rollup. Kept pure so it is exhaustively
// unit-testable and so the V1 Supabase report repo can run it client-side while
// the future Node.js backend reimplements the same contract. All arithmetic is
// on integer cents.

import { rollup } from '#/features/transactions/summary'
import type { Transaction } from '#/features/transactions/types'
import type { PeriodRange } from '#/shared/period'
import type { CategoryDelta, Delta, PeriodComparison, WeekSlice } from './types'

const MS_PER_DAY = 86_400_000

function parseYmd(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

function epochDay(date: string): number {
  const { year, month, day } = parseYmd(date)
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

function addDays(date: string, days: number): string {
  const next = new Date((epochDay(date) + days) * MS_PER_DAY)
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(next.getUTCDate()).padStart(2, '0')
  return `${next.getUTCFullYear()}-${mm}-${dd}`
}

// Fractional change from `previous` to `current` (0.18 = +18%). Null when the
// previous base is 0 — there is no meaningful percentage off zero, so callers
// render "new" instead of ∞/NaN.
export function percentChange(
  currentCents: number,
  previousCents: number,
): number | null {
  if (previousCents === 0) return null
  return (currentCents - previousCents) / previousCents
}

function delta(currentCents: number, previousCents: number): Delta {
  return {
    currentCents,
    previousCents,
    deltaCents: currentCents - previousCents,
    deltaPercent: percentChange(currentCents, previousCents),
  }
}

// Period Comparison: current vs. previous, overall (income/expenses/net) and per
// expense category (the union of categories appearing in either Period, so a
// category that vanished or newly appeared still shows). Categories are sorted by
// the magnitude of their absolute change, largest first.
export function computeComparison(
  current: Transaction[],
  previous: Transaction[],
): PeriodComparison {
  const cur = rollup(current)
  const prev = rollup(previous)

  const curById = new Map(
    cur.byCategory.map((c) => [c.categoryId, c.amountCents]),
  )
  const prevById = new Map(
    prev.byCategory.map((c) => [c.categoryId, c.amountCents]),
  )

  const categoryIds = new Set<string | null>([
    ...curById.keys(),
    ...prevById.keys(),
  ])

  const byCategory: CategoryDelta[] = Array.from(categoryIds, (categoryId) => ({
    categoryId,
    ...delta(curById.get(categoryId) ?? 0, prevById.get(categoryId) ?? 0),
  })).sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents))

  return {
    income: delta(cur.incomeCents, prev.incomeCents),
    expenses: delta(cur.expensesCents, prev.expensesCents),
    net: delta(cur.netCents, prev.netCents),
    byCategory,
  }
}

// Slice the current Period into consecutive 7-day weeks from `range.start` and
// total income/expenses per week. The final slice is clamped at `range.end`, so
// it can be shorter than 7 days (Periods run 28–31 days). Transactions are
// bucketed by whole-day offset from the start.
export function computeWeeks(
  current: Transaction[],
  range: PeriodRange,
): WeekSlice[] {
  const startDay = epochDay(range.start)
  const endDay = epochDay(range.end)
  const totalDays = endDay - startDay
  const weekCount = Math.ceil(totalDays / 7)

  const weeks: WeekSlice[] = []
  for (let i = 0; i < weekCount; i++) {
    const weekStart = addDays(range.start, i * 7)
    const rawEnd = addDays(range.start, (i + 1) * 7)
    // Clamp the last week to the Period end.
    const weekEnd = epochDay(rawEnd) > endDay ? range.end : rawEnd
    weeks.push({ weekStart, weekEnd, incomeCents: 0, expensesCents: 0 })
  }

  for (const tx of current) {
    const offset = epochDay(tx.transactionDate) - startDay
    // Ignore anything outside the range (defensive; the repo queries in-range).
    if (offset < 0 || offset >= totalDays) continue
    const week = weeks[Math.floor(offset / 7)]
    if (tx.type === 'income') week.incomeCents += tx.amountCents
    else week.expensesCents += tx.amountCents
  }

  return weeks
}
