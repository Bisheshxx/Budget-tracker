// Domain types owned by the recurring feature — the vocabulary the service,
// hooks, components, and the repository port all speak. The persistence port
// that traffics in these lives in #/data/recurring/IRecurringTransactionRepository.
// See docs/adr/0004 and docs/adr/0010 (supersedes 0006 §1-2).

export type RecurringFrequency = 'weekly' | 'fortnightly' | 'monthly'

export type RecurringKind = 'expense' | 'income'

export type RecurringOccurrenceStatus = 'confirmed' | 'skipped'

/** 1st/2nd/3rd/4th, or -1 for "last". */
export type MonthlyNth = 1 | 2 | 3 | 4 | -1

export type MonthlyRule =
  | { type: 'day-of-month'; day: number }
  | {
      type: 'nth-weekday'
      /** 0 = Sunday .. 6 = Saturday. */
      weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
      nth: MonthlyNth
    }

// A first-class template (rent, gym, a paycheck, …) covering both expenses and
// income. Occurrences are auto-posted on read/schedule from the active
// templates, never stored here.
export interface RecurringTransaction {
  id: string
  /** References user_profiles.id (NOT the auth user id). */
  userId: string
  /** Required — a recurring transaction always belongs to a category. */
  categoryId: string
  name: string
  /** Default amount in integer cents; can be corrected after posting. */
  amountCents: number
  kind: RecurringKind
  frequency: RecurringFrequency
  /** Non-null iff frequency === 'monthly'. */
  monthlyRule: MonthlyRule | null
  /** SQL date as 'YYYY-MM-DD'. Weekly/fortnightly cadence repeats from this date; monthly repeats per monthlyRule. */
  firstDueDate: string
  active: boolean
  createdAt: string
  /** Set when deactivated; null while active. History is retained, never deleted. */
  deactivatedAt: string | null
}

// The fields a create writes. Money is in cents; id/createdAt/active are
// DB-assigned (active defaults true).
export interface RecurringTransactionCreate {
  userId: string
  categoryId: string
  name: string
  amountCents: number
  kind: RecurringKind
  frequency: RecurringFrequency
  monthlyRule: MonthlyRule | null
  firstDueDate: string
}

// The editable fields an update writes. id targets the row (passed separately);
// userId/createdAt/active never change here (deactivation is its own operation).
export interface RecurringTransactionUpdate {
  categoryId: string
  name: string
  amountCents: number
  kind: RecurringKind
  frequency: RecurringFrequency
  monthlyRule: MonthlyRule | null
  firstDueDate: string
}

// A resolved occurrence — only confirmed or skipped rows exist. "confirmed"
// means auto-posted (see ADR 0010); "skipped" covers both an undone post and a
// pre-emptive skip of an occurrence that hasn't posted yet.
export interface RecurringOccurrence {
  id: string
  recurringTransactionId: string
  /** SQL date as 'YYYY-MM-DD'. */
  occurrenceDate: string
  status: RecurringOccurrenceStatus
  /** The transaction auto-posted for this occurrence; null for skipped. */
  transactionId: string | null
  createdAt: string
}

// A computed Due item: a template that has come due on a given date in the
// current window and has no resolved occurrence yet. Derived, never stored.
export interface DueOccurrence {
  recurringTransaction: RecurringTransaction
  /** SQL date as 'YYYY-MM-DD' the template came due on. */
  occurrenceDate: string
}
