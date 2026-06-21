import { Money } from '#/shared/components/Money'
import { cn } from '#/lib/utils'
import type { Delta } from '#/features/reports/types'

// Renders a single comparison delta as both an absolute amount and a percentage
// — e.g. "+$120 (+18%)" or "+$500 (new)". `tone` decides whether an *increase*
// reads as good (income/net) or as spending (expenses); the color follows the
// direction of change accordingly, never a pass/fail verdict on the absolute
// number. A previous Period of 0 has no percentage base, so we show "new".
export function DeltaDisplay({
  delta,
  currency,
  /** 'spend' = up is expense-toned; 'earn' = up is income-toned. */
  direction,
  className,
}: {
  delta: Delta
  currency: string
  direction: 'spend' | 'earn'
  className?: string
}) {
  const { deltaCents, deltaPercent } = delta

  // No change at all — keep it neutral and quiet.
  const isFlat = deltaCents === 0
  const isUp = deltaCents > 0
  // For spending, up is the "bad" (expense) tone; for earning, up is income.
  const tone = isFlat
    ? 'neutral'
    : (isUp ? direction === 'spend' : direction === 'earn')
      ? 'expense'
      : 'income'

  const percentLabel =
    deltaPercent === null
      ? 'new'
      : `${deltaPercent > 0 ? '+' : ''}${Math.round(deltaPercent * 100)}%`

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <Money cents={deltaCents} currency={currency} tone={tone} signed />
      <span className="text-xs text-muted-foreground">({percentLabel})</span>
    </span>
  )
}
