import { supabase } from '#/lib/supabase'
import type { Database } from '#/lib/database.types'
import type {
  Household,
  HouseholdRole,
  NewHousehold,
} from '#/shared/types/household.type'
import type {
  CreatedInvite,
  HouseholdMember,
  HouseholdSettings,
  InvitePreview,
  PendingInvite,
} from '#/features/households/types/household.type'
import { DataError } from '#/data/data-error'
import { toDataError } from '#/data/supabase-error'
import type { IHouseholdRepository } from './IHouseholdRepository'

type HouseholdRow = Database['public']['Tables']['households']['Row']

function toHousehold(row: HouseholdRow, role: string): Household {
  return {
    id: row.id,
    name: row.name,
    isPersonal: row.personal_owner_id !== null,
    currency: row.currency,
    periodStartDay: row.period_start_day,
    timeZone: row.time_zone,
    // The column is check-constrained to these two values.
    role: role as HouseholdRole,
    permissions: {
      contributorsCanEditOthers: row.contributors_can_edit_others,
      contributorsCanDeleteOthers: row.contributors_can_delete_others,
      contributorsCanManageCategories: row.contributors_can_manage_categories,
      contributorsCanInvite: row.contributors_can_invite,
    },
  }
}

// The table-returning functions answer with an array; an empty one means the
// function produced nothing where exactly one row was expected.
function firstRow<T>(rows: readonly T[] | null, what: string): T {
  const row = rows?.at(0)
  if (!row) throw new DataError('unknown', `${what} returned nothing`)
  return row
}

export class SupabaseHouseholdRepository implements IHouseholdRepository {
  // Read through the membership rows so each Household comes with the caller's
  // role. RLS shows every member of a shared Household, hence the explicit
  // profile filter; ended memberships (left_at set) are excluded.
  async listForProfile(profileId: string): Promise<Household[]> {
    const { data, error } = await supabase
      .from('household_members')
      .select('role, households(*)')
      .eq('profile_id', profileId)
      .is('left_at', null)
    if (error) throw toDataError(error)
    return data.map((row) => toHousehold(row.households, row.role))
  }

  // One database function creates the Household and its Admin membership
  // together, taking the Admin from the token.
  async create(input: NewHousehold): Promise<string> {
    const { data, error } = await supabase.rpc('create_household', {
      p_name: input.name,
      p_currency: input.currency,
      p_period_start_day: input.periodStartDay,
      p_time_zone: input.timeZone,
    })
    if (error) throw toDataError(error)
    return data
  }

  // A plain update: row level security lets only the Admin through. Asking for
  // the row back turns "no row matched" (not the Admin, or not a member) into
  // an error instead of a silent no-op.
  async updateSettings(
    householdId: string,
    settings: HouseholdSettings,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('households')
      .update({
        name: settings.name,
        currency: settings.currency,
        period_start_day: settings.periodStartDay,
        time_zone: settings.timeZone,
        contributors_can_edit_others:
          settings.permissions.contributorsCanEditOthers,
        contributors_can_delete_others:
          settings.permissions.contributorsCanDeleteOthers,
        contributors_can_manage_categories:
          settings.permissions.contributorsCanManageCategories,
        contributors_can_invite: settings.permissions.contributorsCanInvite,
      })
      .eq('id', householdId)
      .select('id')
    if (error) throw toDataError(error)
    if (data.length === 0) {
      throw new DataError(
        'forbidden',
        'Only the admin can change group settings',
      )
    }
  }

  async listPeople(householdId: string): Promise<HouseholdMember[]> {
    const { data, error } = await supabase.rpc('household_people', {
      p_household_id: householdId,
    })
    if (error) throw toDataError(error)
    return data.map((row) => ({
      profileId: row.profile_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      role: row.role as HouseholdRole,
      joinedAt: row.joined_at,
      leftAt: row.left_at,
    }))
  }

  async removeMember(householdId: string, profileId: string): Promise<void> {
    const { error } = await supabase.rpc('remove_household_member', {
      p_household_id: householdId,
      p_profile_id: profileId,
    })
    if (error) throw toDataError(error)
  }

  async transferAdmin(householdId: string, profileId: string): Promise<void> {
    const { error } = await supabase.rpc('transfer_household_admin', {
      p_household_id: householdId,
      p_profile_id: profileId,
    })
    if (error) throw toDataError(error)
  }

  async leave(householdId: string, deleteIfLast: boolean): Promise<void> {
    const { error } = await supabase.rpc('leave_household', {
      p_household_id: householdId,
      p_delete_if_last: deleteIfLast,
    })
    if (error) throw toDataError(error)
  }

  // Row level security already narrows this to invites the caller may see (the
  // Admin sees all, anyone else only their own).
  async listPendingInvites(householdId: string): Promise<PendingInvite[]> {
    const { data, error } = await supabase
      .from('household_invites')
      .select('id, created_at, expires_at')
      .eq('household_id', householdId)
      .is('used_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    if (error) throw toDataError(error)
    return data.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }))
  }

  async createInvite(householdId: string): Promise<CreatedInvite> {
    const { data, error } = await supabase.rpc('create_household_invite', {
      p_household_id: householdId,
    })
    if (error) throw toDataError(error)
    const row = firstRow(data, 'Creating the invite')
    return { id: row.invite_id, token: row.token, expiresAt: row.expires_at }
  }

  async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_household_invite', {
      p_invite_id: inviteId,
    })
    if (error) throw toDataError(error)
  }

  async previewInvite(token: string): Promise<InvitePreview> {
    const { data, error } = await supabase.rpc('preview_household_invite', {
      p_token: token,
    })
    if (error) throw toDataError(error)
    const row = firstRow(data, 'Looking up the invite')
    return {
      householdId: row.household_id,
      householdName: row.household_name,
      invitedBy: row.invited_by,
      expiresAt: row.expires_at,
    }
  }

  async acceptInvite(token: string): Promise<string> {
    const { data, error } = await supabase.rpc('accept_household_invite', {
      p_token: token,
    })
    if (error) throw toDataError(error)
    return data
  }
}
