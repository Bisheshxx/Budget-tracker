// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import type { ReactNode } from 'react'
import type { PeriodReport } from '#/features/reports/types.ts'

// Mock the profile hook and the service singleton so the hook is exercised
// without Supabase. vi.hoisted keeps the spies reachable in the factories.
const { useProfile } = vi.hoisted(() => ({ useProfile: vi.fn() }))
const { getPeriodReport } = vi.hoisted(() => ({ getPeriodReport: vi.fn() }))

vi.mock('#/features/profile/use-profile', () => ({ useProfile }))
vi.mock('#/features/reports', () => ({
  reportService: { getPeriodReport },
}))

const { useReports } = await import('#/features/reports/use-reports.ts')

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return createElement(QueryClientProvider, { client }, children)
}

const report: PeriodReport = {
  comparison: {
    income: { currentCents: 0, previousCents: 0, deltaCents: 0, deltaPercent: null },
    expenses: { currentCents: 0, previousCents: 0, deltaCents: 0, deltaPercent: null },
    net: { currentCents: 0, previousCents: 0, deltaCents: 0, deltaPercent: null },
    byCategory: [],
  },
  weeks: [],
  currentByCategory: [],
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useReports', () => {
  it('stays loading and never queries until the profile resolves', () => {
    useProfile.mockReturnValue({ profile: null, loading: true })

    const { result } = renderHook(() => useReports(), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.report).toBeNull()
    expect(getPeriodReport).not.toHaveBeenCalled()
  })

  it('queries the report for the profile id, today, and start day', async () => {
    useProfile.mockReturnValue({
      profile: { id: 'profile-1', budgetPeriodStartDay: 25 },
      loading: false,
    })
    getPeriodReport.mockResolvedValue(report)

    const { result } = renderHook(() => useReports(), { wrapper })

    await waitFor(() => expect(result.current.report).toEqual(report))

    expect(getPeriodReport).toHaveBeenCalledWith(
      'profile-1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      25,
    )
  })

  it('surfaces a query error', async () => {
    useProfile.mockReturnValue({
      profile: { id: 'profile-1', budgetPeriodStartDay: 1 },
      loading: false,
    })
    getPeriodReport.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useReports(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.report).toBeNull()
  })
})
