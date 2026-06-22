import type {
  RecurringExpense,
  RecurringExpenseCreate,
  RecurringExpenseUpdate,
  RecurringOccurrence,
} from '#/features/recurring/types'

export interface IRecurringExpenseRepository {
  /** All of the user's active templates (the ones that can surface as Due). */
  listActive: (userId: string) => Promise<RecurringExpense[]>
  /** Every template the user owns, active or not (the Recurring management screen). */
  listAll: (userId: string) => Promise<RecurringExpense[]>
  create: (input: RecurringExpenseCreate) => Promise<RecurringExpense>
  /** Update editable fields; returns the saved row. Affects only future occurrences. */
  update: (
    id: string,
    input: RecurringExpenseUpdate,
  ) => Promise<RecurringExpense>
  /**
   * Soft-stop a template: active=false + deactivated_at=now(). History is
   * retained (never deleted), so past occurrences still feed analytics.
   */
  deactivate: (id: string) => Promise<RecurringExpense>
  /** Hard delete, reserved for clearly-wrong templates. RLS scopes the row. */
  delete: (id: string) => Promise<void>

  /**
   * Resolved occurrences (confirmed/skipped) whose `occurrenceDate` falls in the
   * half-open range [startInclusive, endExclusive) for the given templates —
   * the set subtracted from computed Due.
   */
  listOccurrencesInRange: (
    recurringExpenseIds: string[],
    startInclusive: string,
    endExclusive: string,
  ) => Promise<RecurringOccurrence[]>
  /** Record a confirmed occurrence, linked to the transaction it created. */
  recordConfirmed: (
    recurringExpenseId: string,
    occurrenceDate: string,
    transactionId: string,
  ) => Promise<RecurringOccurrence>
  /** Record a skipped occurrence so it isn't prompted again that window. */
  recordSkipped: (
    recurringExpenseId: string,
    occurrenceDate: string,
  ) => Promise<RecurringOccurrence>
}
