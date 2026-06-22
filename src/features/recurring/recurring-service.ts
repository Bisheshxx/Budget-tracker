import { recurringSchema } from './schema'
import { computeDue } from './due'
import { toCents } from '#/lib/money'
import { quickAddSchema } from '#/features/transactions/schema'
import { resolvePeriod } from '#/shared/period'
import type { RecurringInput } from './schema'
import type { QuickAddInput } from '#/features/transactions/schema'
import type {
  DueOccurrence,
  RecurringExpense,
} from '#/features/recurring/types'
import type { IRecurringExpenseRepository } from '#/data/recurring/IRecurringExpenseRepository'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository'

// Thin service over the recurring-expense repository. Validates via the shared
// schema (the backstop, not just the UI), converts the display-unit amount to
// integer cents, and persists. Inject fake repositories in tests — no Supabase,
// no RLS. See ADR 0001 / 0006.
export class RecurringService {
  constructor(
    private readonly repo: IRecurringExpenseRepository,
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  // Every template the user owns, active or not — the management screen.
  listAll(userId: string): Promise<RecurringExpense[]> {
    return this.repo.listAll(userId)
  }

  async create(
    userId: string,
    input: RecurringInput,
  ): Promise<RecurringExpense> {
    const v = this.validate(input)
    return this.repo.create({
      userId,
      categoryId: v.categoryId,
      name: v.name,
      amountCents: toCents(v.amount),
      frequency: v.frequency,
      anchorDay: v.anchorDay,
    })
  }

  // Edit a template. Re-validates through the same schema as create. Per ADR 0006,
  // changing the default amount affects only future occurrences — already-confirmed
  // occurrences kept their own transaction amount, so nothing to backfill here.
  async update(id: string, input: RecurringInput): Promise<RecurringExpense> {
    const v = this.validate(input)
    return this.repo.update(id, {
      categoryId: v.categoryId,
      name: v.name,
      amountCents: toCents(v.amount),
      frequency: v.frequency,
      anchorDay: v.anchorDay,
    })
  }

  // Soft-stop a template: it stops surfacing as Due but its history is retained
  // for analytics (never deleted). See ADR 0006.
  deactivate(id: string): Promise<RecurringExpense> {
    return this.repo.deactivate(id)
  }

  // Hard delete, reserved for clearly-wrong templates. Confirmed transactions
  // survive (the FK is `on delete set null`); only the template + its occurrence
  // rows go.
  delete(id: string): Promise<void> {
    return this.repo.delete(id)
  }

  // The Due items to prompt for on the Dashboard: the active templates' computed
  // occurrences in the current Period, minus any already resolved. Nothing is
  // pre-materialized — "Due" is derived (see due.ts / ADR 0006).
  async listDue(
    userId: string,
    today: string,
    periodStartDay: number,
  ): Promise<DueOccurrence[]> {
    const templates = await this.repo.listActive(userId)
    if (templates.length === 0) return []

    const period = resolvePeriod(today, periodStartDay)
    const resolved = await this.repo.listOccurrencesInRange(
      templates.map((t) => t.id),
      period.start,
      period.end,
    )
    return computeDue(templates, period, today, resolved)
  }

  // Confirm a Due occurrence: create the expense transaction it stands for
  // (amount/date editable by the user, validated through the transaction schema)
  // linked to the template, then record the `confirmed` occurrence against the
  // fixed Due date so the slot isn't prompted again. The transaction counts in
  // Cashflow.
  async confirm(
    userId: string,
    due: DueOccurrence,
    input: QuickAddInput,
  ): Promise<void> {
    const result = quickAddSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    const v = result.data

    const transaction = await this.transactionRepo.create({
      userId,
      categoryId: due.recurringExpense.categoryId,
      type: 'expense',
      amountCents: toCents(v.amount),
      note: v.note ?? null,
      transactionDate: v.transactionDate,
      recurringExpenseId: due.recurringExpense.id,
    })
    await this.repo.recordConfirmed(
      due.recurringExpense.id,
      due.occurrenceDate,
      transaction.id,
    )
  }

  // Skip a Due occurrence: record a `skipped` row against the Due date so it
  // isn't prompted again that window. No transaction is created — a month you
  // didn't pay isn't recorded as spending.
  async skip(due: DueOccurrence): Promise<void> {
    await this.repo.recordSkipped(due.recurringExpense.id, due.occurrenceDate)
  }

  private validate(input: RecurringInput) {
    const result = recurringSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    return result.data
  }
}
