import { z } from 'zod'
import { fromCents } from '#/lib/money'
import type { RecurringExpense } from './types'

// Single source of truth for the Recurring Expense form. Used by the form (via
// @hookform/resolvers' zodResolver) AND by RecurringService as a backstop, so the
// rules never drift between UI and service. Amounts are entered in display units;
// the service converts to integer cents. See CONTEXT.md.

export const RECURRING_FREQUENCIES = ['weekly', 'monthly'] as const

// Day-of-week labels for weekly anchors (index = anchor_day 0–6, matching
// JS getDay() and the DB CHECK). Monthly anchors are a day-of-month 1–28.
export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

const blankToUndefined = (v: unknown) => {
  if (v === null) return undefined
  if (typeof v === 'string' && v.trim() === '') return undefined
  return v
}

export const recurringSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(60, 'Name is too long'),
    // Required — a Recurring Expense always belongs to a category (no Uncategorized).
    categoryId: z.string().min(1, 'Pick a category'),
    // Blank → undefined first so an empty input reads as "Enter an amount" rather
    // than coercing to 0 (mirrors transactions/schema.ts).
    amount: z.preprocess(
      blankToUndefined,
      z.coerce
        .number({ message: 'Enter an amount' })
        .positive('Amount must be greater than 0'),
    ),
    frequency: z.enum(RECURRING_FREQUENCIES, { message: 'Pick a frequency' }),
    anchorDay: z.preprocess(
      blankToUndefined,
      z.coerce.number({ message: 'Pick when it recurs' }).int(),
    ),
  })
  // anchor_day is interpreted by frequency — validate the range to match the DB's
  // frequency-keyed CHECK so an invalid pairing never reaches the service/DB.
  .superRefine((val, ctx) => {
    if (
      val.frequency === 'weekly' &&
      (val.anchorDay < 0 || val.anchorDay > 6)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Pick a day of the week',
        path: ['anchorDay'],
      })
    }
    if (
      val.frequency === 'monthly' &&
      (val.anchorDay < 1 || val.anchorDay > 28)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Pick a day between 1 and 28',
        path: ['anchorDay'],
      })
    }
  })

export type RecurringInput = z.infer<typeof recurringSchema>
// Pre-coercion shape the form binds to (inputs start as strings).
export type RecurringFormValues = z.input<typeof recurringSchema>

// Seed the form from an existing template for edit mode. Cents → display units
// for the amount input; numbers → strings for the controlled select/inputs.
export function recurringToFormValues(
  re: RecurringExpense,
): RecurringFormValues {
  return {
    name: re.name,
    categoryId: re.categoryId,
    amount: String(fromCents(re.amountCents)),
    frequency: re.frequency,
    anchorDay: String(re.anchorDay),
  }
}

// Human-readable schedule for a template (e.g. "Monthly on the 1st",
// "Weekly on Tuesday"). Used in the management list.
export function describeSchedule(re: RecurringExpense): string {
  if (re.frequency === 'weekly') {
    return `Weekly on ${WEEKDAY_LABELS[re.anchorDay]}`
  }
  return `Monthly on the ${ordinal(re.anchorDay)}`
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${suffix}`
}
