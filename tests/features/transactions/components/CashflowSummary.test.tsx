// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { PeriodSummary } from '#/features/transactions/types.ts'
import type { Category } from '#/features/categories/types.ts'

// Mock the three hooks the component reads so it renders in isolation — no
// QueryClient, no Supabase. vi.hoisted keeps the spies reachable in the
// factories.
const { usePeriodSummary } = vi.hoisted(() => ({ usePeriodSummary: vi.fn() }))
const { useProfile } = vi.hoisted(() => ({ useProfile: vi.fn() }))
const { useCategories } = vi.hoisted(() => ({ useCategories: vi.fn() }))

vi.mock('#/features/transactions/use-transactions', () => ({
  usePeriodSummary,
}))
vi.mock('#/features/profile/use-profile', () => ({ useProfile }))
vi.mock('#/features/categories/use-categories', () => ({ useCategories }))

const { CashflowSummary } =
  await import('#/features/transactions/components/CashflowSummary.tsx')
const { formatRangeLabel } = await import('#/features/transactions/range.ts')

const food: Category = {
  id: 'food',
  userId: 'profile-1',
  name: 'Food',
  colorHex: '#abcabc',
  icon: null,
  isSystem: false,
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}
const uncategorized: Category = {
  id: 'uncat',
  userId: null,
  name: 'Uncategorized',
  colorHex: '#cccccc',
  icon: null,
  isSystem: true,
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const summary: PeriodSummary = {
  incomeCents: 100000,
  expensesCents: 35000,
  netCents: 65000,
  byCategory: [
    { categoryId: 'food', amountCents: 30000 },
    { categoryId: null, amountCents: 5000 },
  ],
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-11T12:00:00.000Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('CashflowSummary', () => {
  it('shows a loading state and hides the day count until the summary resolves', () => {
    usePeriodSummary.mockReturnValue({
      summary: null,
      daysIntoPeriod: 1,
      loading: true,
      isError: false,
      error: null,
    })
    useProfile.mockReturnValue({ profile: null })
    useCategories.mockReturnValue({ categories: [] })

    render(<CashflowSummary />)

    expect(screen.getByText('Loading…')).toBeDefined()
    expect(screen.queryByText(/of July/)).toBeNull()
  })

  it('renders income, expenses, remaining from income, the day count, and the category breakdown', () => {
    usePeriodSummary.mockReturnValue({
      summary,
      daysIntoPeriod: 20,
      loading: false,
      isError: false,
      error: null,
    })
    useProfile.mockReturnValue({
      profile: { currency: 'USD', monthlyBudgetTargetCents: 200000 },
    })
    useCategories.mockReturnValue({ categories: [food, uncategorized] })

    render(<CashflowSummary />)

    expect(screen.getByText('Day 20 of July')).toBeDefined()
    expect(screen.getByText('Income in')).toBeDefined()
    expect(screen.getByText('Expenses out')).toBeDefined()
    expect(screen.getByText('Remaining from income')).toBeDefined()
    // Totals render through formatMoney.
    expect(screen.getByText('+$1,000.00')).toBeDefined()
    expect(screen.getByText('+$650.00')).toBeDefined()
    // Breakdown resolves the category name and the null bucket → Uncategorized.
    expect(screen.getByText('Food')).toBeDefined()
    expect(screen.getByText('Uncategorized')).toBeDefined()
    // Each category shows its share of total spend: 30000/35000 → 86%,
    // 5000/35000 → 14%.
    expect(screen.getByText('86%')).toBeDefined()
    expect(screen.getByText('14%')).toBeDefined()
    expect(screen.queryByText('Budget Target')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('shows the empty-breakdown message when there are no expenses', () => {
    usePeriodSummary.mockReturnValue({
      summary: {
        incomeCents: 0,
        expensesCents: 0,
        netCents: 0,
        byCategory: [],
      },
      daysIntoPeriod: 5,
      loading: false,
      isError: false,
      error: null,
    })
    useProfile.mockReturnValue({
      profile: { currency: 'USD', monthlyBudgetTargetCents: 0 },
    })
    useCategories.mockReturnValue({ categories: [] })

    render(<CashflowSummary />)

    expect(screen.getByText('No expenses yet in July.')).toBeDefined()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('retitles to the Range and hides the Budget Target when a range is active', () => {
    usePeriodSummary.mockReturnValue({
      summary,
      daysIntoPeriod: 20,
      loading: false,
      isError: false,
      error: null,
    })
    useProfile.mockReturnValue({
      profile: { currency: 'USD', monthlyBudgetTargetCents: 200000 },
    })
    useCategories.mockReturnValue({ categories: [food, uncategorized] })

    const range = { from: '2026-01-03', to: '2026-03-18' }
    render(<CashflowSummary range={range} />)

    // Title and filter button both show the formatted Range; the Period day
    // count is gone.
    expect(screen.getAllByText(formatRangeLabel(range))).toHaveLength(2)
    expect(screen.queryByText('July')).toBeNull()
    expect(screen.queryByText(/of July/)).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
    // Cashflow totals + breakdown still render.
    expect(screen.getByText('Income in')).toBeDefined()
    expect(screen.getByText('Food')).toBeDefined()
  })
})
