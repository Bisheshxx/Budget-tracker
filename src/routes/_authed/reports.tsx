import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useReports } from '#/features/reports/use-reports'
import { useProfile } from '#/shared/hooks/use-profile'
import { PeriodComparisonCard } from '#/features/reports/components/PeriodComparisonCard'
import { WeeklyCashflowChart } from '#/features/reports/components/WeeklyCashflowChart'
import { CategorySpendChart } from '#/features/reports/components/CategorySpendChart'
import { Button } from '#/components/ui/button'
import { RangeFilter } from '#/shared/components/RangeFilter'
import { ReportsContentSkeleton } from '#/shared/components/skeleton-loaders/ReportsSkeleton'
import { rangeSearchSchema } from '#/shared/schemas/transaction.schema'
import { searchToRange } from '#/shared/utils/range.util'
import type { ReportView } from '#/features/reports/types'

// Reports surface (issue 07): Period Comparison (this Period vs. last, % and
// amount, overall + per category), income-vs-expenses / category-spend charts,
// and a weekly breakdown. Read-only; no AI (deferred per ADR 0001). `?from=&to=`
// selects an arbitrary Custom range (mirrors the Dashboard's Range filter) —
// present, it takes over from whichever preset button was last selected.
export const Route = createFileRoute('/_authed/reports')({
  validateSearch: (search) => rangeSearchSchema.parse(search),
  component: ReportsPage,
})

type PresetView = Exclude<ReportView, 'custom'>

function ReportsPage() {
  const navigate = useNavigate()
  const { from, to } = Route.useSearch()
  const customRange = searchToRange(from, to)
  const [presetView, setPresetView] = useState<PresetView>('period')
  const view: ReportView = customRange ? 'custom' : presetView

  const { report, loading, isError } = useReports(view, customRange)
  const { profile } = useProfile()
  const currency = profile?.currency ?? 'USD'

  return (
    <main className="mx-auto w-full max-w-[98.5rem] px-4 py-6 lg:py-8">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-muted-foreground">
        How your real dated transactions are trending.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {REPORT_VIEWS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={view === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setPresetView(option.value)
              // Only one selection can be active — dropping a Custom range in
              // favor of a preset clears `?from=&to=`.
              if (customRange) navigate({ to: '/reports', search: {} })
            }}
          >
            {option.label}
          </Button>
        ))}
        <RangeFilter
          range={customRange}
          placeholder="Custom range"
          onApply={(range) => navigate({ to: '/reports', search: range })}
          onClear={() => navigate({ to: '/reports', search: {} })}
        />
      </div>

      {isError ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Could not load your reports.
        </p>
      ) : loading || !report ? (
        <ReportsContentSkeleton />
      ) : (
        // Left column: the (potentially tall) Period comparison breakdown.
        // Right column: the two charts stacked. Single column below lg.
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <PeriodComparisonCard
              comparison={report.comparison}
              currency={currency}
            />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-7">
            <WeeklyCashflowChart weeks={report.weeks} currency={currency} />
            <CategorySpendChart
              breakdown={report.currentByCategory}
              currency={currency}
            />
          </div>
        </div>
      )}
    </main>
  )
}

const REPORT_VIEWS: { value: PresetView; label: string }[] = [
  { value: 'period', label: 'Period' },
  { value: 'calendar-month', label: 'Calendar Month' },
  { value: 'calendar-week', label: 'Calendar Week' },
]
