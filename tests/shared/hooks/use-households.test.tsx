// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createQueryHarness } from '../../helpers/query-client.ts'
import { household } from '../../helpers/household.ts'

const { useProfile, list } = vi.hoisted(() => ({
  useProfile: vi.fn(),
  list: vi.fn(),
}))

vi.mock('#/shared/hooks/use-profile', () => ({ useProfile }))
// Fake the data call, keep the real "which one is active" rule.
vi.mock('#/features/households', async () => {
  const { HouseholdService } =
    await import('#/features/households/services/household-service.ts')
  const { fakeHouseholdRepo } = await import('../../helpers/household.ts')
  const real = new HouseholdService(fakeHouseholdRepo())
  return {
    householdService: { list, resolveActive: real.resolveActive.bind(real) },
  }
})

const { useHouseholds } = await import('#/shared/hooks/use-households.ts')

const personal = household({
  id: 'personal',
  name: 'Personal',
  isPersonal: true,
  role: 'admin',
})
const flat = household({ id: 'flat', name: 'Flat' })

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

function renderHouseholds() {
  return renderHook(() => useHouseholds(), {
    wrapper: createQueryHarness().wrapper,
  })
}

function signedIn() {
  useProfile.mockReturnValue({ profile: { id: 'profile-1' }, loading: false })
  list.mockResolvedValue([personal, flat])
}

describe('useHouseholds', () => {
  it('does not fetch until the profile is known', () => {
    useProfile.mockReturnValue({ profile: null, loading: true })

    const { result } = renderHouseholds()

    expect(result.current).toMatchObject({
      households: [],
      active: null,
      loading: true,
    })
    expect(list).not.toHaveBeenCalled()
  })

  it("lists the profile's Households and defaults to Personal", async () => {
    signedIn()

    const { result } = renderHouseholds()

    await waitFor(() => expect(result.current.active).toEqual(personal))
    expect(list).toHaveBeenCalledWith('profile-1')
    expect(result.current.households).toEqual([personal, flat])
    expect(result.current.loading).toBe(false)
  })

  it('switches the active Household and remembers it for the profile', async () => {
    signedIn()
    const { result } = renderHouseholds()
    await waitFor(() => expect(result.current.active).toEqual(personal))

    act(() => result.current.setActive('flat'))

    expect(result.current.active).toEqual(flat)
    expect(
      window.localStorage.getItem('budget:active-household:profile-1'),
    ).toBe('flat')
  })

  it('restores the remembered Household on a later visit', async () => {
    window.localStorage.setItem('budget:active-household:profile-1', 'flat')
    signedIn()

    const { result } = renderHouseholds()

    await waitFor(() => expect(result.current.active).toEqual(flat))
  })

  it("never activates another profile's remembered Household", async () => {
    window.localStorage.setItem('budget:active-household:profile-2', 'flat')
    signedIn()

    const { result } = renderHouseholds()

    await waitFor(() => expect(result.current.active).toEqual(personal))
  })

  it('falls back to Personal when the remembered group is gone', async () => {
    window.localStorage.setItem('budget:active-household:profile-1', 'removed')
    signedIn()

    const { result } = renderHouseholds()

    await waitFor(() => expect(result.current.active).toEqual(personal))
  })
})
