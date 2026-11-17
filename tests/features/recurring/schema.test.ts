import { describe, expect, it } from 'vitest'
import {
  describeSchedule,
  recurringSchema,
  recurringToFormValues,
} from '#/features/recurring/schema.ts'
import type { RecurringTransaction } from '#/features/recurring/types.ts'

const valid = {
  name: 'Rent',
  categoryId: 'cat-1',
  amount: '1200',
  kind: 'expense',
  frequency: 'monthly',
  monthlyRuleType: 'day-of-month',
  firstDueDate: '2026-06-05',
  monthlyWeekday: '',
  monthlyNth: '',
}

// The first message reported at `path` for an invalid input, or undefined.
function issueAt(input: unknown, path: string): string | undefined {
  const result = recurringSchema.safeParse(input)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === path)?.message
}

const template: RecurringTransaction = {
  id: 're-1',
  userId: 'profile-1',
  categoryId: 'cat-1',
  name: 'Rent',
  amountCents: 120050,
  kind: 'expense',
  frequency: 'monthly',
  monthlyRule: { type: 'day-of-month', day: 5 },
  firstDueDate: '2026-06-05',
  active: true,
  createdAt: '2026-06-01T00:00:00.000Z',
  deactivatedAt: null,
}

describe('recurringSchema', () => {
  it('accepts a day-of-month template and coerces the string inputs', () => {
    expect(recurringSchema.parse(valid)).toEqual({
      name: 'Rent',
      categoryId: 'cat-1',
      amount: 1200,
      kind: 'expense',
      frequency: 'monthly',
      monthlyRuleType: 'day-of-month',
      firstDueDate: '2026-06-05',
    })
  })

  it('accepts an nth-weekday template without a first due date', () => {
    const result = recurringSchema.parse({
      ...valid,
      monthlyRuleType: 'nth-weekday',
      firstDueDate: '',
      monthlyWeekday: '5',
      monthlyNth: '-1',
    })

    expect(result).toMatchObject({ monthlyWeekday: 5, monthlyNth: -1 })
    expect(result.firstDueDate).toBeUndefined()
  })

  it.each([
    ['name', { name: '   ' }, 'Enter a name'],
    ['name', { name: 'x'.repeat(61) }, 'Name is too long'],
    ['categoryId', { categoryId: '' }, 'Pick a category'],
    ['amount', { amount: '' }, 'Enter an amount'],
    ['amount', { amount: '0' }, 'Amount must be greater than 0'],
    ['amount', { amount: '-5' }, 'Amount must be greater than 0'],
    ['kind', { kind: 'transfer' }, 'Pick expense or income'],
    ['frequency', { frequency: 'yearly' }, 'Pick a frequency'],
    ['firstDueDate', { firstDueDate: '' }, 'Pick the first due date'],
    ['firstDueDate', { firstDueDate: '05/06/2026' }, 'Pick the first due date'],
    [
      'firstDueDate',
      { firstDueDate: '2026-06-00' },
      'Pick a valid first due date',
    ],
    [
      'firstDueDate',
      { firstDueDate: '2026-06-29' },
      'Monthly first due date must be on or before the 28th',
    ],
  ])('rejects a bad %s (%o) with "%s"', (path, override, message) => {
    expect(issueAt({ ...valid, ...override }, path)).toBe(message)
  })

  it('allows a day past the 28th when the template is not monthly', () => {
    const result = recurringSchema.safeParse({
      ...valid,
      frequency: 'weekly',
      firstDueDate: '2026-06-30',
    })

    expect(result.success).toBe(true)
  })

  it('requires both the weekday and the occurrence for an nth-weekday rule', () => {
    const input = {
      ...valid,
      monthlyRuleType: 'nth-weekday',
      firstDueDate: '',
    }

    expect(issueAt(input, 'monthlyWeekday')).toBe('Pick a weekday')
    expect(issueAt(input, 'monthlyNth')).toBe('Pick which occurrence')
  })

  it('rejects an occurrence outside 1st-4th/last', () => {
    expect(
      issueAt(
        {
          ...valid,
          monthlyRuleType: 'nth-weekday',
          monthlyWeekday: '1',
          monthlyNth: '5',
        },
        'monthlyNth',
      ),
    ).toBe('Pick which occurrence')
  })
})

describe('recurringToFormValues', () => {
  it('seeds a day-of-month template, converting cents to display units', () => {
    expect(recurringToFormValues(template)).toEqual({
      name: 'Rent',
      categoryId: 'cat-1',
      amount: '1200.5',
      kind: 'expense',
      frequency: 'monthly',
      monthlyRuleType: 'day-of-month',
      firstDueDate: '2026-06-05',
      monthlyWeekday: '',
      monthlyNth: '',
    })
  })

  it('seeds an nth-weekday template with its rule and no date', () => {
    expect(
      recurringToFormValues({
        ...template,
        monthlyRule: { type: 'nth-weekday', weekday: 5, nth: -1 },
      }),
    ).toMatchObject({
      monthlyRuleType: 'nth-weekday',
      firstDueDate: '',
      monthlyWeekday: '5',
      monthlyNth: '-1',
    })
  })

  it('round-trips through the schema', () => {
    expect(
      recurringSchema.safeParse(recurringToFormValues(template)).success,
    ).toBe(true)
  })
})

describe('describeSchedule', () => {
  it.each([
    [{}, 'Expense · Monthly on the 5th, from 2026-06-05'],
    [
      { monthlyRule: { type: 'day-of-month', day: 1 } },
      'Expense · Monthly on the 1st, from 2026-06-05',
    ],
    [
      { monthlyRule: { type: 'day-of-month', day: 22 } },
      'Expense · Monthly on the 22nd, from 2026-06-05',
    ],
    [
      { monthlyRule: { type: 'day-of-month', day: 13 } },
      'Expense · Monthly on the 13th, from 2026-06-05',
    ],
    [
      { monthlyRule: { type: 'nth-weekday', weekday: 5, nth: -1 } },
      'Expense · Monthly on the last Friday, from 2026-06-05',
    ],
    [
      { monthlyRule: { type: 'nth-weekday', weekday: 1, nth: 3 } },
      'Expense · Monthly on the 3rd Monday, from 2026-06-05',
    ],
    [{ monthlyRule: null }, 'Expense · Monthly on the 5th, from 2026-06-05'],
    [
      { kind: 'income', frequency: 'weekly', monthlyRule: null },
      'Income · Weekly from 2026-06-05',
    ],
    [
      { frequency: 'fortnightly', monthlyRule: null },
      'Expense · Fortnightly from 2026-06-05',
    ],
  ] as [Partial<RecurringTransaction>, string][])(
    'describes %o as "%s"',
    (override, expected) => {
      expect(describeSchedule({ ...template, ...override })).toBe(expected)
    },
  )
})
