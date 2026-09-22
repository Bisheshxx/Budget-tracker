import type {
  RecurringOccurrence,
  RecurringTransaction,
  RecurringTransactionCreate,
  RecurringTransactionUpdate,
} from '#/features/recurring/types'
import type { Transaction } from '#/shared/types/transaction.type'

export interface RecentlyPostedItem {
  occurrence: RecurringOccurrence
  recurringTransaction: RecurringTransaction
  transaction: Transaction
}

export interface IRecurringTransactionRepository {
  /** All of the user's active templates (the ones that can surface as Due). */
  listActive: (userId: string) => Promise<RecurringTransaction[]>
  /** Every template the user owns, active or not (the Recurring management screen). */
  listAll: (userId: string) => Promise<RecurringTransaction[]>
  create: (input: RecurringTransactionCreate) => Promise<RecurringTransaction>
  /** Update editable fields; returns the saved row. Affects only future occurrences. */
  update: (
    id: string,
    input: RecurringTransactionUpdate,
  ) => Promise<RecurringTransaction>
  /**
   * Soft-stop a template: active=false + deactivated_at=now(). History is
   * retained (never deleted), so past occurrences still feed analytics.
   */
  deactivate: (id: string) => Promise<RecurringTransaction>
  /**
   * Hard delete, reserved for clearly-wrong templates. Always severs
   * transactions.recurring_transaction_id on any linked transactions first (a
   * no-op when there are none), so a confirmed transaction is never touched
   * regardless of history — the cascade then safely removes the template's own
   * occurrence rows. RLS scopes the row.
   */
  delete: (id: string) => Promise<void>
  /** True if the template has at least one confirmed occurrence — drives the delete confirm-dialog copy, not delete's actual behavior. */
  hasConfirmedHistory: (id: string) => Promise<boolean>

  /**
   * Resolved occurrences (confirmed/skipped) whose `occurrenceDate` falls in the
   * half-open range [startInclusive, endExclusive) for the given templates —
   * the set subtracted from computed Due.
   */
  listOccurrencesInRange: (
    recurringTransactionIds: string[],
    startInclusive: string,
    endExclusive: string,
  ) => Promise<RecurringOccurrence[]>
  /**
   * Record a confirmed (auto-posted) occurrence, linked to the transaction it
   * created. Idempotent: if a row for (recurringTransactionId, occurrenceDate)
   * already exists (a concurrent reconcile won the race), this is a no-op that
   * returns the existing row rather than throwing — the caller compares the
   * returned row's transactionId against its own to detect a lost race.
   */
  recordConfirmed: (
    recurringTransactionId: string,
    occurrenceDate: string,
    transactionId: string,
  ) => Promise<RecurringOccurrence>
  /**
   * Record a skipped occurrence — either "undo" (a confirmed row already
   * exists for this date; flips it to skipped and clears transactionId) or
   * "pre-emptive skip" (no row exists yet; inserts one) — both go through the
   * same upsert.
   */
  recordSkipped: (
    recurringTransactionId: string,
    occurrenceDate: string,
  ) => Promise<RecurringOccurrence>
  /**
   * Confirmed occurrences on/after `since`, joined with their template and the
   * transaction they created — feeds the Dashboard's "Recently posted" list.
   */
  listRecentlyConfirmed: (
    userId: string,
    since: string,
  ) => Promise<RecentlyPostedItem[]>
}
