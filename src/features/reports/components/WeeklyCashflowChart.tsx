import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney } from '#/lib/money'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import type { WeekSlice } from '#/features/reports/types'

// Income vs. expenses for the current Period, sliced into its weeks (covers both
// the "income vs expenses" chart and the "weekly spend" breakdown). Recharts
// reads colors from the semantic theme tokens via var(), so it recolors with the
// rest of the app. Amounts stay in integer cents and format at the axis/tooltip.
export function WeeklyCashflowChart({
  weeks,
  currency,
}: {
  weeks: WeekSlice[]
  currency: string
}) {
  const data = weeks.map((week, i) => ({
    label: `Wk ${i + 1}`,
    income: week.incomeCents,
    expenses: week.expensesCents,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Cashflow</CardTitle>
        <p className="text-sm text-muted-foreground">
          Income vs. expenses by week this Period.
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
            />
            <YAxis
              width={64}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(cents: number) => formatMoney(cents, currency)}
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value), currency)}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--foreground)',
              }}
              cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="income"
              name="Income"
              fill="var(--income)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="var(--expense)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
