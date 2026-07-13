import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'

export function ReportsSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-[98.5rem] px-4 py-6 lg:py-8"
    >
      <span className="sr-only">Loading reports</span>
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-muted-foreground">
        How your real dated transactions are trending.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="default" size="sm" disabled>
          Period
        </Button>
        <Button type="button" variant="outline" size="sm" disabled>
          Calendar Month
        </Button>
        <Button type="button" variant="outline" size="sm" disabled>
          Calendar Week
        </Button>
      </div>
      <ReportsContentSkeleton />
    </main>
  )
}

export function ReportsContentSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12"
    >
      <span className="sr-only">Loading report data</span>
      <div className="lg:col-span-5">
        <ComparisonCardSkeleton />
      </div>
      <div className="flex flex-col gap-6 lg:col-span-7">
        <ChartCardSkeleton />
        <ChartCardSkeleton compact />
      </div>
    </div>
  )
}

function ComparisonCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <h2 className="leading-none font-semibold">
          Current view vs. previous
        </h2>
        <p className="text-sm text-muted-foreground">
          How your Cashflow compares with the previous matching window.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {['Income', 'Expenses', 'Remaining'].map((label) => (
            <div
              key={label}
              className="rounded-xl border border-border px-4 py-3"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {label}
              </p>
              <Skeleton className="mt-2 h-7 w-24" />
              <Skeleton className="mt-2 h-4 w-16" />
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-semibold">By category</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {Array.from({ length: 5 }, (_item, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-4"
              >
                <Skeleton className="h-6 w-32 max-w-full" />
                <Skeleton className="h-5 w-20 shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="leading-none font-semibold">
          {compact ? 'Spend by category' : 'Weekly Cashflow'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {compact
            ? 'Where your money went this Period.'
            : 'Income vs. expenses by week this Period.'}
        </p>
      </CardHeader>
      <CardContent>
        {compact ? <PieChartSkeleton /> : <BarChartSkeleton />}
      </CardContent>
    </Card>
  )
}

function BarChartSkeleton() {
  return (
    <div className="flex h-60 items-end gap-3 border-b border-l border-border px-3 pb-4">
      {Array.from({ length: 8 }, (_item, index) => (
        <div key={index} className="flex flex-1 items-end gap-1">
          <Skeleton className="h-24 flex-1" />
          <Skeleton className="h-36 flex-1" />
        </div>
      ))}
    </div>
  )
}

function PieChartSkeleton() {
  return (
    <div className="flex h-60 items-center justify-center">
      <div className="relative size-[11.5rem]">
        <Skeleton className="size-full rounded-full" />
        <div className="absolute inset-9 rounded-full bg-card" />
      </div>
    </div>
  )
}
