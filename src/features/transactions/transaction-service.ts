import { quickAddSchema } from './schema'
import { toCents } from '#/lib/money'
import type { QuickAddInput } from './schema'
import type { Transaction } from '#/features/transactions/types'
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
}
