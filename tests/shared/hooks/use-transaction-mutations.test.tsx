// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { queryKeys } from '#/shared/lib/query-keys.ts'
import { createQueryHarness } from '../../helpers/query-client.ts'
import type { QuickAddInput } from '#/shared/schemas/transaction.schema.ts'
import { ledger, ledgerLoaded, ledgerPending } from '../../helpers/ledger.ts'

const { useLedger, create, update } = vi.hoisted(() => ({
  useLedger: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('#/shared/hooks/use-ledger', () => ({ useLedger }))
vi.mock('#/features/transactions', () => ({
  transactionService: { create, update },
}))

const { useCreateTransaction, useUpdateTransaction } =
  await import('#/shared/hooks/use-transaction-mutations.ts')

const input = { amount: '12.50' } as unknown as QuickAddInput
const listKey = queryKeys.transactions.infinite('house-1', {
  from: '2026-06-01',
  to: '2026-07-01',
})
const summaryKey = queryKeys.transactions.periodSummary('house-1', {
  start: '2026-06-01',
  end: '2026-07-01',
})

afterEach(() => vi.clearAllMocks())

describe('useCreateTransaction', () => {
  it('creates in the active Household and refreshes the list and summary', async () => {
    useLedger.mockReturnValue(ledgerLoaded())
    create.mockResolvedValue({ id: 'tx-1' })
    const harness = createQueryHarness()
    harness.seed(listKey, summaryKey)

    const { result } = renderHook(() => useCreateTransaction(), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync(input)

    expect(create).toHaveBeenCalledWith(ledger, input)
    expect(harness.isStale(listKey)).toBe(true)
    expect(harness.isStale(summaryKey)).toBe(true)
  })

  it('rejects without calling the service when no Household is loaded', async () => {
    useLedger.mockReturnValue(ledgerPending(false))

    const { result } = renderHook(() => useCreateTransaction(), {
      wrapper: createQueryHarness().wrapper,
    })

    await expect(result.current.mutateAsync(input)).rejects.toThrow(
      'No group loaded',
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('leaves the caches alone when the create fails', async () => {
    useLedger.mockReturnValue(ledgerLoaded())
    create.mockRejectedValue(new Error('nope'))
    const harness = createQueryHarness()
    harness.seed(listKey)

    const { result } = renderHook(() => useCreateTransaction(), {
      wrapper: harness.wrapper,
    })

    await expect(result.current.mutateAsync(input)).rejects.toThrow('nope')
    expect(harness.isStale(listKey)).toBe(false)
  })
})

describe('useUpdateTransaction', () => {
  it('updates by id and refreshes the list and summary', async () => {
    useLedger.mockReturnValue(ledgerLoaded())
    update.mockResolvedValue({ id: 'tx-1' })
    const harness = createQueryHarness()
    harness.seed(listKey, summaryKey)

    const { result } = renderHook(() => useUpdateTransaction(), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync({ id: 'tx-1', input })

    expect(update).toHaveBeenCalledWith('tx-1', input)
    expect(harness.isStale(listKey)).toBe(true)
    expect(harness.isStale(summaryKey)).toBe(true)
  })
})
