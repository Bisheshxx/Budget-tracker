import { createFileRoute } from '@tanstack/react-router'
import { useReports } from '#/features/reports/use-reports'
import { useProfile } from '#/features/profile/use-profile'
import { PeriodComparisonCard } from '#/features/reports/components/PeriodComparisonCard'
import { WeeklyCashflowChart } from '#/features/reports/components/WeeklyCashflowChart'
import { CategorySpendChart } from '#/features/reports/components/CategorySpendChart'

// Reports surface (issue 07): Period Comparison (this Period vs. last, % and
// amount, overall + per category), income-vs-expenses / category-spend charts,
// and a weekly breakdown. Read-only; no AI (deferred per ADR 0001).
export const Route = createFileRoute('/_authed/reports')({
  component: ReportsPage,
})

function ReportsPage() {
  const { report, loading, isError } = useReports()
  const { profile } = useProfile()
  const currency = profile?.currency ?? 'USD'

  return (
    <main className="mx-auto w-full max-w-[98.5rem] px-4 py-6 lg:py-8">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-muted-foreground">
        How your spending is trending this Period.
      </p>

      {loading || !report ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {isError ? 'Could not load your reports.' : 'Loading…'}
        </p>
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
