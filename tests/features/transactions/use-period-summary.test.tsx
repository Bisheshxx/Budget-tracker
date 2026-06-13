// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import type { PeriodSummary } from '#/features/transactions/types.ts'

// Mock the profile hook and the service singleton so the hook is exercised
// without Supabase. vi.hoisted keeps the spies reachable in the factories.
const { useProfile } = vi.hoisted(() => ({ useProfile: vi.fn() }))
const { getPeriodSummary } = vi.hoisted(() => ({ getPeriodSummary: vi.fn() }))

vi.mock('#/features/profile/use-profile', () => ({ useProfile }))
vi.mock('#/features/transactions', () => ({
  transactionService: { getPeriodSummary },
}))

const { usePeriodSummary } = await import(
  '#/features/transactions/use-transactions.ts'
)

// Each test gets a fresh QueryClient (retries off) so failures surface fast.
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return createElement(QueryClientProvider, { client }, children)
}

const summary: PeriodSummary = {
  incomeCents: 5000,
  expensesCents: 2000,
  netCents: 3000,
  byCategory: [{ categoryId: null, amountCents: 2000 }],
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('usePeriodSummary', () => {
  it('stays loading and never queries until the profile resolves', () => {
    useProfile.mockReturnValue({ profile: null, loading: true })

    const { result } = renderHook(() => usePeriodSummary(), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.summary).toBeNull()
    expect(getPeriodSummary).not.toHaveBeenCalled()
  })

  it('queries the summary for the profile and exposes a 1-based day count', async () => {
    useProfile.mockReturnValue({
      profile: { id: 'profile-1', budgetPeriodStartDay: 25 },
      loading: false,
    })
    getPeriodSummary.mockResolvedValue(summary)

    const { result } = renderHook(() => usePeriodSummary(), { wrapper })

    await waitFor(() => expect(result.current.summary).toEqual(summary))

    // Called with the profile id and a resolved Period range (start before end).
    expect(getPeriodSummary).toHaveBeenCalledWith(
      'profile-1',
      expect.objectContaining({
        start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    expect(result.current.daysIntoPeriod).toBeGreaterThanOrEqual(1)
  })
})
