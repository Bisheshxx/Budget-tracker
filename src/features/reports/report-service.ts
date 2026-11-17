import {
  previousPeriod,
  previousRange,
  previousCalendarMonth,
  resolveCalendarMonth,
  resolveCalendarWeek,
  resolvePeriod,
} from '#/shared/lib/period'
import type { PeriodRange } from '#/shared/lib/period'
import type { IReportRepository } from '#/data/reports/IReportRepository'
import type { PeriodReport, ReportView } from './types'

// Thin service over the report repository. Its only job is to turn the user's
// "today + Period start day" into the two Period ranges the comparison needs
// (current vs. previous, via the pure helpers in #/shared/lib/period) and hand them
// to the repository. All aggregation lives below (in the repo / pure comparison
// module) so it can move to the future backend without touching this layer.
// Inject a fake IReportRepository in tests. See ADR 0001.
export class ReportService {
  constructor(private readonly repo: IReportRepository) {}

  getPeriodReport(
    householdId: string,
    today: string,
    startDay: number,
  ): Promise<PeriodReport> {
    const current = resolvePeriod(today, startDay)
    const previous = previousPeriod(today, startDay)
    return this.repo.getPeriodReport(householdId, current, previous)
  }

  getReport(
    householdId: string,
    today: string,
    view: ReportView,
    startDay: number,
    weekStartDay?: number,
    customRange?: PeriodRange,
  ): Promise<PeriodReport> {
    if (view === 'period') {
      return this.getPeriodReport(householdId, today, startDay)
    }

    if (view === 'calendar-month') {
      return this.repo.getPeriodReport(
        householdId,
        resolveCalendarMonth(today),
        previousCalendarMonth(today),
      )
    }

    if (view === 'custom') {
      if (!customRange) {
        throw new Error('custom view requires a customRange')
      }
      return this.repo.getPeriodReport(
        householdId,
        customRange,
        previousRange(customRange),
      )
    }

    const current = resolveCalendarWeek(today, weekStartDay)
    return this.repo.getPeriodReport(
      householdId,
      current,
      previousRange(current),
    )
  }
}
