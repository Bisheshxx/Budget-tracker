// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createQueryHarness } from '../../helpers/query-client.ts'
import { household, member } from '../../helpers/household.ts'

const { useHouseholds, useProfile, listPeople } = vi.hoisted(() => ({
  useHouseholds: vi.fn(),
  useProfile: vi.fn(),
  listPeople: vi.fn(),
}))

vi.mock('#/shared/hooks/use-households', () => ({ useHouseholds }))
vi.mock('#/shared/hooks/use-profile', () => ({ useProfile }))
// Fake the data call, keep the real labelling rule.
vi.mock('#/features/households', async () => {
  const { HouseholdService } =
    await import('#/features/households/services/household-service.ts')
  const { fakeHouseholdRepo } = await import('../../helpers/household.ts')
  const real = new HouseholdService(fakeHouseholdRepo())
  return {
    householdService: {
      listPeople,
      authorLabel: real.authorLabel.bind(real),
    },
  }
})

const { useEntryAuthors } = await import('#/shared/hooks/use-entry-authors.ts')

function setup(active: ReturnType<typeof household> | null) {
  useHouseholds.mockReturnValue({ active })
  useProfile.mockReturnValue({ profile: { id: 'profile-1' } })
  const harness = createQueryHarness()
  return renderHook(() => useEntryAuthors(), { wrapper: harness.wrapper })
}

afterEach(() => vi.clearAllMocks())

describe('useEntryAuthors', () => {
  it('names who added an entry in a group', async () => {
    listPeople.mockResolvedValue([
      member({ profileId: 'profile-1', displayName: 'Alex' }),
      member({ profileId: 'profile-2', displayName: 'Sam' }),
    ])

    const { result } = setup(household({ id: 'flat' }))

    await waitFor(() =>
      expect(result.current.authorOf({ createdBy: 'profile-2' })).toBe('Sam'),
    )
    expect(result.current.authorOf({ createdBy: 'profile-1' })).toBe('You')
    expect(result.current.authorOf({ createdBy: null })).toBe('Recurring')
    expect(
      result.current.authorOf({
        createdBy: null,
        recurringOwnerId: 'profile-2',
      }),
    ).toBe('Sam · recurring')
    expect(listPeople).toHaveBeenCalledWith('flat')
  })

  it('shows no authors in a Personal household and fetches nothing', () => {
    const { result } = setup(household({ isPersonal: true, role: 'admin' }))

    expect(result.current.authorOf({ createdBy: 'profile-1' })).toBeNull()
    expect(result.current.authorOf({ createdBy: null })).toBeNull()
    expect(listPeople).not.toHaveBeenCalled()
  })

  it('shows no authors before the active Household has loaded', () => {
    const { result } = setup(null)

    expect(result.current.authorOf({ createdBy: 'profile-2' })).toBeNull()
    expect(listPeople).not.toHaveBeenCalled()
  })
})
