// Domain types owned by the profile feature — the vocabulary services, hooks,
// components, and the repository port all speak. The persistence port that
// traffics in these lives in #/data/profile/IProfileRepository. See docs/adr/0004.

export interface UserProfile {
  id: string
  authUserId: string
  /** Null until Onboarding is completed — the "onboarded" marker. */
  displayName: string | null
  currency: string
  /** Anchors the monthly Period (1–28). */
  budgetPeriodStartDay: number
  groceryDayOfWeek: number | null
  /** Budget Target, stored as integer cents. */
  monthlyBudgetTargetCents: number
}

// The fields Onboarding (and later Settings) writes. Money is in cents.
export interface ProfileUpdate {
  displayName: string
  currency: string
  budgetPeriodStartDay: number
  groceryDayOfWeek: number | null
  monthlyBudgetTargetCents: number
}
