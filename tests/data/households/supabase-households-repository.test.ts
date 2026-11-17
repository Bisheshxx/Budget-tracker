import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, postgrestError } from '../../helpers/fake-supabase.ts'

vi.mock('#/lib/supabase.ts', async () => ({
  supabase: (await import('../../helpers/fake-supabase.ts')).fakeSupabase
    .client,
}))

const { SupabaseHouseholdRepository } =
  await import('#/data/households/supabase-households-repository.ts')

const householdRow = {
  id: 'house-1',
  name: 'Flat',
  personal_owner_id: null,
  currency: 'NZD',
  period_start_day: 25,
  time_zone: 'Pacific/Auckland',
  contributors_can_edit_others: true,
  contributors_can_delete_others: false,
  contributors_can_manage_categories: true,
  contributors_can_invite: false,
  created_by: 'profile-1',
  created_at: '2026-11-12T00:00:00.000Z',
}

const permissions = {
  contributorsCanEditOthers: true,
  contributorsCanDeleteOthers: false,
  contributorsCanManageCategories: true,
  contributorsCanInvite: false,
}

beforeEach(() => fakeSupabase.reset())

describe('SupabaseHouseholdRepository', () => {
  describe('listForProfile', () => {
    it("reads the profile's active memberships and maps each to a Household", async () => {
      fakeSupabase.enqueue({
        data: [
          { role: 'contributor', households: householdRow },
          {
            role: 'admin',
            households: {
              ...householdRow,
              id: 'house-2',
              name: 'Personal',
              personal_owner_id: 'profile-1',
              time_zone: null,
            },
          },
        ],
      })

      const result = await new SupabaseHouseholdRepository().listForProfile(
        'profile-1',
      )

      expect(result).toEqual([
        {
          id: 'house-1',
          name: 'Flat',
          isPersonal: false,
          currency: 'NZD',
          periodStartDay: 25,
          timeZone: 'Pacific/Auckland',
          role: 'contributor',
          permissions,
        },
        {
          id: 'house-2',
          name: 'Personal',
          isPersonal: true,
          currency: 'NZD',
          periodStartDay: 25,
          timeZone: null,
          role: 'admin',
          permissions,
        },
      ])
      expect(fakeSupabase.queries[0].table).toBe('household_members')
      // Scoped to this profile's own rows, and never an ended membership.
      expect(fakeSupabase.argsOf(0, 'eq')).toEqual([
        ['profile_id', 'profile-1'],
      ])
      expect(fakeSupabase.argsOf(0, 'is')).toEqual([['left_at', null]])
    })

    it('translates a Supabase failure into a DataError', async () => {
      fakeSupabase.enqueue({ error: postgrestError('42501', 'denied') })

      await expect(
        new SupabaseHouseholdRepository().listForProfile('profile-1'),
      ).rejects.toMatchObject({ name: 'DataError', code: 'forbidden' })
    })
  })

  describe('create', () => {
    const input = {
      name: 'Flat',
      currency: 'NZD',
      periodStartDay: 25,
      timeZone: 'Pacific/Auckland',
    }

    it('calls create_household and resolves to the new id', async () => {
      fakeSupabase.enqueue({ data: 'house-9' })

      const id = await new SupabaseHouseholdRepository().create(input)

      expect(id).toBe('house-9')
      expect(fakeSupabase.queries[0].table).toBe('rpc:create_household')
      // No user id is sent: the database takes the Admin from the token.
      expect(fakeSupabase.argsOf(0, 'rpc')).toEqual([
        [
          {
            p_name: 'Flat',
            p_currency: 'NZD',
            p_period_start_day: 25,
            p_time_zone: 'Pacific/Auckland',
          },
        ],
      ])
    })

    it('reports a rejected value (e.g. an unknown time zone) as invalid', async () => {
      fakeSupabase.enqueue({
        error: postgrestError('23514', 'Unknown time zone'),
      })

      await expect(
        new SupabaseHouseholdRepository().create(input),
      ).rejects.toMatchObject({
        name: 'DataError',
        code: 'invalid',
        message: 'Unknown time zone',
      })
    })
  })

  describe('updateSettings', () => {
    const settings = {
      name: 'Flat',
      currency: 'AUD',
      periodStartDay: 25,
      timeZone: 'Pacific/Auckland',
      permissions: { ...permissions, contributorsCanInvite: true },
    }

    it("updates that Household's settings and permission toggles", async () => {
      fakeSupabase.enqueue({ data: [{ id: 'house-1' }] })

      await new SupabaseHouseholdRepository().updateSettings(
        'house-1',
        settings,
      )

      expect(fakeSupabase.queries[0].table).toBe('households')
      expect(fakeSupabase.argsOf(0, 'update')).toEqual([
        [
          {
            name: 'Flat',
            currency: 'AUD',
            period_start_day: 25,
            time_zone: 'Pacific/Auckland',
            contributors_can_edit_others: true,
            contributors_can_delete_others: false,
            contributors_can_manage_categories: true,
            contributors_can_invite: true,
          },
        ],
      ])
      expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['id', 'house-1']])
    })

    it('reports forbidden when no row was updated (not the Admin)', async () => {
      fakeSupabase.enqueue({ data: [] })

      await expect(
        new SupabaseHouseholdRepository().updateSettings('house-1', settings),
      ).rejects.toMatchObject({ name: 'DataError', code: 'forbidden' })
    })

    it('translates a Supabase failure into a DataError', async () => {
      fakeSupabase.enqueue({
        error: postgrestError('23514', 'Unknown time zone'),
      })

      await expect(
        new SupabaseHouseholdRepository().updateSettings('house-1', settings),
      ).rejects.toMatchObject({ name: 'DataError', code: 'invalid' })
    })
  })

  describe('listPeople', () => {
    it('maps household_people rows to members', async () => {
      fakeSupabase.enqueue({
        data: [
          {
            profile_id: 'profile-2',
            display_name: 'Sam',
            avatar_url: null,
            role: 'contributor',
            joined_at: '2026-11-01T00:00:00.000Z',
            left_at: '2026-11-05T00:00:00.000Z',
          },
        ],
      })

      const people = await new SupabaseHouseholdRepository().listPeople(
        'house-1',
      )

      expect(people).toEqual([
        {
          profileId: 'profile-2',
          displayName: 'Sam',
          avatarUrl: null,
          role: 'contributor',
          joinedAt: '2026-11-01T00:00:00.000Z',
          leftAt: '2026-11-05T00:00:00.000Z',
        },
      ])
      expect(fakeSupabase.queries[0].table).toBe('rpc:household_people')
      expect(fakeSupabase.argsOf(0, 'rpc')).toEqual([
        [{ p_household_id: 'house-1' }],
      ])
    })

    it('reports a non-member as forbidden', async () => {
      fakeSupabase.enqueue({ error: postgrestError('42501') })

      await expect(
        new SupabaseHouseholdRepository().listPeople('house-1'),
      ).rejects.toMatchObject({ name: 'DataError', code: 'forbidden' })
    })
  })

  describe('membership changes', () => {
    it.each([
      [
        'removeMember',
        'remove_household_member',
        (r: InstanceType<typeof SupabaseHouseholdRepository>) =>
          r.removeMember('house-1', 'profile-2'),
        { p_household_id: 'house-1', p_profile_id: 'profile-2' },
      ],
      [
        'transferAdmin',
        'transfer_household_admin',
        (r: InstanceType<typeof SupabaseHouseholdRepository>) =>
          r.transferAdmin('house-1', 'profile-2'),
        { p_household_id: 'house-1', p_profile_id: 'profile-2' },
      ],
      [
        'leave',
        'leave_household',
        (r: InstanceType<typeof SupabaseHouseholdRepository>) =>
          r.leave('house-1', true),
        { p_household_id: 'house-1', p_delete_if_last: true },
      ],
      [
        'revokeInvite',
        'revoke_household_invite',
        (r: InstanceType<typeof SupabaseHouseholdRepository>) =>
          r.revokeInvite('invite-1'),
        { p_invite_id: 'invite-1' },
      ],
    ])('%s calls %s', async (_method, fn, call, args) => {
      fakeSupabase.enqueue({ data: null })

      await call(new SupabaseHouseholdRepository())

      expect(fakeSupabase.queries[0].table).toBe(`rpc:${fn}`)
      expect(fakeSupabase.argsOf(0, 'rpc')).toEqual([[args]])
    })

    it('passes a refusal through as a DataError with the database message', async () => {
      fakeSupabase.enqueue({
        error: postgrestError('42501', 'Only the admin can remove members'),
      })

      await expect(
        new SupabaseHouseholdRepository().removeMember('house-1', 'profile-2'),
      ).rejects.toMatchObject({
        name: 'DataError',
        code: 'forbidden',
        message: 'Only the admin can remove members',
      })
    })

    it('reports leaving as the last member without confirmation as invalid', async () => {
      fakeSupabase.enqueue({ error: postgrestError('23514', 'last member') })

      await expect(
        new SupabaseHouseholdRepository().leave('house-1', false),
      ).rejects.toMatchObject({ name: 'DataError', code: 'invalid' })
    })
  })

  describe('invites', () => {
    it('lists only invites that can still be used, newest first', async () => {
      fakeSupabase.enqueue({
        data: [
          {
            id: 'invite-1',
            created_at: '2026-11-12T00:00:00.000Z',
            expires_at: '2026-11-19T00:00:00.000Z',
          },
        ],
      })

      const invites =
        await new SupabaseHouseholdRepository().listPendingInvites('house-1')

      expect(invites).toEqual([
        {
          id: 'invite-1',
          createdAt: '2026-11-12T00:00:00.000Z',
          expiresAt: '2026-11-19T00:00:00.000Z',
        },
      ])
      expect(fakeSupabase.queries[0].table).toBe('household_invites')
      // The token hash is never read back.
      expect(fakeSupabase.argsOf(0, 'select')).toEqual([
        ['id, created_at, expires_at'],
      ])
      expect(fakeSupabase.argsOf(0, 'eq')).toEqual([
        ['household_id', 'house-1'],
      ])
      expect(fakeSupabase.argsOf(0, 'is')).toEqual([
        ['used_at', null],
        ['revoked_at', null],
      ])
      expect(fakeSupabase.argsOf(0, 'gt')[0][0]).toBe('expires_at')
    })

    it('creates an invite and hands back its one-time token', async () => {
      fakeSupabase.enqueue({
        data: [
          {
            invite_id: 'invite-1',
            token: 'secret',
            expires_at: '2026-11-19T00:00:00.000Z',
          },
        ],
      })

      const invite = await new SupabaseHouseholdRepository().createInvite(
        'house-1',
      )

      expect(invite).toEqual({
        id: 'invite-1',
        token: 'secret',
        expiresAt: '2026-11-19T00:00:00.000Z',
      })
      expect(fakeSupabase.queries[0].table).toBe('rpc:create_household_invite')
      expect(fakeSupabase.argsOf(0, 'rpc')).toEqual([
        [{ p_household_id: 'house-1' }],
      ])
    })

    it('fails rather than returning an invite with no token', async () => {
      fakeSupabase.enqueue({ data: [] })

      await expect(
        new SupabaseHouseholdRepository().createInvite('house-1'),
      ).rejects.toMatchObject({ name: 'DataError', code: 'unknown' })
    })

    it('previews an invite by token', async () => {
      fakeSupabase.enqueue({
        data: [
          {
            household_id: 'house-1',
            household_name: 'Flat',
            invited_by: 'Alex',
            expires_at: '2026-11-19T00:00:00.000Z',
          },
        ],
      })

      const preview = await new SupabaseHouseholdRepository().previewInvite(
        'secret',
      )

      expect(preview).toEqual({
        householdId: 'house-1',
        householdName: 'Flat',
        invitedBy: 'Alex',
        expiresAt: '2026-11-19T00:00:00.000Z',
      })
      expect(fakeSupabase.argsOf(0, 'rpc')).toEqual([[{ p_token: 'secret' }]])
    })

    it('reports a dead link as invalid', async () => {
      fakeSupabase.enqueue({
        error: postgrestError('23514', 'This invite is invalid or has expired'),
      })

      await expect(
        new SupabaseHouseholdRepository().previewInvite('secret'),
      ).rejects.toMatchObject({ name: 'DataError', code: 'invalid' })
    })

    it('accepts an invite and resolves to the Household joined', async () => {
      fakeSupabase.enqueue({ data: 'house-1' })

      const id = await new SupabaseHouseholdRepository().acceptInvite('secret')

      expect(id).toBe('house-1')
      expect(fakeSupabase.queries[0].table).toBe('rpc:accept_household_invite')
      expect(fakeSupabase.argsOf(0, 'rpc')).toEqual([[{ p_token: 'secret' }]])
    })

    it('reports joining a group you are already in as a conflict', async () => {
      fakeSupabase.enqueue({ error: postgrestError('23505', 'already') })

      await expect(
        new SupabaseHouseholdRepository().acceptInvite('secret'),
      ).rejects.toMatchObject({ name: 'DataError', code: 'conflict' })
    })
  })
})
