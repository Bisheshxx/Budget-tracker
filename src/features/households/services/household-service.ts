import { parseOrThrow } from '#/shared/utils/validation.util'
import {
  createHouseholdSchema,
  householdSettingsSchema,
} from '#/features/households/schemas/household.schema'
import type {
  CreateHouseholdInput,
  HouseholdSettingsInput,
} from '#/features/households/schemas/household.schema'
import type { Household } from '#/shared/types/household.type'
import type {
  CreatedInvite,
  HouseholdMember,
  InvitePreview,
  PendingInvite,
} from '#/features/households/types/household.type'
import type { IHouseholdRepository } from '#/data/households/IHouseholdRepository'

// App-level rules for Households (see CONTEXT.md, docs/adr/0012). Inject a fake
// IHouseholdRepository in tests.
export class HouseholdService {
  constructor(private readonly repo: IHouseholdRepository) {}

  /** The user's Households: Personal first, then groups by name. */
  async list(profileId: string): Promise<Household[]> {
    const households = await this.repo.listForProfile(profileId)
    return [...households].sort(
      (a, b) =>
        Number(b.isPersonal) - Number(a.isPersonal) ||
        a.name.localeCompare(b.name),
    )
  }

  /** Create a group with the caller as Admin; resolves to the new id. */
  async create(input: CreateHouseholdInput): Promise<string> {
    const v = parseOrThrow(createHouseholdSchema, input)
    return this.repo.create(v)
  }

  // Which Household is active: the remembered one while the user still belongs
  // to it, otherwise their Personal household. A remembered id for a group the
  // user has since left or been removed from is simply ignored.
  resolveActive(
    households: readonly Household[],
    rememberedId: string | null,
  ): Household | null {
    return (
      households.find((h) => h.id === rememberedId) ??
      households.find((h) => h.isPersonal) ??
      households.at(0) ??
      null
    )
  }

  /** Admin only (the backend enforces it). */
  async updateSettings(
    householdId: string,
    input: HouseholdSettingsInput,
  ): Promise<void> {
    const v = parseOrThrow(householdSettingsSchema, input)
    await this.repo.updateSettings(householdId, v)
  }

  /** Everyone who is or was in the Household, so entries can show their author. */
  listPeople(householdId: string): Promise<HouseholdMember[]> {
    return this.repo.listPeople(householdId)
  }

  /** The people still in the Household: the Admin first, then by join date. */
  activeMembers(people: readonly HouseholdMember[]): HouseholdMember[] {
    return people
      .filter((p) => p.leftAt === null)
      .sort(
        (a, b) =>
          Number(b.role === 'admin') - Number(a.role === 'admin') ||
          a.joinedAt.localeCompare(b.joinedAt),
      )
  }

  // Who to show as an entry's author in a shared ledger. An auto-posted entry
  // (no author) is credited to whoever owns the Recurring Transaction behind
  // it, marked as recurring. A person with no display name still gets a label,
  // and someone who has left keeps theirs.
  authorLabel(
    people: readonly HouseholdMember[],
    entry: { createdBy: string | null; recurringOwnerId?: string | null },
    viewerProfileId: string,
  ): string | null {
    const nameOf = (profileId: string): string | null => {
      if (profileId === viewerProfileId) return 'You'
      const person = people.find((p) => p.profileId === profileId)
      if (!person) return null
      return person.displayName?.trim() || 'Unnamed member'
    }

    if (entry.createdBy !== null) return nameOf(entry.createdBy)
    const owner = entry.recurringOwnerId ? nameOf(entry.recurringOwnerId) : null
    return owner ? `${owner} · recurring` : 'Recurring'
  }

  removeMember(householdId: string, profileId: string): Promise<void> {
    return this.repo.removeMember(householdId, profileId)
  }

  transferAdmin(householdId: string, profileId: string): Promise<void> {
    return this.repo.transferAdmin(householdId, profileId)
  }

  // The last member leaving deletes the group and its entries; the caller must
  // have confirmed that with the user before passing `deleteIfLast`.
  leave(householdId: string, deleteIfLast: boolean): Promise<void> {
    return this.repo.leave(householdId, deleteIfLast)
  }

  /** Whether the user may create invite links for this Household. */
  canInvite(household: Household): boolean {
    if (household.isPersonal) return false
    return (
      household.role === 'admin' || household.permissions.contributorsCanInvite
    )
  }

  listPendingInvites(householdId: string): Promise<PendingInvite[]> {
    return this.repo.listPendingInvites(householdId)
  }

  createInvite(householdId: string): Promise<CreatedInvite> {
    return this.repo.createInvite(householdId)
  }

  revokeInvite(inviteId: string): Promise<void> {
    return this.repo.revokeInvite(inviteId)
  }

  previewInvite(token: string): Promise<InvitePreview> {
    return this.repo.previewInvite(token)
  }

  /** Join as a Contributor; resolves to the Household joined. */
  acceptInvite(token: string): Promise<string> {
    return this.repo.acceptInvite(token)
  }
}
