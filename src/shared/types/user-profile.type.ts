// Domain types for the user profile — read by every feature (transactions,
// categories, recurring, reports) for currency/Period settings, so it lives in
// shared rather than the profile feature alone. The persistence port lives in
// #/data/profile/IProfileRepository. See docs/adr/0004 and docs/adr/0009.

export interface UserProfile {
  id: string
  authUserId: string
  /** Optional, editable later in Settings — no longer the onboarded marker. */
  displayName: string | null
  /** Mirrored from auth.users on signup by the handle_new_user trigger. */
  email: string | null
  /** From the OAuth provider's metadata on signup; null for email signups. */
  avatarUrl: string | null
  currency: string
  /** Anchors the monthly Period (1–28). */
  budgetPeriodStartDay: number
  groceryDayOfWeek: number | null
  /** Hidden/deprecated Budget Target, stored as integer cents for future reuse. */
  monthlyBudgetTargetCents: number
  /** Null until Onboarding is completed — the canonical "onboarded" marker. */
  onboardingCompletedAt: string | null
}

// The fields Onboarding (and later Settings) writes. Money is in cents.
export interface ProfileUpdate {
  displayName: string | null
  currency: string
  budgetPeriodStartDay: number
  groceryDayOfWeek: number | null
  monthlyBudgetTargetCents: number
  onboardingCompletedAt: string | null
}
