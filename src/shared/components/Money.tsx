import { formatMoney } from '#/lib/money'
import { cn } from '#/lib/utils'

type Tone = 'income' | 'expense' | 'neutral'

const TONE_CLASS: Record<Tone, string> = {
  income: 'text-income',
  expense: 'text-expense',
  neutral: 'text-foreground',
}

/**
 * Canonical way to render a money amount. Takes integer cents (the stored unit,
 * see #/lib/money) + the user's currency, colors it by `tone`, and uses tabular
 * numerals so columns align. Use this instead of hand-formatting amounts so money
 * always reads the same across the app.
 */
export function Money({
  cents,
  currency,
  tone = 'neutral',
  signed = false,
  className,
}: {
  cents: number
  currency: string
  tone?: Tone
  /** Force a leading + on positive amounts (negatives always show a sign). */
  signed?: boolean
  className?: string
}) {
  return (
    <span
      className={cn('tabular-nums', TONE_CLASS[tone], className)}
      data-testid="money"
    >
      {formatMoney(cents, currency, signed ? { signDisplay: 'always' } : undefined)}
    </span>
  )
}
