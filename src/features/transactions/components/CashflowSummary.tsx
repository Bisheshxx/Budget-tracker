import { usePeriodSummary } from '#/features/transactions/use-transactions'
import { useProfile } from '#/features/profile/use-profile'
import { useCategoryLookup } from '#/features/categories/use-category-lookup'
import { CategoryChip } from '#/features/categories/components/CategoryChip'
import { RangeFilter } from '#/features/transactions/components/RangeFilter'
import { formatRangeLabel, rangeToBounds } from '#/features/transactions/range'
import type { Range } from '#/features/transactions/range'
import { Money } from '#/shared/components/Money'
import { MoneyBadge } from '#/shared/components/MoneyBadge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { parseYmd, todayYmd } from '#/shared/lib/period'
import type {
  CategorySpend,
  PeriodSummary,
} from '#/features/transactions/types'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

function currentMonthName(): string {
  const { month } = parseYmd(todayYmd())
  return MONTH_NAMES[month - 1]
}

// The Dashboard's primary surface: Cashflow at a glance — income in, expenses
// out, remaining from income — plus a spend-by-category breakdown. By default it summarizes the
// current Period (with timing context); when a `range` is active (PRD B) it
// re-scopes to that arbitrary span and retitles to the Range. The Range filter
// that drives `range` lives in this card header so the date scope sits with the
// summary it changes.
export function CashflowSummary({ range }: { range?: Range | null }) {
  const activeRange = range ?? null
  const { summary, daysIntoPeriod, loading } = usePeriodSummary(
    activeRange ? rangeToBounds(activeRange) : undefined,
  )
  const { profile } = useProfile()
  const monthName = currentMonthName()

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>
              {activeRange ? formatRangeLabel(activeRange) : monthName}
            </CardTitle>
            {/* Held back until loaded: before the profile resolves the start day
                defaults to 1, which would briefly show the wrong day count. The
                day count is a Period concept — omitted under a Range. */}
            {!activeRange && !loading && summary && (
              <p className="mt-1 text-sm text-muted-foreground">
                Day {daysIntoPeriod} of {monthName}
              </p>
            )}
          </div>
          <RangeFilter range={activeRange} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {loading || !summary ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <PeriodSummaryView
            summary={summary}
            currency={profile?.currency ?? 'USD'}
            // Empty-breakdown copy stays Period-accurate by default; a Range
            // never calls itself a "Period" (see CONTEXT.md).
            emptyBreakdownLabel={
              activeRange
                ? 'No expenses in this range.'
                : `No expenses yet in ${monthName}.`
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

// The loaded body: Cashflow totals and the spend-by-category breakdown. Split
// out from CashflowSummary so the loading
// shell stays trivial and this renders only with a resolved summary.
function PeriodSummaryView({
  summary,
  currency,
  emptyBreakdownLabel,
}: {
  summary: PeriodSummary
  currency: string
  emptyBreakdownLabel: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MoneyBadge
          cents={summary.incomeCents}
          currency={currency}
          tone="income"
          label="Income in"
        />
        <MoneyBadge
          cents={summary.expensesCents}
          currency={currency}
          tone="expense"
          label="Expenses out"
        />
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Remaining from income
          </p>
          <Money
            cents={summary.netCents}
            currency={currency}
            tone={summary.netCents >= 0 ? 'income' : 'expense'}
            signed
            className="mt-1 block text-lg font-bold"
          />
        </div>
      </div>

      <CategoryBreakdown
        breakdown={summary.byCategory}
        currency={currency}
        emptyLabel={emptyBreakdownLabel}
      />
    </div>
  )
}

// Spend-by-category breakdown. Resolves each categoryId to a real Category
// (null → the seeded Uncategorized row, mirroring RecentTransactions) and shows
// a single stacked bar — one colored segment per category, sized by its share of
// total spend — over a legend listing each category's amount and % of total.
function CategoryBreakdown({
  breakdown,
  currency,
  emptyLabel,
}: {
  breakdown: CategorySpend[]
  currency: string
  emptyLabel: string
}) {
  const { categoryFor } = useCategoryLookup()

  if (breakdown.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold">Spend by category</h3>
        <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  // Share of total spend is the meaningful number here (not size relative to the
  // top category). breakdown is pre-sorted most-spent-first by the service.
  const total = breakdown.reduce((sum, spend) => sum + spend.amountCents, 0)
  const segments = breakdown.map((spend) => {
    const category = categoryFor(spend.categoryId)
    return {
      key: spend.categoryId ?? 'uncategorized',
      category,
      amountCents: spend.amountCents,
      // colorHex is runtime data, not a source literal — it clears the raw-color
      // ESLint guard; a category with no color falls back to the teal accent.
      color: category?.colorHex ?? 'var(--primary)',
      pct: Math.round((spend.amountCents / total) * 100),
    }
  })

  return (
    <div>
      <h3 className="text-sm font-semibold">Spend by category</h3>
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className="h-full"
            style={{ width: `${segment.pct}%`, backgroundColor: segment.color }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {segments.map((segment) => (
          <li
            key={segment.key}
            className="flex items-center justify-between gap-4"
          >
            <CategoryChip category={segment.category} className="text-sm" />
            <div className="flex items-center gap-3">
              <Money
                cents={segment.amountCents}
                currency={currency}
                tone="expense"
                className="text-sm font-medium"
              />
              <span className="w-9 text-right text-sm text-muted-foreground">
                {segment.pct}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
