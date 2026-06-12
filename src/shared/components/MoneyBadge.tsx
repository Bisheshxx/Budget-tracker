import { Money } from './Money'
import { cn } from '#/lib/utils'

/**
 * A money-in / money-out pill: tinted background (bg-income-bg / bg-expense-bg)
 * with matching text, wrapping a <Money>. Use for the income/expense chips on
 * cashflow summaries so the green/red money semantics are applied consistently.
 */
export function MoneyBadge({
  cents,
  currency,
  tone,
  label,
  className,
}: {
  cents: number
  currency: string
  tone: 'income' | 'expense'
  /** Optional small caption above the amount (e.g. "Income", "Spent"). */
  label?: string
  className?: string
}) {
  const surface =
    tone === 'income' ? 'bg-income-bg text-income' : 'bg-expense-bg text-expense'

  return (
    <div className={cn('rounded-xl px-4 py-3', surface, className)}>
      {label && <p className="text-xs font-semibold">{label}</p>}
      <Money
        cents={cents}
        currency={currency}
        tone={tone}
        signed
        className="mt-1 block text-lg font-bold"
      />
    </div>
  )
}
