import type {
  RecurringExpense,
  RecurringExpenseCreate,
  RecurringExpenseUpdate,
} from '#/features/recurring/types'

// Template persistence. The occurrence read/write surface (listOccurrencesInRange,
// recordConfirmed, recordSkipped) lands with its consumer in issue 11 (Due
// computation + confirm/skip); the occurrences table already exists.
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
}
