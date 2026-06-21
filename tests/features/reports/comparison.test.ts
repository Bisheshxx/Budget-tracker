import { describe, expect, it } from 'vitest'
import {
  computeComparison,
  computeWeeks,
  percentChange,
} from '#/features/reports/comparison.ts'
import type { Transaction } from '#/features/transactions/types.ts'

// Minimal transaction factory — only the fields the rollup/comparison math reads
// matter; the rest are filled with stable placeholders.
function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? 'tx',
    userId: 'u1',
    categoryId: partial.categoryId ?? null,
    type: partial.type ?? 'expense',
    amountCents: partial.amountCents ?? 0,
    note: null,
    transactionDate: partial.transactionDate ?? '2026-06-01',
    createdAt: '2026-06-01T00:00:00Z',
  }
}

describe('percentChange', () => {
  it('is the signed fractional change off the previous base', () => {
    expect(percentChange(118, 100)).toBeCloseTo(0.18)
    expect(percentChange(80, 100)).toBeCloseTo(-0.2)
  })

  it('is null when the previous base is 0 (new, not ∞)', () => {
    expect(percentChange(500, 0)).toBeNull()
  })

  it('is null when both are 0 (no change off no base)', () => {
    expect(percentChange(0, 0)).toBeNull()
  })

  it('is -1 (−100%) when current dropped to 0', () => {
    expect(percentChange(0, 100)).toBe(-1)
  })
})

describe('computeComparison', () => {
  it('reports overall income/expenses/net as amount and percent', () => {
    const current = [
      tx({ type: 'income', amountCents: 2000 }),
      tx({ type: 'expense', amountCents: 1180, categoryId: 'food' }),
    ]
    const previous = [
      tx({ type: 'income', amountCents: 2000 }),
      tx({ type: 'expense', amountCents: 1000, categoryId: 'food' }),
    ]

    const result = computeComparison(current, previous)

    expect(result.expenses).toEqual({
      currentCents: 1180,
      previousCents: 1000,
      deltaCents: 180,
      deltaPercent: expect.closeTo(0.18),
    })
    expect(result.income.deltaCents).toBe(0)
    expect(result.income.deltaPercent).toBe(0)
    // net = income − expenses: 820 vs 1000.
    expect(result.net.currentCents).toBe(820)
    expect(result.net.previousCents).toBe(1000)
    expect(result.net.deltaCents).toBe(-180)
  })

  it('compares per category over the union of both Periods', () => {
    const current = [
      tx({ type: 'expense', amountCents: 1180, categoryId: 'food' }),
      tx({ type: 'expense', amountCents: 500, categoryId: 'new' }),
    ]
    const previous = [
      tx({ type: 'expense', amountCents: 1000, categoryId: 'food' }),
      tx({ type: 'expense', amountCents: 300, categoryId: 'gone' }),
    ]

    const result = computeComparison(current, previous)
    const byId = new Map(result.byCategory.map((c) => [c.categoryId, c]))

    expect(byId.get('food')).toMatchObject({
      currentCents: 1180,
      previousCents: 1000,
      deltaCents: 180,
    })
    // A category only in the current Period: previous 0 → percent null ("new").
    expect(byId.get('new')).toMatchObject({
      currentCents: 500,
      previousCents: 0,
      deltaCents: 500,
      deltaPercent: null,
    })
    // A category only in the previous Period: now 0 → −100%.
    expect(byId.get('gone')).toMatchObject({
      currentCents: 0,
      previousCents: 300,
      deltaCents: -300,
      deltaPercent: -1,
    })
  })

  it('sorts categories by magnitude of absolute change, largest first', () => {
    const current = [
      tx({ type: 'expense', amountCents: 100, categoryId: 'small' }),
      tx({ type: 'expense', amountCents: 900, categoryId: 'big' }),
    ]
    const previous = [
      tx({ type: 'expense', amountCents: 50, categoryId: 'small' }),
    ]

    const result = computeComparison(current, previous)
    expect(result.byCategory.map((c) => c.categoryId)).toEqual(['big', 'small'])
  })

  it('excludes income from the category breakdown', () => {
    const current = [tx({ type: 'income', amountCents: 5000 })]
    const result = computeComparison(current, [])
    expect(result.byCategory).toEqual([])
  })

  it('handles an empty previous Period without NaN/∞', () => {
    const current = [
      tx({ type: 'expense', amountCents: 500, categoryId: 'food' }),
    ]
    const result = computeComparison(current, [])
    expect(result.expenses.deltaPercent).toBeNull()
    expect(result.expenses.deltaCents).toBe(500)
  })
})

describe('computeWeeks', () => {
  const range = { start: '2026-06-01', end: '2026-07-01' } // 30 days → 5 slices

  it('slices the Period into 7-day weeks, clamping the final partial week', () => {
    const weeks = computeWeeks([], range)
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toMatchObject({
      weekStart: '2026-06-01',
      weekEnd: '2026-06-08',
    })
    expect(weeks[3]).toMatchObject({
      weekStart: '2026-06-22',
      weekEnd: '2026-06-29',
    })
    // 30 days isn't a multiple of 7: the last slice is the 2-day remainder.
    expect(weeks[4]).toMatchObject({
      weekStart: '2026-06-29',
      weekEnd: '2026-07-01',
    })
  })

  it('buckets transactions into the right week by date offset', () => {
    const weeks = computeWeeks(
      [
        tx({
          type: 'expense',
          amountCents: 100,
          transactionDate: '2026-06-01',
        }),
        tx({
          type: 'expense',
          amountCents: 200,
          transactionDate: '2026-06-07',
        }),
        tx({
          type: 'expense',
          amountCents: 400,
          transactionDate: '2026-06-08',
        }),
        tx({ type: 'income', amountCents: 999, transactionDate: '2026-06-30' }),
      ],
      range,
    )

    expect(weeks[0].expensesCents).toBe(300) // 06-01 and 06-07
    expect(weeks[1].expensesCents).toBe(400) // 06-08
    expect(weeks[4].incomeCents).toBe(999) // 06-30 (final partial week)
  })

  it('ignores dates outside the range defensively', () => {
    const weeks = computeWeeks(
      [
        tx({
          type: 'expense',
          amountCents: 100,
          transactionDate: '2026-07-15',
        }),
      ],
      range,
    )
    const total = weeks.reduce((s, w) => s + w.expensesCents, 0)
    expect(total).toBe(0)
  })
})
