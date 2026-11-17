// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { queryKeys } from '#/shared/lib/query-keys.ts'
import { createQueryHarness } from '../../../helpers/query-client.ts'
import { member } from '../../../helpers/household.ts'

const { householdService } = vi.hoisted(() => ({
  householdService: {
    listPeople: vi.fn(),
    activeMembers: vi.fn(),
    removeMember: vi.fn(),
    transferAdmin: vi.fn(),
    leave: vi.fn(),
  },
}))

vi.mock('#/features/households', () => ({ householdService }))

const { useHouseholdMembers, useMembershipMutations } =
  await import('#/features/households/hooks/use-household-members.ts')

const peopleKey = queryKeys.households.people('house-1')
const otherPeopleKey = queryKeys.households.people('house-2')
const listKey = queryKeys.households.list('profile-1')

function setup() {
  const harness = createQueryHarness()
  harness.seed(peopleKey, otherPeopleKey, listKey)
  const { result } = renderHook(() => useMembershipMutations('house-1'), {
    wrapper: harness.wrapper,
  })
  return { harness, result }
}

afterEach(() => vi.clearAllMocks())

describe('useHouseholdMembers', () => {
  it("loads that Household's people and narrows them to active members", async () => {
    const gone = member({ profileId: 'gone', leftAt: '2026-11-05T00:00:00Z' })
    householdService.listPeople.mockResolvedValue([member(), gone])
    householdService.activeMembers.mockReturnValue([member()])
    const harness = createQueryHarness()

    const { result } = renderHook(() => useHouseholdMembers('house-1'), {
      wrapper: harness.wrapper,
    })

    await waitFor(() => expect(result.current.data).toEqual([member()]))
    expect(householdService.listPeople).toHaveBeenCalledWith('house-1')
    expect(householdService.activeMembers).toHaveBeenCalledWith([
      member(),
      gone,
    ])
    // The cache keeps everyone, so author names can reuse it.
    expect(harness.client.getQueryData(peopleKey)).toEqual([member(), gone])
  })
})

describe('useMembershipMutations', () => {
  it("removing someone refreshes only this Household's member list", async () => {
    householdService.removeMember.mockResolvedValue(undefined)
    const { harness, result } = setup()

    await result.current.remove.mutateAsync('profile-2')

    expect(householdService.removeMember).toHaveBeenCalledWith(
      'house-1',
      'profile-2',
    )
    expect(harness.isStale(peopleKey)).toBe(true)
    expect(harness.isStale(otherPeopleKey)).toBe(false)
    expect(harness.isStale(listKey)).toBe(false)
  })

  it("handing over the Admin role also refreshes the user's own roles", async () => {
    householdService.transferAdmin.mockResolvedValue(undefined)
    const { harness, result } = setup()

    await result.current.transferAdmin.mutateAsync('profile-2')

    expect(householdService.transferAdmin).toHaveBeenCalledWith(
      'house-1',
      'profile-2',
    )
    expect(harness.isStale(peopleKey)).toBe(true)
    expect(harness.isStale(listKey)).toBe(true)
  })

  it('leaving refreshes the Household list so the group disappears', async () => {
    householdService.leave.mockResolvedValue(undefined)
    const { harness, result } = setup()

    await result.current.leave.mutateAsync(true)

    expect(householdService.leave).toHaveBeenCalledWith('house-1', true)
    expect(harness.isStale(listKey)).toBe(true)
  })

  it('refreshes nothing when the change is refused', async () => {
    householdService.removeMember.mockRejectedValue(new Error('nope'))
    const { harness, result } = setup()

    await expect(
      result.current.remove.mutateAsync('profile-2'),
    ).rejects.toThrow('nope')
    expect(harness.isStale(peopleKey)).toBe(false)
  })
})
