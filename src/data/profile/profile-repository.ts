// Source-agnostic profile contract. Backed by Supabase today; swappable for an
// axios/REST backend later. Components and services depend on THIS, never on
// supabase-js directly. See docs/adr/0001-client-side-swappable-repositories.md.

export type PaydayFrequency = 'weekly' | 'biweekly' | 'monthly'

export interface UserProfile {
  id: string
  authUserId: string
  /** Null until Onboarding is completed — the "onboarded" marker. */
  displayName: string | null
  currency: string
  /** Anchors the monthly Period (1–28). */
  budgetPeriodStartDay: number
  paydayDayOfMonth: number | null
  paydayFrequency: PaydayFrequency
  groceryDayOfWeek: number | null
  /** Budget Target, stored as integer cents. */
  monthlyBudgetTargetCents: number
}

// The fields Onboarding (and later Settings) writes. Money is in cents.
export interface ProfileUpdate {
  displayName: string
  currency: string
  budgetPeriodStartDay: number
  paydayDayOfMonth: number | null
  paydayFrequency: PaydayFrequency
  groceryDayOfWeek: number | null
  monthlyBudgetTargetCents: number
}

export interface IProfileRepository {
  /** The current user's profile, or null if none exists yet. */
  getByAuthUserId: (authUserId: string) => Promise<UserProfile | null>
  /** Patch the profile and return the saved row. */
  update: (authUserId: string, patch: ProfileUpdate) => Promise<UserProfile>
}
