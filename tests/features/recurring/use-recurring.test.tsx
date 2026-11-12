// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { queryKeys } from '#/shared/lib/query-keys.ts'
import { resolvePeriod, todayYmd } from '#/shared/lib/period.ts'
import { createQueryHarness } from '../../helpers/query-client.ts'
import type { RecurringInput } from '#/features/recurring/schema.ts'
import type { RecurringOccurrence } from '#/features/recurring/types.ts'

const { useProfile, service } = vi.hoisted(() => ({
  useProfile: vi.fn(),
  service: {
    listAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    delete: vi.fn(),
    hasConfirmedHistory: vi.fn(),
    skipUpcoming: vi.fn(),
    reconcileDue: vi.fn(),
    listRecentlyPosted: vi.fn(),
    skip: vi.fn(),
  },
}))

vi.mock('#/shared/hooks/use-profile', () => ({ useProfile }))
vi.mock('#/features/recurring', () => ({ recurringService: service }))

const {
  useRecurringTransactions,
  useCreateRecurring,
  useUpdateRecurring,
  useDeactivateRecurring,
  useDeleteRecurring,
  useHasConfirmedHistory,
  useSkipUpcoming,
  useAutoReconcile,
  useRecentlyPosted,
  useSkipDue,
} = await import('#/features/recurring/use-recurring.ts')

const signedIn = {
  profile: { id: 'profile-1', budgetPeriodStartDay: 1 },
  loading: false,
}
const input = { name: 'Rent' } as unknown as RecurringInput
const periodKey = resolvePeriod(todayYmd(), 1).start

const keys = {
  list: queryKeys.recurring.list('profile-1'),
  recent: queryKeys.recurring.recent('profile-1', periodKey),
  txList: queryKeys.transactions.infinite('profile-1', {
    from: '2026-06-01',
    to: '2026-07-01',
  }),
  txSummary: queryKeys.transactions.periodSummary('profile-1', {
    start: '2026-06-01',
    end: '2026-07-01',
  }),
  report: queryKeys.reports.report('profile-1', 'period', '2026-06'),
}

// The table-driven cases below run several differently-typed mutation hooks
// through one body, so they are widened to this common shape.
type AnyMutationHook = () => {
  mutateAsync: (variables: unknown) => Promise<unknown>
}

afterEach(() => vi.clearAllMocks())

