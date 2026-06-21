import type { PeriodRange } from '#/shared/period'
import type { PeriodReport } from '#/features/reports/types'

// The Reports data port. Unlike the other repositories it returns a *computed*
// result, not raw rows: `getPeriodReport` answers with the full Period Comparison,
// weekly breakdown, and category spend for two resolved Period ranges. This is
// deliberate — when the data source is swapped for the future Node.js backend
// (see docs/adr/0001), that endpoint does the computation and returns this exact
// shape, so the swap stays a one-file change and nothing above the repository
// moves. The V1 Supabase implementation computes it client-side.
export interface IReportRepository {
  getPeriodReport: (
    userId: string,
    current: PeriodRange,
    previous: PeriodRange,
  ) => Promise<PeriodReport>
}
