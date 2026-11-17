import { parseOrThrow } from '#/shared/utils/validation.util'
import { quickAddSchema } from '#/shared/schemas/transaction.schema'
import { rollup } from '#/shared/utils/summary.util'
import { toCents } from '#/lib/money'
import type { QuickAddInput } from '#/shared/schemas/transaction.schema'
import type {
  PeriodSummary,
  Transaction,
  TransactionPageParams,
} from '#/shared/types/transaction.type'
import type { PeriodRange } from '#/shared/lib/period'
import type { LedgerScope } from '#/shared/types/household.type'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository'

// Thin service over the transaction repository. Holds the app-level rules for
// adding/listing transactions (validation + cents conversion) so UI stays
// declarative. Inject a fake ITransactionRepository in tests — no Supabase, no
// RLS. See ADR 0001.
export class TransactionService {
  constructor(private readonly repo: ITransactionRepository) {}

  // One keyset-paginated page for the Dashboard's infinite-scroll list. Pure
  // passthrough — the date-window/cursor logic lives in the repository; the hook
  // assembles pages and resolves the next cursor (see useTransactionsInfinite).
  listPage(
    householdId: string,
    params: TransactionPageParams,
  ): Promise<Transaction[]> {
    return this.repo.listPage(householdId, params)
  }

  // Cashflow summary for a resolved Period range: total income, total expenses,
  // net (income − expenses), and the expense spend-by-category breakdown. The
  // caller resolves the range via the pure Period helpers (#/shared/lib/period);
  // keeping the date math out of here makes both sides independently testable.
  // All arithmetic is on integer cents.
  async getPeriodSummary(
    householdId: string,
    range: PeriodRange,
  ): Promise<PeriodSummary> {
    const transactions = await this.repo.listInRange(
      householdId,
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
  async create(scope: LedgerScope, input: QuickAddInput): Promise<Transaction> {
    const v = parseOrThrow(quickAddSchema, input)

    return this.repo.create({
      householdId: scope.householdId,
      userId: scope.profileId,
      categoryId: v.categoryId ?? null,
      type: v.type,
      amountCents: toCents(v.amount),
      note: v.note,
      transactionDate: v.transactionDate,
    })
  }

  // Edit an existing transaction. Re-validates through the same schema as create
  // (so a non-positive amount can never be saved) and converts to integer cents.
  // The id targets the row; its Household, author and createdAt are immutable.
  async update(id: string, input: QuickAddInput): Promise<Transaction> {
    const v = parseOrThrow(quickAddSchema, input)

    return this.repo.update(id, {
      categoryId: v.categoryId ?? null,
      type: v.type,
      amountCents: toCents(v.amount),
      note: v.note,
      transactionDate: v.transactionDate,
    })
  }

  // Delete a transaction by id. The backend checks the caller may delete it.
  delete(id: string): Promise<void> {
    return this.repo.delete(id)
  }
}
