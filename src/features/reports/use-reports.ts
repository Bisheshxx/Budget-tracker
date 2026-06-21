import { useQuery } from '@tanstack/react-query'
import { reportService } from '#/features/reports'
import { useProfile } from '#/features/profile/use-profile'
import { getPeriodKey, todayYmd } from '#/shared/period'
import type { PeriodReport } from './types'

interface ReportsResult {
  report: PeriodReport | null
  loading: boolean
  isError: boolean
  error: unknown
}

// The current Period's Reports payload (comparison + weekly + category spend),
// scoped to the user's profile. The Period is resolved from the profile's start
// day against today (pure helpers in #/shared/period); the Period key doubles as
// the cache key so crossing into a new Period refetches. Disabled until the
// profile resolves. Mirrors usePeriodSummary in the transactions feature.
export function useReports(): ReportsResult {
  const { profile, loading: profileLoading } = useProfile()
  const userId = profile?.id ?? null
  const startDay = profile?.budgetPeriodStartDay ?? 1

  const today = todayYmd()
  const id = userId ?? ''

  const query = useQuery({
    queryKey: ['reports', id, getPeriodKey(today, startDay)],
    queryFn: () => reportService.getPeriodReport(id, today, startDay),
    enabled: !!userId,
  })

  return {
    report: query.data ?? null,
    loading: profileLoading || query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
