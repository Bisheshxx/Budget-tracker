import { vi } from 'vitest'
import type { IHouseholdRepository } from '#/data/households/IHouseholdRepository.ts'
import type {
  Household,
  HouseholdPermissions,
} from '#/shared/types/household.type.ts'
import type { HouseholdMember } from '#/features/households/types/household.type.ts'

// Fixtures for Household tests. The permissions match the database defaults.
export const defaultPermissions: HouseholdPermissions = {
  contributorsCanEditOthers: true,
  contributorsCanDeleteOthers: false,
  contributorsCanManageCategories: true,
  contributorsCanInvite: false,
}

/** A group the user is a Contributor of, unless overridden. */
export function household(overrides: Partial<Household> = {}): Household {
  return {
    id: 'house-1',
    name: 'Flat',
    isPersonal: false,
    currency: 'AUD',
    periodStartDay: 1,
    timeZone: 'Pacific/Auckland',
    role: 'contributor',
    permissions: defaultPermissions,
    ...overrides,
  }
}

/** An active Contributor, unless overridden. */
export function member(
  overrides: Partial<HouseholdMember> = {},
): HouseholdMember {
  return {
    profileId: 'profile-2',
    displayName: 'Sam',
    avatarUrl: null,
    role: 'contributor',
    joinedAt: '2026-11-01T00:00:00.000Z',
    leftAt: null,
    ...overrides,
  }
}

/** A whole repository of spies; override the calls a test cares about. */
export function fakeHouseholdRepo(
  overrides: Partial<IHouseholdRepository> = {},
) {
  return {
    listForProfile: vi.fn(
      async (_profileId: string): Promise<Household[]> => [],
    ),
    create: vi.fn(async () => 'new-house'),
    updateSettings: vi.fn(async () => {}),
    listPeople: vi.fn(async (): Promise<HouseholdMember[]> => []),
    removeMember: vi.fn(async () => {}),
    transferAdmin: vi.fn(async () => {}),
    leave: vi.fn(async () => {}),
    listPendingInvites: vi.fn(async () => []),
    createInvite: vi.fn(async () => ({
      id: 'invite-1',
      token: 'tok',
      expiresAt: '2026-11-20T00:00:00.000Z',
    })),
    revokeInvite: vi.fn(async () => {}),
    previewInvite: vi.fn(async () => ({
      householdId: 'house-1',
      householdName: 'Flat',
      invitedBy: 'Alex',
      expiresAt: '2026-11-20T00:00:00.000Z',
    })),
    acceptInvite: vi.fn(async () => 'house-1'),
    ...overrides,
  } satisfies IHouseholdRepository
}
