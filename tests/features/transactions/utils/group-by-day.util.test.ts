import { describe, expect, it } from 'vitest'
import {
  formatDayLabel,
  groupByDay,
} from '#/features/transactions/utils/group-by-day.util.ts'
import type { Transaction } from '#/features/transactions/types/transaction.type.ts'

// Build a transaction with only the fields grouping reads.
function tx(
  id: string,
  transactionDate: string,
  type: 'income' | 'expense',
  amountCents: number,
): Transaction {
  return {
    id,
    userId: 'profile-1',
    categoryId: null,
    type,
    amountCents,
    note: null,
    transactionDate,
    createdAt: `${transactionDate}T00:00:00Z`,
  }
}

describe('groupByDay', () => {
  it('returns no groups for an empty list', () => {
    expect(groupByDay([])).toEqual([])
  })

  it('segments transactions into per-day groups, preserving order', () => {
    const days = groupByDay([
      tx('a', '2026-06-24', 'expense', 1000),
      tx('b', '2026-06-24', 'income', 5000),
      tx('c', '2026-06-23', 'expense', 2000),
    ])

    expect(days.map((d) => d.date)).toEqual(['2026-06-24', '2026-06-23'])
    expect(days[0].transactions.map((t) => t.id)).toEqual(['a', 'b'])
    expect(days[1].transactions.map((t) => t.id)).toEqual(['c'])
  })

  it('computes the day net as income minus expenses, in cents', () => {
    const [day] = groupByDay([
      tx('a', '2026-06-24', 'income', 5000),
      tx('b', '2026-06-24', 'expense', 1200),
      tx('c', '2026-06-24', 'expense', 800),
    ])

    expect(day.netCents).toBe(3000)
  })

  it('collapses a day split across page boundaries into one group', () => {
    // Two pages concatenated (the hook flattens before grouping): the same day
    // straddles the boundary and must yield a single divider, not two.
    const page1 = [
      tx('a', '2026-06-24', 'expense', 1000),
      tx('b', '2026-06-24', 'expense', 1000),
    ]
    const page2 = [
      tx('c', '2026-06-24', 'expense', 1000),
      tx('d', '2026-06-23', 'expense', 500),
    ]

    const days = groupByDay([...page1, ...page2])

    expect(days.map((d) => d.date)).toEqual(['2026-06-24', '2026-06-23'])
    expect(days[0].transactions.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(days[0].netCents).toBe(-3000)
  })
})

describe('formatDayLabel', () => {
  const today = '2026-06-24'

  it('labels today as "Today"', () => {
    expect(formatDayLabel('2026-06-24', today)).toBe('Today')
  })

  it('labels the prior day as "Yesterday", crossing a month boundary', () => {
    expect(formatDayLabel('2026-05-31', '2026-06-01')).toBe('Yesterday')
  })

  it('renders an absolute date for older days', () => {
    const label = formatDayLabel('2026-06-17', today)
    expect(label).not.toBe('Today')
    expect(label).not.toBe('Yesterday')
    expect(label).toContain('Jun')
  })
})
