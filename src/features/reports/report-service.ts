import {
  previousPeriod,
  previousRange,
  previousCalendarMonth,
  resolveCalendarMonth,
  resolveCalendarWeek,
  resolvePeriod,
} from '#/shared/period'
import type { IReportRepository } from '#/data/reports/IReportRepository'
import type { PeriodReport, ReportView } from './types'

// Thin service over the report repository. Its only job is to turn the user's
// "today + Period start day" into the two Period ranges the comparison needs
// (current vs. previous, via the pure helpers in #/shared/period) and hand them
// to the repository. All aggregation lives below (in the repo / pure comparison
// module) so it can move to the future backend without touching this layer.
// Inject a fake IReportRepository in tests. See ADR 0001.
export class ReportService {
  constructor(private readonly repo: IReportRepository) {}

  getPeriodReport(
    userId: string,
    today: string,
    startDay: number,
  ): Promise<PeriodReport> {
    const current = resolvePeriod(today, startDay)
    const previous = previousPeriod(today, startDay)
    return this.repo.getPeriodReport(userId, current, previous)
  }

  getReport(
    userId: string,
    today: string,
    view: ReportView,
    startDay: number,
    weekStartDay?: number,
  ): Promise<PeriodReport> {
    if (view === 'period') {
      return this.getPeriodReport(userId, today, startDay)
    }

    if (view === 'calendar-month') {
      return this.repo.getPeriodReport(
        userId,
        resolveCalendarMonth(today),
        previousCalendarMonth(today),
      )
    }

    const current = resolveCalendarWeek(today, weekStartDay)
    return this.repo.getPeriodReport(userId, current, previousRange(current))
  }
}
