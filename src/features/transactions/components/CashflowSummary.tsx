import { usePeriodSummary } from '#/features/transactions/use-transactions'
import { useProfile } from '#/features/profile/use-profile'
import { useCategories } from '#/features/categories/use-categories'
import { CategoryChip } from '#/features/categories/components/CategoryChip'
import { Money } from '#/shared/components/Money'
import { MoneyBadge } from '#/shared/components/MoneyBadge'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { Category } from '#/features/categories/types'
import type {
  CategorySpend,
  PeriodSummary,
} from '#/features/transactions/types'

// The Dashboard's primary surface: the current Period's Cashflow at a glance —
// income in, expenses out, net — plus timing context, a spend-by-category
// breakdown, and the Budget Target as a soft reference (never pass/fail).
export function CashflowSummary() {
  const { summary, daysIntoPeriod, loading } = usePeriodSummary()
  const { profile } = useProfile()

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Period</CardTitle>
        {/* Held back until loaded: before the profile resolves the start day
            defaults to 1, which would briefly show the wrong day count. */}
        {!loading && summary && (
          <p className="text-sm text-muted-foreground">
            Day {daysIntoPeriod} of this Period
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading || !summary ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <PeriodSummaryView
            summary={summary}
            currency={profile?.currency ?? 'USD'}
            targetCents={profile?.monthlyBudgetTargetCents ?? 0}
          />
        )}
      </CardContent>
    </Card>
  )
}

// The loaded body: Cashflow totals, the soft Budget Target, and the
// spend-by-category breakdown. Split out from CashflowSummary so the loading
// shell stays trivial and this renders only with a resolved summary.
function PeriodSummaryView({
  summary,
  currency,
  targetCents,
}: {
  summary: PeriodSummary
  currency: string
  targetCents: number
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
          <p className="text-xs font-semibold text-muted-foreground">Net</p>
          <Money
            cents={summary.netCents}
            currency={currency}
            tone={summary.netCents >= 0 ? 'income' : 'expense'}
            signed
            className="mt-1 block text-lg font-bold"
          />
        </div>
      </div>

      <BudgetTargetReference
        spentCents={summary.expensesCents}
        targetCents={targetCents}
        currency={currency}
      />

      <CategoryBreakdown breakdown={summary.byCategory} currency={currency} />
    </div>
  )
}

// Budget Target as a soft mindset anchor: the spend-against-target bar uses the
// teal accent regardless of whether spend exceeds the target — no red, no
// verdict. Hidden entirely when no target is set (target of 0).
function BudgetTargetReference({
  spentCents,
  targetCents,
  currency,
}: {
  spentCents: number
  targetCents: number
  currency: string
}) {
  if (targetCents <= 0) return null

  // Cap the bar at 100% so overspend doesn't overflow the track; the amounts
  // below tell the real story without flagging pass/fail.
  const pct = Math.min(100, Math.round((spentCents / targetCents) * 100))

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Budget Target</span>
        <span className="text-muted-foreground">
          <Money cents={spentCents} currency={currency} /> of{' '}
          <Money cents={targetCents} currency={currency} />
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Spend-by-category breakdown. Resolves each categoryId to a real Category
// (null → the seeded Uncategorized row, mirroring RecentTransactions) and shows
// a proportional bar against the largest category.
function CategoryBreakdown({
  breakdown,
  currency,
}: {
  breakdown: CategorySpend[]
  currency: string
}) {
  const { categories } = useCategories()

  const byId = new Map(categories.map((c) => [c.id, c]))
  const uncategorized =
    categories.find((c) => c.isSystem && c.name === 'Uncategorized') ?? null
  const categoryFor = (categoryId: string | null): Category | null =>
    categoryId ? (byId.get(categoryId) ?? uncategorized) : uncategorized

  if (breakdown.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold">Spend by category</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No expenses yet this Period.
        </p>
      </div>
    )
  }

  const max = breakdown[0].amountCents // sorted most-spent first by the service

  return (
    <div>
      <h3 className="text-sm font-semibold">Spend by category</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {breakdown.map((spend) => (
          <li key={spend.categoryId ?? 'uncategorized'}>
            <div className="flex items-center justify-between gap-4">
              <CategoryChip
                category={categoryFor(spend.categoryId)}
                className="text-sm"
              />
              <Money
                cents={spend.amountCents}
                currency={currency}
                tone="expense"
                className="text-sm font-medium"
              />
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round((spend.amountCents / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
