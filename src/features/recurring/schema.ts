import { z } from 'zod'
import { fromCents } from '#/lib/money'
import type { RecurringExpense } from './types'

// Single source of truth for the Recurring Expense form. Used by the form (via
// @hookform/resolvers' zodResolver) AND by RecurringService as a backstop, so the
// rules never drift between UI and service. Amounts are entered in display units;
// the service converts to integer cents. See CONTEXT.md.

export const RECURRING_FREQUENCIES = [
  'weekly',
  'fortnightly',
  'monthly',
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
    firstDueDate: z.preprocess(
      blankToUndefined,
      z
        .string({ message: 'Pick the first due date' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick the first due date'),
    ),
  })
  .superRefine((val, ctx) => {
    const day = Number(val.firstDueDate.slice(8, 10))
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      ctx.addIssue({
        code: 'custom',
        message: 'Pick a valid first due date',
        path: ['firstDueDate'],
      })
    }
    if (val.frequency === 'monthly' && day > 28) {
      ctx.addIssue({
        code: 'custom',
        message: 'Monthly first due date must be on or before the 28th',
        path: ['firstDueDate'],
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
    firstDueDate: re.firstDueDate,
  }
}

// Human-readable schedule for a template. Used in the management list.
export function describeSchedule(re: RecurringExpense): string {
  if (re.frequency === 'monthly') {
    const day = Number(re.firstDueDate.slice(8, 10))
    return `Monthly on the ${ordinal(day)}, from ${re.firstDueDate}`
  }
  const label = re.frequency === 'weekly' ? 'Weekly' : 'Fortnightly'
  return `${label} from ${re.firstDueDate}`
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${suffix}`
}
