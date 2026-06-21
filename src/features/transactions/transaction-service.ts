import { quickAddSchema } from './schema'
import { rollup } from './summary'
import { toCents } from '#/lib/money'
import type { QuickAddInput } from './schema'
import type { PeriodSummary, Transaction } from '#/features/transactions/types'
import type { PeriodRange } from '#/shared/period'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository'

// Thin service over the transaction repository. Holds the app-level rules for
// adding/listing transactions (validation + cents conversion) so UI stays
// declarative. Inject a fake ITransactionRepository in tests — no Supabase, no
// RLS. See ADR 0001.
export class TransactionService {
  constructor(private readonly repo: ITransactionRepository) {}

  listRecent(userId: string, limit = 10): Promise<Transaction[]> {
    return this.repo.listRecent(userId, limit)
  }

  // Cashflow summary for a resolved Period range: total income, total expenses,
  // net (income − expenses), and the expense spend-by-category breakdown. The
  // caller resolves the range via the pure Period helpers (#/shared/period);
  // keeping the date math out of here makes both sides independently testable.
  // All arithmetic is on integer cents.
  async getPeriodSummary(
    userId: string,
    range: PeriodRange,
  ): Promise<PeriodSummary> {
    const transactions = await this.repo.listInRange(
      userId,
      range.start,
      range.end,
    )

    // Shared with the Reports comparison so the Dashboard and Reports never drift
    // in how they total a Period. PeriodSummary is structurally PeriodRollup.
    return rollup(transactions)
  }

  // Validates via the shared schema (the backstop, not just the UI), converts the
  // display-unit amount to integer cents, and persists. An empty categoryId means
  // Uncategorized (stored as null).
  async create(userId: string, input: QuickAddInput): Promise<Transaction> {
    const result = quickAddSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    const v = result.data

    return this.repo.create({
      userId,
      categoryId: v.categoryId ?? null,
      type: v.type,
      amountCents: toCents(v.amount),
      note: v.note ?? null,
      transactionDate: v.transactionDate,
    })
  }

  // Edit an existing transaction. Re-validates through the same schema as create
  // (so a non-positive amount can never be saved) and converts to integer cents.
  // The id targets the row; userId/createdAt are immutable and not written.
  async update(id: string, input: QuickAddInput): Promise<Transaction> {
    const result = quickAddSchema.safeParse(input)
    if (!result.success) {
      throw new Error(result.error.issues[0].message)
    }
    const v = result.data

    return this.repo.update(id, {
      categoryId: v.categoryId ?? null,
      type: v.type,
      amountCents: toCents(v.amount),
      note: v.note ?? null,
      transactionDate: v.transactionDate,
    })
  }

  // Delete a transaction by id. RLS scopes the row to the owning user.
  delete(id: string): Promise<void> {
    return this.repo.delete(id)
  }
}
