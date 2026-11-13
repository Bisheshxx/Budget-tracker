import type {
  HouseholdPermissions,
  HouseholdRole,
} from '#/shared/types/household.type'

// Domain types owned by the households feature (members, invites, settings).
// The Household itself is shared — see #/shared/types/household.type.

/** Someone who is, or was, in a Household. Only what authorship needs. */
export interface HouseholdMember {
  profileId: string
  displayName: string | null
  avatarUrl: string | null
  role: HouseholdRole
  /** UTC moment (ISO). */
  joinedAt: string
  /** Set once they left or were removed; their entries stay. */
  leftAt: string | null
}

/** An invite link that can still be used. The link itself is never stored. */
export interface PendingInvite {
  id: string
  /** UTC moments (ISO). */
  createdAt: string
  expiresAt: string
}

/** A freshly created invite: the only time its token is available. */
export interface CreatedInvite {
  id: string
  token: string
  expiresAt: string
}

/** What the join screen shows before the user commits. */
export interface InvitePreview {
  householdId: string
  householdName: string
  invitedBy: string | null
  expiresAt: string
}

/** The settings an Admin can change on a group. */
export interface HouseholdSettings {
  name: string
  currency: string
  periodStartDay: number
  timeZone: string
  permissions: HouseholdPermissions
}
