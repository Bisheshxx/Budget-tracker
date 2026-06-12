import { onboardingSchema } from './schema'
import { toCents } from '#/lib/money'
import type { OnboardingInput } from './schema'
import type {
  IProfileRepository,
  UserProfile,
} from '#/data/profile/profile-repository'

// Thin service over the profile repository. Holds the app-level rules for
// Onboarding (validation + the "onboarded" invariant) so UI stays declarative.
// Inject a fake IProfileRepository in tests — no Supabase, no RLS. See ADR 0001.
export class ProfileService {
  constructor(private readonly repo: IProfileRepository) {}

  getProfile(authUserId: string): Promise<UserProfile | null> {
    return this.repo.getByAuthUserId(authUserId)
  }

  /** A user is onboarded once their display name has been set. */
  isOnboarded(profile: UserProfile | null): boolean {
    return profile != null && profile.displayName != null
  }

  // Completing Onboarding sets display_name (the marker) plus the required
  // Period config and any optional fields, then returns the saved profile.
  async completeOnboarding(
    authUserId: string,
    input: OnboardingInput,
  ): Promise<UserProfile> {
    const result = onboardingSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    const v = result.data

    const displayName = v.displayName?.trim()
    if (!displayName) {
      // The caller must supply a name (or a fallback) — without it the user
      // would never be marked onboarded and would loop back here forever.
      throw new Error('A display name is required to finish onboarding')
    }

    return this.repo.update(authUserId, {
      displayName,
      currency: v.currency,
      budgetPeriodStartDay: v.budgetPeriodStartDay,
      paydayDayOfMonth: v.paydayDayOfMonth ?? null,
      paydayFrequency: v.paydayFrequency ?? 'monthly',
      groceryDayOfWeek: v.groceryDayOfWeek ?? null,
      monthlyBudgetTargetCents:
        v.monthlyBudgetTarget != null ? toCents(v.monthlyBudgetTarget) : 0,
    })
  }
}
