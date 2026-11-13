import { describe, expect, it, vi } from 'vitest'
import { HouseholdService } from '#/features/households/services/household-service.ts'
import type { IHouseholdRepository } from '#/data/households/IHouseholdRepository.ts'
import {
  defaultPermissions,
  fakeHouseholdRepo,
  household,
  member,
} from '../../../helpers/household.ts'
import type { CreateHouseholdInput } from '#/features/households/schemas/household.schema.ts'

const personal = household({
  id: 'personal',
  name: 'Personal',
  isPersonal: true,
  role: 'admin',
})
const flat = household({ id: 'flat', name: 'Flat' })
const family = household({ id: 'family', name: 'Family' })

function makeFakeRepo(overrides: Partial<IHouseholdRepository> = {}) {
  return fakeHouseholdRepo({
    listForProfile: vi.fn(async (_profileId: string) => [
      flat,
      personal,
      family,
    ]),
    ...overrides,
  })
}

const validInput: CreateHouseholdInput = {
  name: 'Flat',
  currency: 'AUD',
  periodStartDay: 25,
  timeZone: 'Pacific/Auckland',
}

describe('HouseholdService', () => {
  describe('list', () => {
    it('puts the Personal household first, then groups by name', async () => {
      const repo = makeFakeRepo()

      const result = await new HouseholdService(repo).list('profile-1')

      expect(repo.listForProfile).toHaveBeenCalledWith('profile-1')
      expect(result.map((h) => h.id)).toEqual(['personal', 'family', 'flat'])
    })
  })

  describe('create', () => {
    it('passes validated input to the repository and returns the new id', async () => {
      const repo = makeFakeRepo()

      const id = await new HouseholdService(repo).create({
        ...validInput,
        name: '  Flat  ',
      })

      expect(id).toBe('new-house')
      expect(repo.create).toHaveBeenCalledWith(validInput)
    })

    it.each([
      ['a blank name', { name: '   ' }, 'Give the group a name'],
      ['an unsupported currency', { currency: 'XXX' }, 'Select a currency'],
      [
        'a start day past the 28th',
        { periodStartDay: 29 },
        'Day must be between 1 and 28',
      ],
      [
        'an unknown time zone',
        { timeZone: 'Mars/Olympus' },
        'Select a time zone',
      ],
    ])('rejects %s and never hits the repo', async (_label, patch, message) => {
      const repo = makeFakeRepo()

      await expect(
        new HouseholdService(repo).create({
          ...validInput,
          ...patch,
        } as CreateHouseholdInput),
      ).rejects.toThrow(message)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('resolveActive', () => {
    const service = new HouseholdService(makeFakeRepo())
    const all = [personal, family, flat]

    it('uses the remembered Household while the user still belongs to it', () => {
      expect(service.resolveActive(all, 'flat')).toBe(flat)
    })

    it('falls back to Personal when nothing is remembered', () => {
      expect(service.resolveActive(all, null)).toBe(personal)
    })

    it('ignores a remembered Household the user is no longer in', () => {
      expect(service.resolveActive(all, 'left-long-ago')).toBe(personal)
    })

    it('is null before any Household has loaded', () => {
      expect(service.resolveActive([], 'flat')).toBeNull()
    })
  })

  describe('updateSettings', () => {
    const settings = { ...validInput, permissions: defaultPermissions }

    it('saves validated settings for that Household', async () => {
      const repo = makeFakeRepo()

      await new HouseholdService(repo).updateSettings('flat', {
        ...settings,
        name: '  Flat  ',
      })

      expect(repo.updateSettings).toHaveBeenCalledWith('flat', settings)
    })

    it('rejects a blank name and never hits the repo', async () => {
      const repo = makeFakeRepo()

      await expect(
        new HouseholdService(repo).updateSettings('flat', {
          ...settings,
          name: ' ',
        }),
      ).rejects.toThrow('Give the group a name')
      expect(repo.updateSettings).not.toHaveBeenCalled()
    })
  })

  describe('activeMembers', () => {
    it('drops former members and puts the Admin first, then by join date', () => {
      const admin = member({
        profileId: 'admin',
        role: 'admin',
        joinedAt: '2026-11-03T00:00:00.000Z',
      })
      const early = member({
        profileId: 'early',
        joinedAt: '2026-11-01T00:00:00.000Z',
      })
      const late = member({
        profileId: 'late',
        joinedAt: '2026-11-04T00:00:00.000Z',
      })
      const gone = member({
        profileId: 'gone',
        leftAt: '2026-11-05T00:00:00.000Z',
      })
      const service = new HouseholdService(makeFakeRepo())

      const members = service.activeMembers([late, gone, early, admin])

      expect(members.map((m) => m.profileId)).toEqual([
        'admin',
        'early',
        'late',
      ])
    })
  })

  describe('listPeople', () => {
    it('returns everyone, former members included', async () => {
      const gone = member({ leftAt: '2026-11-05T00:00:00.000Z' })
      const repo = makeFakeRepo({ listPeople: vi.fn(async () => [gone]) })

      expect(await new HouseholdService(repo).listPeople('flat')).toEqual([
        gone,
      ])
      expect(repo.listPeople).toHaveBeenCalledWith('flat')
    })
  })

  describe('authorLabel', () => {
    const service = new HouseholdService(makeFakeRepo())
    const people = [
      member({ profileId: 'me', displayName: 'Alex' }),
      member({ profileId: 'sam', displayName: 'Sam' }),
      member({
        profileId: 'gone',
        displayName: 'Jo',
        leftAt: '2026-11-05T00:00:00.000Z',
      }),
      member({ profileId: 'blank', displayName: '  ' }),
    ]

    it('names another member', () => {
      expect(service.authorLabel(people, { createdBy: 'sam' }, 'me')).toBe(
        'Sam',
      )
    })

    it("calls the viewer's own entries You", () => {
      expect(service.authorLabel(people, { createdBy: 'me' }, 'me')).toBe('You')
    })

    it('keeps the name of someone who has left', () => {
      expect(service.authorLabel(people, { createdBy: 'gone' }, 'me')).toBe(
        'Jo',
      )
    })

    it('labels an auto-posted entry Recurring', () => {
      expect(service.authorLabel(people, { createdBy: null }, 'me')).toBe(
        'Recurring',
      )
    })

    it('credits an auto-posted entry to the owner of its recurring item', () => {
      expect(
        service.authorLabel(
          people,
          { createdBy: null, recurringOwnerId: 'sam' },
          'me',
        ),
      ).toBe('Sam · recurring')
      expect(
        service.authorLabel(
          people,
          { createdBy: null, recurringOwnerId: 'me' },
          'me',
        ),
      ).toBe('You · recurring')
    })

    it('falls back to Recurring when the owner cannot be placed', () => {
      expect(
        service.authorLabel(
          people,
          { createdBy: null, recurringOwnerId: 'stranger' },
          'me',
        ),
      ).toBe('Recurring')
    })

    it('still labels a member with no display name', () => {
      expect(service.authorLabel(people, { createdBy: 'blank' }, 'me')).toBe(
        'Unnamed member',
      )
    })

    it('shows nothing for an author it cannot place', () => {
      expect(
        service.authorLabel(people, { createdBy: 'stranger' }, 'me'),
      ).toBeNull()
    })
  })

  describe('canInvite', () => {
    const service = new HouseholdService(makeFakeRepo())

    it('lets the Admin of a group invite', () => {
      expect(service.canInvite(household({ role: 'admin' }))).toBe(true)
    })

    it('lets a Contributor invite only when the group allows it', () => {
      expect(service.canInvite(household())).toBe(false)
      expect(
        service.canInvite(
          household({
            permissions: { ...defaultPermissions, contributorsCanInvite: true },
          }),
        ),
      ).toBe(true)
    })

    it('never offers invites for a Personal household', () => {
      expect(service.canInvite(personal)).toBe(false)
    })
  })

  describe('membership and invites', () => {
    it('passes each call straight to the repository', async () => {
      const repo = makeFakeRepo()
      const service = new HouseholdService(repo)

      await service.removeMember('flat', 'profile-2')
      await service.transferAdmin('flat', 'profile-2')
      await service.leave('flat', true)
      await service.listPendingInvites('flat')
      await service.revokeInvite('invite-1')

      expect(repo.removeMember).toHaveBeenCalledWith('flat', 'profile-2')
      expect(repo.transferAdmin).toHaveBeenCalledWith('flat', 'profile-2')
      expect(repo.leave).toHaveBeenCalledWith('flat', true)
      expect(repo.listPendingInvites).toHaveBeenCalledWith('flat')
      expect(repo.revokeInvite).toHaveBeenCalledWith('invite-1')
      expect(await service.createInvite('flat')).toMatchObject({ token: 'tok' })
      expect(await service.previewInvite('tok')).toMatchObject({
        householdName: 'Flat',
      })
      expect(await service.acceptInvite('tok')).toBe('house-1')
    })
  })
})
