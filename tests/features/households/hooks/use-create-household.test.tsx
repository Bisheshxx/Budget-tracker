// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { queryKeys } from '#/shared/lib/query-keys.ts'
import { createQueryHarness } from '../../../helpers/query-client.ts'
import type { CreateHouseholdInput } from '#/features/households/schemas/household.schema.ts'

const { useProfile, create } = vi.hoisted(() => ({
  useProfile: vi.fn(),
  create: vi.fn(),
}))

vi.mock('#/shared/hooks/use-profile', () => ({ useProfile }))
vi.mock('#/features/households', () => ({ householdService: { create } }))

const { useCreateHousehold } =
  await import('#/features/households/hooks/use-create-household.ts')

const input: CreateHouseholdInput = {
  name: 'Flat',
  currency: 'AUD',
  periodStartDay: 25,
  timeZone: 'Pacific/Auckland',
}
const listKey = queryKeys.households.list('profile-1')
const storedActive = () =>
  window.localStorage.getItem('budget:active-household:profile-1')

afterEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe('useCreateHousehold', () => {
  it('creates the group, refreshes the list and switches to it', async () => {
    useProfile.mockReturnValue({ profile: { id: 'profile-1' } })
    create.mockResolvedValue('house-9')
    const harness = createQueryHarness()
    harness.seed(listKey)

    const { result } = renderHook(() => useCreateHousehold(), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync(input)

    expect(create).toHaveBeenCalledWith(input)
    expect(harness.isStale(listKey)).toBe(true)
    expect(storedActive()).toBe('house-9')
  })

  it("leaves other profiles' lists alone", async () => {
    useProfile.mockReturnValue({ profile: { id: 'profile-1' } })
    create.mockResolvedValue('house-9')
    const harness = createQueryHarness()
    const otherKey = queryKeys.households.list('profile-2')
    harness.seed(otherKey)

    const { result } = renderHook(() => useCreateHousehold(), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync(input)

    expect(harness.isStale(otherKey)).toBe(false)
  })

  it('does not switch or refresh when creation fails', async () => {
    useProfile.mockReturnValue({ profile: { id: 'profile-1' } })
    create.mockRejectedValue(new Error('Unknown time zone'))
    const harness = createQueryHarness()
    harness.seed(listKey)

    const { result } = renderHook(() => useCreateHousehold(), {
      wrapper: harness.wrapper,
    })

    await expect(result.current.mutateAsync(input)).rejects.toThrow(
      'Unknown time zone',
    )
    expect(harness.isStale(listKey)).toBe(false)
    expect(storedActive()).toBeNull()
  })
})
