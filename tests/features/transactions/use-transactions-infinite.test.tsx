// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { resolvePeriod, todayYmd } from '#/shared/period.ts'
import type { ReactNode } from 'react'
import type { Transaction } from '#/features/transactions/types.ts'

// Mock the profile hook and the service singleton so the hook is exercised
// without Supabase; the cursor logic (nextPageCursor) runs for real.
const { useProfile } = vi.hoisted(() => ({ useProfile: vi.fn() }))
const { listPage } = vi.hoisted(() => ({ listPage: vi.fn() }))

vi.mock('#/features/profile/use-profile', () => ({ useProfile }))
vi.mock('#/features/transactions', () => ({
  transactionService: { listPage },
}))

const { useTransactionsInfinite } =
  await import('#/features/transactions/use-transactions.ts')

const PAGE_SIZE = 25

// Build a transaction with only the fields the hook and cursor read.
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

// Each test gets a fresh QueryClient (retries off) so failures surface fast.
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return createElement(QueryClientProvider, { client }, children)
}

function mockProfile() {
  useProfile.mockReturnValue({
    profile: { id: 'profile-1', budgetPeriodStartDay: 25 },
    loading: false,
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useTransactionsInfinite', () => {
  it('stays loading and never queries until the profile resolves', () => {
    useProfile.mockReturnValue({ profile: null, loading: true })

    const { result } = renderHook(() => useTransactionsInfinite(), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.transactions).toEqual([])
    expect(listPage).not.toHaveBeenCalled()
  })

  it('defaults the first page to the current Period window, no cursor', async () => {
    mockProfile()
    listPage.mockResolvedValue([tx('a', '2026-06-24')])

    const { result } = renderHook(() => useTransactionsInfinite(), { wrapper })

    await waitFor(() => expect(result.current.transactions).toHaveLength(1))

    // The window is the Period resolved from the profile's start day — the same
    // range the "This Period" card shows.
    const period = resolvePeriod(todayYmd(), 25)
    expect(listPage).toHaveBeenCalledWith('profile-1', {
      from: period.start,
      to: period.end,
      limit: PAGE_SIZE,
      cursor: undefined,
    })
  })

  it('queries with explicit Range bounds when given, instead of the Period', async () => {
    mockProfile()
    listPage.mockResolvedValue([])

    renderHook(
      () => useTransactionsInfinite({ from: '2026-01-03', to: '2026-03-19' }),
      { wrapper },
    )

    await waitFor(() => expect(listPage).toHaveBeenCalled())
    expect(listPage).toHaveBeenCalledWith('profile-1', {
      from: '2026-01-03',
      to: '2026-03-19',
      limit: PAGE_SIZE,
      cursor: undefined,
    })
  })

  it('threads the keyset cursor into the next page and flattens pages', async () => {
    mockProfile()
    // A full first page (so there IS a next page) ending at row-24/2026-06-10,
    // then a short second page (the last one).
    const page1 = Array.from({ length: PAGE_SIZE }, (_, i) =>
      tx(`row-${i}`, i < PAGE_SIZE - 1 ? '2026-06-20' : '2026-06-10'),
    )
    const page2 = [tx('older-1', '2026-06-05')]
    listPage.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2)

    const { result } = renderHook(
      () => useTransactionsInfinite({ from: '2026-06-01', to: '2026-07-01' }),
      { wrapper },
    )

    await waitFor(() =>
      expect(result.current.transactions).toHaveLength(PAGE_SIZE),
    )
    expect(result.current.hasNextPage).toBe(true)

    result.current.fetchNextPage()

    await waitFor(() =>
      expect(result.current.transactions).toHaveLength(PAGE_SIZE + 1),
    )
    // The second request resumes from the first page's last row.
    expect(listPage).toHaveBeenLastCalledWith('profile-1', {
      from: '2026-06-01',
      to: '2026-07-01',
      limit: PAGE_SIZE,
      cursor: { transactionDate: '2026-06-10', id: 'row-24' },
    })
    // Pages flatten in order, and a short page ends the paging.
    expect(result.current.transactions.at(-1)?.id).toBe('older-1')
    expect(result.current.hasNextPage).toBe(false)
  })
})
