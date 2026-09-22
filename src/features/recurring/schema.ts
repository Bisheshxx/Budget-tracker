import { z } from 'zod'
import { fromCents } from '#/lib/money'
import {
  MONTHLY_NTH_VALUES,
  MONTHLY_RULE_TYPES,
  RECURRING_FREQUENCIES,
  RECURRING_KINDS,
} from './constants/recurring.constant'
import type { MonthlyNth, RecurringTransaction } from './types'

// Single source of truth for the Recurring Transaction form. Used by the form
// (via @hookform/resolvers' zodResolver) AND by RecurringService as a backstop,
// so the rules never drift between UI and service. Amounts are entered in
// display units; the service converts to integer cents. See CONTEXT.md.

export { RECURRING_FREQUENCIES, RECURRING_KINDS, MONTHLY_RULE_TYPES }

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

const blankToUndefined = (v: unknown) => {
  if (v === null) return undefined
  if (typeof v === 'string' && v.trim() === '') return undefined
  return v
}

export const recurringSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(60, 'Name is too long'),
    // Required — a Recurring Transaction always belongs to a category (no
    // Uncategorized), regardless of kind: templates are a small, deliberately
    // curated set where picking a category once is cheap and materially
    // improves reporting. See docs/adr/0010.
    categoryId: z.string().min(1, 'Pick a category'),
    // Blank → undefined first so an empty input reads as "Enter an amount"
    // rather than coercing to 0 (mirrors transactions/schema.ts).
    amount: z.preprocess(
      blankToUndefined,
      z.coerce
        .number({ message: 'Enter an amount' })
        .positive('Amount must be greater than 0'),
    ),
    kind: z.enum(RECURRING_KINDS, { message: 'Pick expense or income' }),
    frequency: z.enum(RECURRING_FREQUENCIES, { message: 'Pick a frequency' }),
    // Monthly-only. day-of-month keeps the concrete firstDueDate date input;
    // nth-weekday doesn't collect firstDueDate at all — the service derives it
    // from the rule (never client-trusted, see RecurringService.create/update).
    monthlyRuleType: z.preprocess(
      blankToUndefined,
      z.enum(MONTHLY_RULE_TYPES).optional(),
    ),
    firstDueDate: z.preprocess(
      blankToUndefined,
      z.string().regex(YMD_RE, 'Pick the first due date').optional(),
    ),
    monthlyWeekday: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(0).max(6).optional(),
    ),
    monthlyNth: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .int()
        .refine((n) => (MONTHLY_NTH_VALUES as readonly number[]).includes(n), {
          message: 'Pick which occurrence',
        })
        .optional(),
    ),
  })
  .superRefine((val, ctx) => {
    const isNthWeekday =
      val.frequency === 'monthly' && val.monthlyRuleType === 'nth-weekday'

    if (isNthWeekday) {
      if (val.monthlyWeekday === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'Pick a weekday',
          path: ['monthlyWeekday'],
        })
      }
      if (val.monthlyNth === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'Pick which occurrence',
          path: ['monthlyNth'],
        })
      }
      return
    }

    if (!val.firstDueDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Pick the first due date',
        path: ['firstDueDate'],
      })
      return
    }
    const day = Number(val.firstDueDate.slice(8, 10))
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      ctx.addIssue({
        code: 'custom',
        message: 'Pick a valid first due date',
        path: ['firstDueDate'],
      })
      return
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
  rt: RecurringTransaction,
): RecurringFormValues {
  const rule = rt.monthlyRule
  const isNthWeekday = rule?.type === 'nth-weekday'
  return {
    name: rt.name,
    categoryId: rt.categoryId,
    amount: String(fromCents(rt.amountCents)),
    kind: rt.kind,
    frequency: rt.frequency,
    monthlyRuleType: rule?.type ?? 'day-of-month',
    firstDueDate: isNthWeekday ? '' : rt.firstDueDate,
    monthlyWeekday: isNthWeekday ? String(rule.weekday) : '',
    monthlyNth: isNthWeekday ? String(rule.nth) : '',
  }
}

// Human-readable schedule for a template. Used in the management list.
export function describeSchedule(rt: RecurringTransaction): string {
  const kindLabel = rt.kind === 'income' ? 'Income' : 'Expense'
  if (rt.frequency === 'monthly') {
    const rule = rt.monthlyRule
    if (rule?.type === 'nth-weekday') {
      return `${kindLabel} · Monthly on the ${nthLabel(rule.nth)} ${weekdayName(rule.weekday)}, from ${rt.firstDueDate}`
    }
    const day =
      rule?.type === 'day-of-month'
        ? rule.day
        : Number(rt.firstDueDate.slice(8, 10))
    return `${kindLabel} · Monthly on the ${ordinal(day)}, from ${rt.firstDueDate}`
  }
  const label = rt.frequency === 'weekly' ? 'Weekly' : 'Fortnightly'
  return `${kindLabel} · ${label} from ${rt.firstDueDate}`
}

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')
  return `${n}${suffix}`
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? 'day'
}

function nthLabel(nth: MonthlyNth): string {
  return nth === -1 ? 'last' : ordinal(nth)
}
