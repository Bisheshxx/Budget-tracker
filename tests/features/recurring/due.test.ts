import { describe, expect, it } from 'vitest'
import {
  computeDue,
  nextOccurrenceOnOrAfter,
} from '#/features/recurring/due.ts'
import type { PeriodRange } from '#/shared/lib/period.ts'
import type { RecurringTransaction } from '#/features/recurring/types.ts'

// June 2026 starts on a Monday (getUTCDay === 1), so Mondays fall on the 1st,
// 8th, 15th, 22nd, and 29th — used by the weekly cases below. Fridays fall on
// the 5th, 12th, 19th, and 26th (June 2026 has exactly 4 Fridays).
const PERIOD: PeriodRange = { start: '2026-06-01', end: '2026-07-01' }

function makeTemplate(
  overrides: Partial<RecurringTransaction> = {},
): RecurringTransaction {
  return {
    id: 're-1',
    userId: 'profile-1',
    categoryId: 'cat-1',
    name: 'Rent',
    amountCents: 120000,
    kind: 'expense',
    frequency: 'monthly',
    monthlyRule: { type: 'day-of-month', day: 5 },
    firstDueDate: '2026-06-05',
    active: true,
    createdAt: '2026-06-01T00:00:00.000Z',
    deactivatedAt: null,
    ...overrides,
  }
}

