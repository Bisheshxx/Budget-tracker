import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useCategoryLookup } from '#/features/categories/use-category-lookup'
import { formatMoney } from '#/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { CategorySpend } from '#/features/transactions/types'

// Spend-by-category for the current Period as a donut. Each slice is colored by
// the category's own stored colorHex (runtime data from the DB, not a source
// literal — so it's fine past the raw-color ESLint guard); a category with no
// color falls back to the teal accent token.
export function CategorySpendChart({
  breakdown,
  currency,
}: {
  breakdown: CategorySpend[]
  currency: string
}) {
  const { categoryFor } = useCategoryLookup()

  const data = breakdown.map((spend) => {
    const category = categoryFor(spend.categoryId)
    return {
      name: category?.name ?? 'Uncategorized',
      value: spend.amountCents,
      color: category?.colorHex ?? 'var(--primary)',
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend by category</CardTitle>
        <p className="text-sm text-muted-foreground">
          Where your money went this Period.
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No expenses yet this Period.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={56}
                outerRadius={92}
                paddingAngle={2}
                stroke="var(--card)"
              >
                {data.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(Number(value), currency)}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--foreground)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
