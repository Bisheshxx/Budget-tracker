import { useQuery } from '@tanstack/react-query'
import { reportService } from '#/features/reports'
import { queryKeys } from '#/shared/lib/query-keys'
import { useLedger } from '#/shared/hooks/use-ledger'
import {
  defaultLocaleWeekStartDay,
  getPeriodKey,
  resolveCalendarMonth,
  resolveCalendarWeek,
} from '#/shared/lib/period'
import { rangeToBounds } from '#/shared/utils/range.util'
import type { Range } from '#/shared/utils/range.util'
import type { PeriodReport, ReportView } from './types'

interface ReportsResult {
  report: PeriodReport | null
  loading: boolean
  isError: boolean
  error: unknown
}

// The current Period's Reports payload (comparison + weekly + category spend),
// scoped to the active Household. The Period is resolved from the Household's
// start day against its today (pure helpers in #/shared/lib/period); the Period
// key doubles as the cache key so crossing into a new Period refetches. Disabled
// until the Household resolves. Mirrors usePeriodSummary in the transactions feature.
// `customRange` is required (and drives the query) when `view === 'custom'`.
export function useReports(
  view: ReportView = 'period',
  customRange?: Range | null,
): ReportsResult {
  const { ledger, today, loading: ledgerLoading } = useLedger()
  const householdId = ledger?.householdId ?? null
  const startDay = ledger?.periodStartDay ?? 1
  const weekStartDay = defaultLocaleWeekStartDay()

  const id = householdId ?? ''
  const customBounds =
    view === 'custom' && customRange ? rangeToBounds(customRange) : undefined
  const windowKey =
    view === 'custom'
      ? `${customBounds?.start}:${customBounds?.end}`
      : view === 'period'
        ? getPeriodKey(today, startDay)
        : view === 'calendar-month'
          ? resolveCalendarMonth(today).start
          : resolveCalendarWeek(today, weekStartDay).start

  const query = useQuery({
    queryKey: queryKeys.reports.report(id, view, windowKey),
    queryFn: () =>
      reportService.getReport(
        id,
        today,
        view,
        startDay,
        weekStartDay,
        customBounds,
      ),
    enabled: !!householdId && (view !== 'custom' || !!customBounds),
  })

  return {
    report: query.data ?? null,
    loading: ledgerLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
