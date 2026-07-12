// Pure helpers for segmenting the transaction list into per-day groups — the
// day dividers on the Dashboard. No React, no I/O. Kept separate from the
// component so the grouping logic is unit-testable on its own.

import { addDays, parseYmd } from '#/shared/lib/period'
import type { Transaction } from './types'

// One calendar day's worth of transactions, with that day's net (income −
// expenses) precomputed for the divider header.
export interface TransactionDay {
  /** The day, 'YYYY-MM-DD'. */
  date: string
  /** Net for the day in integer cents: income − expenses. */
  netCents: number
  /** The day's transactions, in the order they arrived (newest-first overall). */
  transactions: Transaction[]
}

/**
 * Group an already-sorted (newest-day-first) flat list into per-day segments,
 * preserving order. Because it runs over the *accumulated* list rather than a
 * single page, a day split across an infinite-scroll page boundary collapses
 * into one segment (no duplicate divider mid-list).
 */
export function groupByDay(transactions: Transaction[]): TransactionDay[] {
  const days: TransactionDay[] = []
  let current: TransactionDay | null = null

  for (const tx of transactions) {
    if (!current || current.date !== tx.transactionDate) {
      current = { date: tx.transactionDate, netCents: 0, transactions: [] }
      days.push(current)
    }
    current.transactions.push(tx)
    current.netCents += tx.type === 'expense' ? -tx.amountCents : tx.amountCents
  }

  return days
}

/**
 * The divider label for a day relative to `today`: "Today" / "Yesterday" for the
 * two most recent days, otherwise an absolute date like "Mon 17 Jun". Both
 * inputs are 'YYYY-MM-DD'; the absolute format is locale-aware via Intl.
 */
export function formatDayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, -1)) return 'Yesterday'

  const { year, month, day } = parseYmd(date)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(year, month - 1, day))
}
