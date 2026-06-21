import { useCategoryLookup } from '#/features/categories/use-category-lookup'
import { CategoryChip } from '#/features/categories/components/CategoryChip'
import { Money } from '#/shared/components/Money'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { DeltaDisplay } from './DeltaDisplay'
import type { CategoryDelta, PeriodComparison } from '#/features/reports/types'

// Period Comparison: this Period vs. the previous one. Overall income, expenses,
// and net are shown as both an amount and a percentage change, then a
// per-category breakdown so the user sees which categories drove the change.
export function PeriodComparisonCard({
  comparison,
  currency,
}: {
  comparison: PeriodComparison
  currency: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>This Period vs. last</CardTitle>
        <p className="text-sm text-muted-foreground">
          How your Cashflow compares with the previous Period.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <OverallRow
            label="Income"
            currency={currency}
            comparison={comparison.income}
            direction="earn"
          />
          <OverallRow
            label="Expenses"
            currency={currency}
            comparison={comparison.expenses}
            direction="spend"
          />
          <OverallRow
            label="Net"
            currency={currency}
            comparison={comparison.net}
            direction="earn"
          />
        </div>

        <CategoryComparison
          breakdown={comparison.byCategory}
          currency={currency}
        />
      </CardContent>
    </Card>
  )
}

function OverallRow({
  label,
  currency,
  comparison,
  direction,
}: {
  label: string
  currency: string
  comparison: PeriodComparison['income']
  direction: 'spend' | 'earn'
}) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <Money
        cents={comparison.currentCents}
        currency={currency}
        tone="neutral"
        signed={label === 'Net'}
        className="mt-1 block text-lg font-bold"
      />
      <DeltaDisplay
        delta={comparison}
        currency={currency}
        direction={direction}
        className="mt-1"
      />
    </div>
  )
}

// Per-category expense comparison. Resolves each categoryId to a real Category
// (null → the seeded Uncategorized row, mirroring CashflowSummary) so the labels
// match the rest of the app.
function CategoryComparison({
  breakdown,
  currency,
}: {
  breakdown: CategoryDelta[]
  currency: string
}) {
  const { categoryFor } = useCategoryLookup()

  if (breakdown.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold">By category</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No expenses in either Period.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">By category</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {breakdown.map((cat) => (
          <li
            key={cat.categoryId ?? 'uncategorized'}
            className="flex items-center justify-between gap-4"
          >
            <CategoryChip
              category={categoryFor(cat.categoryId)}
              className="text-sm"
            />
            <DeltaDisplay delta={cat} currency={currency} direction="spend" />
          </li>
        ))}
      </ul>
    </div>
  )
}
