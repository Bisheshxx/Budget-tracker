import type { Household, NewHousehold } from '#/shared/types/household.type'
import type {
  CreatedInvite,
  HouseholdMember,
  HouseholdSettings,
  InvitePreview,
  PendingInvite,
} from '#/features/households/types/household.type'

// The Household persistence port. Backed by Supabase today
// (supabase-households-repository.ts). The backend decides who the caller is
// from their token and enforces every rule here (Admin-only settings, the
// invite toggle, one Admin per Household): `profileId` arguments say whose
// rows to read or whom to act on, never who is acting. See docs/adr/0012.
export interface IHouseholdRepository {
  /** Every Household `profileId` is an active member of, with their role. */
  listForProfile: (profileId: string) => Promise<Household[]>
  /** Create a group with the caller as Admin; resolves to the new id. */
  create: (input: NewHousehold) => Promise<string>
  /** Admin only. */
  updateSettings: (
    householdId: string,
    settings: HouseholdSettings,
  ) => Promise<void>

  /** Current and former members, so entries can always show their author. */
  listPeople: (householdId: string) => Promise<HouseholdMember[]>
  /** Admin only; the removed person's entries stay. */
  removeMember: (householdId: string, profileId: string) => Promise<void>
  /** Admin only; the caller becomes a Contributor. */
  transferAdmin: (householdId: string, profileId: string) => Promise<void>
  /**
   * Leave a group. The last member out deletes it with everything in it, and
   * must say so with `deleteIfLast` — otherwise that case is rejected.
   */
  leave: (householdId: string, deleteIfLast: boolean) => Promise<void>

  /** Unused, unrevoked, unexpired invites the caller may see. */
  listPendingInvites: (householdId: string) => Promise<PendingInvite[]>
  createInvite: (householdId: string) => Promise<CreatedInvite>
  revokeInvite: (inviteId: string) => Promise<void>
  previewInvite: (token: string) => Promise<InvitePreview>
  /** Join as a Contributor; resolves to the Household joined. */
  acceptInvite: (token: string) => Promise<string>
}
