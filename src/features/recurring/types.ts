// Domain types owned by the recurring feature — the vocabulary the service,
// hooks, components, and the repository port all speak. The persistence port
// that traffics in these lives in #/data/recurring/IRecurringExpenseRepository.
// See docs/adr/0004 and docs/adr/0006.

export type RecurringFrequency = 'weekly' | 'monthly'

// A first-class, expense-only template (rent, gym, …). "Due" occurrences are
// computed on read from the active templates (issue 11), never stored here.
export interface RecurringExpense {
  id: string
  /** References user_profiles.id (NOT the auth user id). */
  userId: string
  /** Required — a recurring expense always belongs to a category. */
  categoryId: string
  name: string
  /** Default amount in integer cents; editable per occurrence at confirm time. */
  amountCents: number
  frequency: RecurringFrequency
  /** Interpreted by frequency: weekly = day-of-week 0–6, monthly = day-of-month 1–28. */
  anchorDay: number
  active: boolean
  createdAt: string
  /** Set when deactivated; null while active. History is retained, never deleted. */
  deactivatedAt: string | null
}

// The fields a create writes. Money is in cents; id/createdAt/active are
// DB-assigned (active defaults true).
export interface RecurringExpenseCreate {
  userId: string
  categoryId: string
  name: string
  amountCents: number
  frequency: RecurringFrequency
  anchorDay: number
}

// The editable fields an update writes. id targets the row (passed separately);
// userId/createdAt/active never change here (deactivation is its own operation).
export interface RecurringExpenseUpdate {
  categoryId: string
  name: string
  amountCents: number
  frequency: RecurringFrequency
  anchorDay: number
}
