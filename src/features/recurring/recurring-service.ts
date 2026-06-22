import { recurringSchema } from './schema'
import { toCents } from '#/lib/money'
import type { RecurringInput } from './schema'
import type { RecurringExpense } from '#/features/recurring/types'
import type { IRecurringExpenseRepository } from '#/data/recurring/IRecurringExpenseRepository'

// Thin service over the recurring-expense repository. Validates via the shared
// schema (the backstop, not just the UI), converts the display-unit amount to
// integer cents, and persists. Inject a fake IRecurringExpenseRepository in
// tests — no Supabase, no RLS. See ADR 0001 / 0006.
export class RecurringService {
  constructor(private readonly repo: IRecurringExpenseRepository) {}

  // Active templates only — the ones that can surface as Due (issue 11).
  listActive(userId: string): Promise<RecurringExpense[]> {
    return this.repo.listActive(userId)
  }

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

  private validate(input: RecurringInput) {
    const result = recurringSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    return result.data
  }
}
