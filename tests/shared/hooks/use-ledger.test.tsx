// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { household } from '../../helpers/household.ts'

const { useProfile, useHouseholds } = vi.hoisted(() => ({
  useProfile: vi.fn(),
  useHouseholds: vi.fn(),
}))

vi.mock('#/shared/hooks/use-profile', () => ({ useProfile }))
vi.mock('#/shared/hooks/use-households', () => ({ useHouseholds }))

const { useLedger } = await import('#/shared/hooks/use-ledger.ts')

const flat = household({
  id: 'flat',
  periodStartDay: 25,
  timeZone: 'Pacific/Kiritimati',
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('useLedger', () => {
  it('has no ledger while the profile or Households are loading', () => {
    useProfile.mockReturnValue({ profile: null, loading: true })
    useHouseholds.mockReturnValue({ active: null, loading: true })

    const { result } = renderHook(() => useLedger())

    expect(result.current.ledger).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it("scopes to the active Household and uses its settings, not the profile's", () => {
    useProfile.mockReturnValue({
      profile: { id: 'profile-1', currency: 'USD', budgetPeriodStartDay: 1 },
      loading: false,
    })
    useHouseholds.mockReturnValue({ active: flat, loading: false })

    const { result } = renderHook(() => useLedger())

    expect(result.current).toMatchObject({
      ledger: {
        householdId: 'flat',
        profileId: 'profile-1',
        currency: 'AUD',
        periodStartDay: 25,
        timeZone: 'Pacific/Kiritimati',
      },
      loading: false,
    })
  })

  it("takes today from the Household's time zone", () => {
    // 10:30 UTC on the 10th is already the 11th at UTC+14.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-03-10T10:30:00Z'))
    useProfile.mockReturnValue({ profile: { id: 'profile-1' }, loading: false })
    useHouseholds.mockReturnValue({ active: flat, loading: false })

    const { result } = renderHook(() => useLedger())

    expect(result.current.today).toBe('2026-03-11')
  })

  it('falls back to the device zone for a Household with none recorded', () => {
    useProfile.mockReturnValue({ profile: { id: 'profile-1' }, loading: false })
    useHouseholds.mockReturnValue({
      active: { ...flat, timeZone: null },
      loading: false,
    })

    const { result } = renderHook(() => useLedger())

    expect(result.current.ledger?.timeZone).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    )
  })

  it('keeps the same ledger object across renders so effects do not re-fire', () => {
    useProfile.mockReturnValue({ profile: { id: 'profile-1' }, loading: false })
    useHouseholds.mockReturnValue({ active: flat, loading: false })

    const { result, rerender } = renderHook(() => useLedger())
    const first = result.current.ledger
    rerender()

    expect(result.current.ledger).toBe(first)
  })
})
