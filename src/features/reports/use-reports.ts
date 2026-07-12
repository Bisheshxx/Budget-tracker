import { useQuery } from '@tanstack/react-query'
import { reportService } from '#/features/reports'
import { useProfile } from '#/features/profile/use-profile'
import {
  defaultLocaleWeekStartDay,
  getPeriodKey,
  resolveCalendarMonth,
  resolveCalendarWeek,
  todayYmd,
} from '#/shared/lib/period'
import type { PeriodReport, ReportView } from './types'

interface ReportsResult {
  report: PeriodReport | null
  loading: boolean
  isError: boolean
  error: unknown
}

// The current Period's Reports payload (comparison + weekly + category spend),
// scoped to the user's profile. The Period is resolved from the profile's start
// day against today (pure helpers in #/shared/lib/period); the Period key doubles as
// the cache key so crossing into a new Period refetches. Disabled until the
// profile resolves. Mirrors usePeriodSummary in the transactions feature.
export function useReports(view: ReportView = 'period'): ReportsResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null
  const startDay = profile?.budgetPeriodStartDay ?? 1
  const weekStartDay = defaultLocaleWeekStartDay()

  const today = todayYmd()
  const id = userId ?? ''
  const windowKey =
    view === 'period'
      ? getPeriodKey(today, startDay)
      : view === 'calendar-month'
        ? resolveCalendarMonth(today).start
        : resolveCalendarWeek(today, weekStartDay).start

  const query = useQuery({
    queryKey: ['reports', id, view, windowKey],
    queryFn: () =>
      reportService.getReport(id, today, view, startDay, weekStartDay),
    enabled: !!userId,
  })

  return {
    report: query.data ?? null,
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
