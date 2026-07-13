import { describe, expect, it } from 'vitest'
import { nextPageCursor } from '#/features/transactions/utils/pagination.util.ts'
import type { Transaction } from '#/features/transactions/types/transaction.type.ts'

// Build a transaction with only the fields the cursor reads.
function tx(id: string, transactionDate: string): Transaction {
  return {
    id,
    userId: 'profile-1',
    categoryId: null,
    type: 'expense',
    amountCents: 100,
    note: null,
    transactionDate,
    createdAt: `${transactionDate}T00:00:00Z`,
  }
}

describe('nextPageCursor', () => {
  const PAGE_SIZE = 25

  it("returns the last row's (transactionDate, id) when the page is full", () => {
    const page = Array.from({ length: PAGE_SIZE }, (_, i) =>
      tx(`row-${i}`, '2026-06-24'),
    )
    page[PAGE_SIZE - 1] = tx('row-last', '2026-06-20')

    expect(nextPageCursor(page, PAGE_SIZE)).toEqual({
      transactionDate: '2026-06-20',
      id: 'row-last',
    })
  })

  it('returns undefined on a short final page', () => {
    const page = [tx('a', '2026-06-24'), tx('b', '2026-06-23')]

    expect(nextPageCursor(page, PAGE_SIZE)).toBeUndefined()
  })

  it('returns undefined for an empty page', () => {
    expect(nextPageCursor([], PAGE_SIZE)).toBeUndefined()
  })
})