describe('useRecurringTransactions', () => {
  it('stays loading and never queries until the profile resolves', () => {
    useProfile.mockReturnValue({ profile: null, loading: true })

    const { result } = renderHook(() => useRecurringTransactions(), {
      wrapper: createQueryHarness().wrapper,
    })

    expect(result.current.loading).toBe(true)
    expect(service.listAll).not.toHaveBeenCalled()
  })

  it('lists every template of the profile', async () => {
    useProfile.mockReturnValue(signedIn)
    service.listAll.mockResolvedValue([{ id: 're-1' }])

    const { result } = renderHook(() => useRecurringTransactions(), {
      wrapper: createQueryHarness().wrapper,
    })

    await waitFor(() =>
      expect(result.current.recurringTransactions).toEqual([{ id: 're-1' }]),
    )
    expect(service.listAll).toHaveBeenCalledWith('profile-1')
  })

  it('surfaces a query error', async () => {
    useProfile.mockReturnValue(signedIn)
    service.listAll.mockRejectedValue(new Error('down'))

    const { result } = renderHook(() => useRecurringTransactions(), {
      wrapper: createQueryHarness().wrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('template mutations', () => {
  it('create rejects without calling the service when no profile is loaded', async () => {
    useProfile.mockReturnValue({ profile: null, loading: false })

    const { result } = renderHook(() => useCreateRecurring(), {
      wrapper: createQueryHarness().wrapper,
    })

    await expect(result.current.mutateAsync(input)).rejects.toThrow(
      'No profile loaded',
    )
    expect(service.create).not.toHaveBeenCalled()
  })

  it.each([
    ['create', () => useCreateRecurring(), input, ['profile-1', input]],
    [
      'update',
      () => useUpdateRecurring(),
      { id: 're-1', input },
      ['re-1', input],
    ],
    ['deactivate', () => useDeactivateRecurring(), 're-1', ['re-1']],
    ['delete', () => useDeleteRecurring(), 're-1', ['re-1']],
    [
      'skipUpcoming',
      () => useSkipUpcoming(),
      { recurringTransactionId: 're-1', occurrenceDate: '2026-06-05' },
      ['re-1', '2026-06-05'],
    ],
  ] as const)(
    '%s calls the service and refreshes the template list',
    async (name, useHook, variables, expectedArgs) => {
      useProfile.mockReturnValue(signedIn)
      service[name].mockResolvedValue(undefined)
      const harness = createQueryHarness()
      harness.seed(keys.list, keys.txList)

      const { result } = renderHook(useHook as AnyMutationHook, {
        wrapper: harness.wrapper,
      })
      await result.current.mutateAsync(variables)

      expect(service[name]).toHaveBeenCalledWith(...expectedArgs)
      expect(harness.isStale(keys.list)).toBe(true)
      expect(harness.isStale(keys.txList)).toBe(false)
    },
  )
})

describe('useHasConfirmedHistory', () => {
  it('asks the service about that template', async () => {
    service.hasConfirmedHistory.mockResolvedValue(true)

    const { result } = renderHook(() => useHasConfirmedHistory('re-1'), {
      wrapper: createQueryHarness().wrapper,
    })

    await waitFor(() => expect(result.current.data).toBe(true))
    expect(service.hasConfirmedHistory).toHaveBeenCalledWith('re-1')
  })
})

describe('useRecentlyPosted', () => {
  it('lists occurrences posted since the start of the current Period', async () => {
    useProfile.mockReturnValue(signedIn)
    service.listRecentlyPosted.mockResolvedValue([{ occurrence: { id: 'o' } }])

    const { result } = renderHook(() => useRecentlyPosted(), {
      wrapper: createQueryHarness().wrapper,
    })

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(service.listRecentlyPosted).toHaveBeenCalledWith(
      'profile-1',
      periodKey,
    )
  })

  it('does not query before the profile resolves', () => {
    useProfile.mockReturnValue({ profile: null, loading: true })

    renderHook(() => useRecentlyPosted(), {
      wrapper: createQueryHarness().wrapper,
    })

    expect(service.listRecentlyPosted).not.toHaveBeenCalled()
  })
})

describe('useAutoReconcile', () => {
  it('reconciles once per profile + Period, then refreshes everything it touched', async () => {
    useProfile.mockReturnValue(signedIn)
    service.reconcileDue.mockResolvedValue([])
    const harness = createQueryHarness()
    harness.seed(...Object.values(keys))

    const { rerender } = renderHook(() => useAutoReconcile(), {
      wrapper: harness.wrapper,
    })

    await waitFor(() => expect(harness.isStale(keys.report)).toBe(true))
    expect(service.reconcileDue).toHaveBeenCalledWith(
      'profile-1',
      todayYmd(),
      1,
    )
    expect(harness.isStale(keys.recent)).toBe(true)
    expect(harness.isStale(keys.txList)).toBe(true)
    expect(harness.isStale(keys.txSummary)).toBe(true)
    // The template list itself is unaffected by posting.
    expect(harness.isStale(keys.list)).toBe(false)

    rerender()
    rerender()
    expect(service.reconcileDue).toHaveBeenCalledTimes(1)
  })

  it('does nothing until the profile resolves', () => {
    useProfile.mockReturnValue({ profile: null, loading: true })

    renderHook(() => useAutoReconcile(), {
      wrapper: createQueryHarness().wrapper,
    })

    expect(service.reconcileDue).not.toHaveBeenCalled()
  })
})

describe('useSkipDue', () => {
  it('undoes the post and refreshes the recent list, totals and reports', async () => {
    useProfile.mockReturnValue(signedIn)
    service.skip.mockResolvedValue(undefined)
    const harness = createQueryHarness()
    harness.seed(...Object.values(keys))
    const occurrence = { id: 'occ-1' } as RecurringOccurrence

    const { result } = renderHook(() => useSkipDue(), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync(occurrence)

    expect(service.skip).toHaveBeenCalledWith(occurrence)
    expect(harness.isStale(keys.recent)).toBe(true)
    expect(harness.isStale(keys.txList)).toBe(true)
    expect(harness.isStale(keys.txSummary)).toBe(true)
    expect(harness.isStale(keys.report)).toBe(true)
  })
})
