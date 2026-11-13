// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { queryKeys } from '#/shared/lib/query-keys.ts'
import { createQueryHarness } from '../../../helpers/query-client.ts'
import { ledgerLoaded } from '../../../helpers/ledger.ts'

const { useLedger, remove } = vi.hoisted(() => ({
  useLedger: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('#/shared/hooks/use-ledger', () => ({ useLedger }))
vi.mock('#/features/transactions', () => ({
  transactionService: { delete: remove },
}))

const { useDeleteTransaction } =
  await import('#/features/transactions/hooks/use-transactions.ts')

afterEach(() => vi.clearAllMocks())

describe('useDeleteTransaction', () => {
  it('deletes by id and refreshes the list and summary', async () => {
    useLedger.mockReturnValue(ledgerLoaded())
    remove.mockResolvedValue(undefined)
    const listKey = queryKeys.transactions.infinite('house-1', {
      from: '2026-06-01',
      to: '2026-07-01',
    })
    const summaryKey = queryKeys.transactions.periodSummary('house-1', {
      start: '2026-06-01',
      end: '2026-07-01',
    })
    const harness = createQueryHarness()
    harness.seed(listKey, summaryKey)

    const { result } = renderHook(() => useDeleteTransaction(), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync('tx-1')

    expect(remove).toHaveBeenCalledWith('tx-1')
    expect(harness.isStale(listKey)).toBe(true)
    expect(harness.isStale(summaryKey)).toBe(true)
  })
})
