import { onboardingSchema } from './schema'
import { toCents } from '#/lib/money'
import type { OnboardingInput } from './schema'
import type { UserProfile } from '#/features/profile/types'
import type { IProfileRepository } from '#/data/profile/IProfileRepository'

// Thin service over the profile repository. Holds the app-level rules for
// Onboarding (validation + the "onboarded" invariant) so UI stays declarative.
// Inject a fake IProfileRepository in tests — no Supabase, no RLS. See ADR 0001.
export class ProfileService {
  constructor(private readonly repo: IProfileRepository) {}

  getProfile(authUserId: string): Promise<UserProfile | null> {
    return this.repo.getByAuthUserId(authUserId)
  }

  /** A user is onboarded once `onboarding_completed_at` has been stamped. */
  isOnboarded(profile: UserProfile | null): boolean {
    return profile != null && profile.onboardingCompletedAt != null
  }

  // Completing Onboarding stamps `onboarding_completed_at` (the marker) plus the
  // required Period config and any optional fields (display name included), then
  // returns the saved profile. Display name is optional — a skipped name persists
  // as null without blocking completion.
  async completeOnboarding(
    authUserId: string,
    input: OnboardingInput,
  ): Promise<UserProfile> {
    const result = onboardingSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    const v = result.data

    return this.repo.update(authUserId, {
      displayName: v.displayName?.trim() || null,
      currency: v.currency,
      budgetPeriodStartDay: v.budgetPeriodStartDay,
      groceryDayOfWeek: v.groceryDayOfWeek ?? null,
      monthlyBudgetTargetCents:
        v.monthlyBudgetTarget != null ? toCents(v.monthlyBudgetTarget) : 0,
      onboardingCompletedAt: new Date().toISOString(),
    })
  }

  // Settings edits an already-onboarded profile, so it reuses the same validation
  // (onboardingSchema) but must NOT re-stamp the onboarded marker — it reads the
  // current row and writes back its existing onboarding_completed_at unchanged.
  // Every consumer reads these fields via useProfile, so refreshing that query
  // after this write propagates currency / Period / Budget Target app-wide.
  async updateProfile(
    authUserId: string,
    input: OnboardingInput,
  ): Promise<UserProfile> {
    const result = onboardingSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    const v = result.data

    const current = await this.repo.getByAuthUserId(authUserId)
    if (!current) {
      throw new Error('No profile to update')
    }

    return this.repo.update(authUserId, {
      displayName: v.displayName?.trim() || null,
      currency: v.currency,
      budgetPeriodStartDay: v.budgetPeriodStartDay,
      groceryDayOfWeek: v.groceryDayOfWeek ?? null,
      monthlyBudgetTargetCents:
        v.monthlyBudgetTarget != null ? toCents(v.monthlyBudgetTarget) : 0,
      // Preserve the marker — Settings never un-onboards or re-stamps.
      onboardingCompletedAt: current.onboardingCompletedAt,
    })
  }
}
