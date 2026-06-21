import { computeComparison, computeWeeks } from '#/features/reports/comparison'
import { rollup } from '#/features/transactions/summary'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository'
import type { PeriodRange } from '#/shared/period'
import type { PeriodReport } from '#/features/reports/types'
import type { IReportRepository } from './IReportRepository'

// V1 Reports implementation: there is no Supabase "reports" table — the report is
// derived. We fetch the two Periods' transactions (reusing the existing
// transaction repository's in-range query) and run the pure comparison helpers
// here. This repo intentionally holds computation, unlike the app's other thin
// repos: it stands in for the future computing backend, so when this is swapped
// for an axios impl that GETs a Node.js endpoint, the computation moves
// server-side and the returned PeriodReport shape is unchanged.
export class SupabaseReportRepository implements IReportRepository {
  constructor(private readonly transactions: ITransactionRepository) {}

  async getPeriodReport(
    userId: string,
    current: PeriodRange,
    previous: PeriodRange,
  ): Promise<PeriodReport> {
    const [currentTx, previousTx] = await Promise.all([
      this.transactions.listInRange(userId, current.start, current.end),
      this.transactions.listInRange(userId, previous.start, previous.end),
    ])

    return {
      comparison: computeComparison(currentTx, previousTx),
      weeks: computeWeeks(currentTx, current),
      currentByCategory: rollup(currentTx).byCategory,
    }
  }
}
