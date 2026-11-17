// Domain types for Households (shared ledgers) — see CONTEXT.md and
// docs/adr/0012. Shared rather than feature-owned because the active Household
// scopes every ledger feature (transactions, categories, recurring, reports)
// and the app chrome. The persistence port is #/data/households/IHouseholdRepository.

export type HouseholdRole = 'admin' | 'contributor'

/**
 * What Contributors may do, switched by the Admin (who can always do all of
 * it). Adding entries and editing or deleting your own are never restricted.
 */
export interface HouseholdPermissions {
  contributorsCanEditOthers: boolean
  contributorsCanDeleteOthers: boolean
  contributorsCanManageCategories: boolean
  contributorsCanInvite: boolean
}

/** A Household the current user is an active member of, with their role in it. */
export interface Household {
  id: string
  name: string
  /** The user's own household of one, created at signup. */
  isPersonal: boolean
  currency: string
  /** Anchors the monthly Period (1–28). */
  periodStartDay: number
  /**
   * IANA zone that decides what "today" is. Null only for a Personal household
   * created before zones were recorded — read it as the device zone.
   */
  timeZone: string | null
  /** The current user's role in this Household. */
  role: HouseholdRole
  permissions: HouseholdPermissions
}

/**
 * Where a new ledger row goes and who is writing it. `profileId` is still
 * stored on the row (the pre-household owner column, dropped in the contract
 * migration); access is decided by membership of `householdId`, and the author
 * is taken from the token, never from here.
 */
export interface LedgerScope {
  householdId: string
  profileId: string
}

/** The active Household as the ledger screens need it. */
export interface Ledger extends LedgerScope {
  currency: string
  /** Anchors the monthly Period (1–28). */
  periodStartDay: number
  /** Always set: a Household without a recorded zone uses the device's. */
  timeZone: string
}

/** What creating a group needs. The creator becomes its Admin. */
export interface NewHousehold {
  name: string
  currency: string
  periodStartDay: number
  timeZone: string
}
