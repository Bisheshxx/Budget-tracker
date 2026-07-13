// Pure keyset-pagination helper for the Dashboard infinite list — no React, no
// I/O. Kept separate from the hook so the cursor logic is unit-testable on its
// own (the hook just hands it to useInfiniteQuery's getNextPageParam).

import type {
  Transaction,
  TransactionPageCursor,
} from '#/features/transactions/types/transaction.type'

/**
 * Resolve the cursor for the page after `page`, given the page size. A page
 * shorter than `pageSize` is the last one, so there's nothing after it →
 * `undefined` (terminates paging). Otherwise resume from the last row's
 * (transactionDate, id) keyset cursor.
 */
export function nextPageCursor(
  page: Transaction[],
  pageSize: number,
): TransactionPageCursor | undefined {
  if (page.length < pageSize) return undefined
  const last = page[page.length - 1]
  return { transactionDate: last.transactionDate, id: last.id }
}
