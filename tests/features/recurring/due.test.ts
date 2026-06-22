import { describe, expect, it } from 'vitest'
import { computeDue } from '#/features/recurring/due.ts'
import type { PeriodRange } from '#/shared/period.ts'
import type { RecurringExpense } from '#/features/recurring/types.ts'

// June 2026 starts on a Monday (getUTCDay === 1), so Mondays fall on the 1st,
// 8th, 15th, 22nd, and 29th — used by the weekly cases below.
const PERIOD: PeriodRange = { start: '2026-06-01', end: '2026-07-01' }

function makeTemplate(
  overrides: Partial<RecurringExpense> = {},
): RecurringExpense {
  return {
    id: 're-1',
    userId: 'profile-1',
    categoryId: 'cat-1',
    name: 'Rent',
    amountCents: 120000,
    frequency: 'monthly',
    anchorDay: 5,
    active: true,
    createdAt: '2026-06-01T00:00:00.000Z',
    deactivatedAt: null,
    ...overrides,
  }
}

describe('computeDue', () => {
  describe('monthly', () => {
    it('surfaces once per Period on the anchor date when it has passed', () => {
      const template = makeTemplate({ frequency: 'monthly', anchorDay: 5 })

      const due = computeDue([template], PERIOD, '2026-06-20', [])

      expect(due).toEqual([
        { recurringExpense: template, occurrenceDate: '2026-06-05' },
      ])
    })

    it('does not surface before its anchor date in the Period', () => {
      const template = makeTemplate({ frequency: 'monthly', anchorDay: 5 })

      const due = computeDue([template], PERIOD, '2026-06-03', [])

      expect(due).toEqual([])
    })

    it('places an anchor earlier than the Period start in the following month', () => {
      // Period anchored on the 15th spans 06-15 → 07-15; anchorDay 5 lands 07-05.
      const period: PeriodRange = { start: '2026-06-15', end: '2026-07-15' }
      const template = makeTemplate({ frequency: 'monthly', anchorDay: 5 })

      const due = computeDue([template], period, '2026-07-10', [])

      expect(due).toEqual([
        { recurringExpense: template, occurrenceDate: '2026-07-05' },
      ])
    })

    it('excludes an occurrence already confirmed or skipped', () => {
      const template = makeTemplate({ frequency: 'monthly', anchorDay: 5 })

      const due = computeDue([template], PERIOD, '2026-06-20', [
        { recurringExpenseId: 're-1', occurrenceDate: '2026-06-05' },
      ])

      expect(due).toEqual([])
    })
  })

  describe('weekly', () => {
    it('surfaces once per matching weekday in [start, today]', () => {
      const template = makeTemplate({ frequency: 'weekly', anchorDay: 1 })

      const due = computeDue([template], PERIOD, '2026-06-20', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual([
        '2026-06-01',
        '2026-06-08',
        '2026-06-15',
      ])
    })

    it('does not surface weekdays later in the Period than today', () => {
      const template = makeTemplate({ frequency: 'weekly', anchorDay: 1 })

      const due = computeDue([template], PERIOD, '2026-06-10', [])

      expect(due.map((d) => d.occurrenceDate)).toEqual([
        '2026-06-01',
        '2026-06-08',
      ])
    })

    it('excludes a weekly occurrence already resolved', () => {
      const template = makeTemplate({ frequency: 'weekly', anchorDay: 1 })

      const due = computeDue([template], PERIOD, '2026-06-20', [
        { recurringExpenseId: 're-1', occurrenceDate: '2026-06-08' },
      ])

      expect(due.map((d) => d.occurrenceDate)).toEqual([
        '2026-06-01',
        '2026-06-15',
      ])
    })
  })

  it('never surfaces an inactive template', () => {
    const template = makeTemplate({ active: false, anchorDay: 5 })

    const due = computeDue([template], PERIOD, '2026-06-20', [])

    expect(due).toEqual([])
  })

  it('sorts due items by date then template name', () => {
    const monthly = makeTemplate({
      id: 're-monthly',
      name: 'Rent',
      frequency: 'monthly',
      anchorDay: 5,
    })
    const weekly = makeTemplate({
      id: 're-weekly',
      name: 'Gym',
      frequency: 'weekly',
      anchorDay: 1,
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