describe('computeDue', () => {
  describe('monthly (day-of-month)', () => {
    it('surfaces once per month on the first due date day when it has passed', () => {
      const template = makeTemplate({
        frequency: 'monthly',
        firstDueDate: '2026-06-05',
      })

      const due = computeDue([template], PERIOD, '2026-06-20', [])

      expect(due).toEqual([
        { recurringTransaction: template, occurrenceDate: '2026-06-05' },
      ])
    })

    it('does not surface before its anchor date in the Period', () => {
      const template = makeTemplate({
        frequency: 'monthly',
        firstDueDate: '2026-06-05',
      })

      const due = computeDue([template], PERIOD, '2026-06-03', [])

      expect(due).toEqual([])
    })

    it('continues monthly from the first due date day across window boundaries', () => {
      const period: PeriodRange = { start: '2026-06-15', end: '2026-07-15' }
      const template = makeTemplate({
        frequency: 'monthly',
        firstDueDate: '2026-06-05',
      })

      const due = computeDue([template], period, '2026-07-10', [])

      expect(due).toEqual([
        { recurringTransaction: template, occurrenceDate: '2026-07-05' },
      ])
    })

    it('excludes an occurrence already confirmed or skipped', () => {
      const template = makeTemplate({
        frequency: 'monthly',
        firstDueDate: '2026-06-05',
      })

      const due = computeDue([template], PERIOD, '2026-06-20', [
        { recurringTransactionId: 're-1', occurrenceDate: '2026-06-05' },
      ])

      expect(due).toEqual([])
    })
  })

  describe('monthly (nth-weekday)', () => {
    it('surfaces on the 2nd Tuesday of the month', () => {
      // June 2026 Tuesdays: 2, 9, 16, 23, 30 — 2nd Tuesday is the 9th.
      const template = makeTemplate({
        frequency: 'monthly',
        monthlyRule: { type: 'nth-weekday', weekday: 2, nth: 2 },
        firstDueDate: '2026-06-09',
      })

      const due = computeDue([template], PERIOD, '2026-06-20', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual(['2026-06-09'])
    })

    it('surfaces on the last Friday of a 4-Friday month', () => {
      // June 2026 has exactly 4 Fridays: 5, 12, 19, 26.
      const template = makeTemplate({
        frequency: 'monthly',
        monthlyRule: { type: 'nth-weekday', weekday: 5, nth: -1 },
        firstDueDate: '2026-06-26',
      })

      const due = computeDue([template], PERIOD, '2026-06-30', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual(['2026-06-26'])
    })

    it('surfaces on the last Friday of a 5-Friday month', () => {
      // July 2026 has 5 Fridays: 3, 10, 17, 24, 31.
      const period: PeriodRange = { start: '2026-07-01', end: '2026-08-01' }
      const template = makeTemplate({
        frequency: 'monthly',
        monthlyRule: { type: 'nth-weekday', weekday: 5, nth: -1 },
        firstDueDate: '2026-07-31',
      })

      const due = computeDue([template], period, '2026-07-31', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual(['2026-07-31'])
    })

    it('continues across month boundaries', () => {
      // 2nd Tuesday of July 2026: Tuesdays are 7, 14, 21, 28 -> 2nd is the 14th.
      const period: PeriodRange = { start: '2026-06-15', end: '2026-07-15' }
      const template = makeTemplate({
        frequency: 'monthly',
        monthlyRule: { type: 'nth-weekday', weekday: 2, nth: 2 },
        firstDueDate: '2026-06-09',
      })

      const due = computeDue([template], period, '2026-07-14', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual(['2026-07-14'])
    })
  })

  describe('weekly', () => {
    it('surfaces every 7 days from First Due Date in [start, today]', () => {
      const template = makeTemplate({
        frequency: 'weekly',
        monthlyRule: null,
        firstDueDate: '2026-06-01',
      })

      const due = computeDue([template], PERIOD, '2026-06-20', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual([
        '2026-06-01',
        '2026-06-08',
        '2026-06-15',
      ])
    })

    it('does not surface weekdays later in the Period than today', () => {
      const template = makeTemplate({
        frequency: 'weekly',
        monthlyRule: null,
        firstDueDate: '2026-06-01',
      })

      const due = computeDue([template], PERIOD, '2026-06-10', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual([
        '2026-06-01',
        '2026-06-08',
      ])
    })

    it('excludes a weekly occurrence already resolved', () => {
      const template = makeTemplate({
        frequency: 'weekly',
        monthlyRule: null,
        firstDueDate: '2026-06-01',
      })

      const due = computeDue([template], PERIOD, '2026-06-20', [
        { recurringTransactionId: 're-1', occurrenceDate: '2026-06-08' },
      ])

      expect(due.map((d) => d.occurrenceDate)).toEqual([
        '2026-06-01',
        '2026-06-15',
      ])
    })
  })

  describe('fortnightly', () => {
    it('surfaces every 14 days from First Due Date in [start, today]', () => {
      const template = makeTemplate({
        frequency: 'fortnightly',
        monthlyRule: null,
        firstDueDate: '2026-06-01',
      })

      const due = computeDue([template], PERIOD, '2026-06-30', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual([
        '2026-06-01',
        '2026-06-15',
        '2026-06-29',
      ])
    })
  })

  it('never surfaces an inactive template', () => {
    const template = makeTemplate({ active: false })

    const due = computeDue([template], PERIOD, '2026-06-20', [])

    expect(due).toEqual([])
  })

  it('sorts due items by date then template name', () => {
    const monthly = makeTemplate({
      id: 're-monthly',
      name: 'Rent',
      frequency: 'monthly',
      monthlyRule: { type: 'day-of-month', day: 5 },
      firstDueDate: '2026-06-05',
    })
    const weekly = makeTemplate({
      id: 're-weekly',
      name: 'Gym',
      frequency: 'weekly',
      monthlyRule: null,
      firstDueDate: '2026-06-01',
    })

    const due = computeDue([monthly, weekly], PERIOD, '2026-06-15', [])

    expect(due.map((d) => d.occurrenceDate)).toEqual([
      '2026-06-01',
      '2026-06-05',
      '2026-06-08',
      '2026-06-15',
    ])
  })
})

describe('nextOccurrenceOnOrAfter', () => {
  it('returns the same date when it is on/after from (weekly)', () => {
    const template = makeTemplate({
      frequency: 'weekly',
      monthlyRule: null,
      firstDueDate: '2026-06-01',
    })

    expect(nextOccurrenceOnOrAfter(template, '2026-06-10')).toBe('2026-06-15')
  })

  it('returns a future date beyond today (unbounded, unlike computeDue)', () => {
    const template = makeTemplate({
      frequency: 'monthly',
      monthlyRule: { type: 'day-of-month', day: 5 },
      firstDueDate: '2026-06-05',
    })

    expect(nextOccurrenceOnOrAfter(template, '2026-06-06')).toBe('2026-07-05')
  })

  it('resolves an nth-weekday rule', () => {
    const template = makeTemplate({
      frequency: 'monthly',
      monthlyRule: { type: 'nth-weekday', weekday: 5, nth: -1 },
      firstDueDate: '2026-06-26',
    })

    expect(nextOccurrenceOnOrAfter(template, '2026-06-27')).toBe('2026-07-31')
  })
})
