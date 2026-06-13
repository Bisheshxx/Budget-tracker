import { describe, expect, it } from 'vitest'
import {
  daysIntoPeriod,
  getPeriodKey,
  resolvePeriod,
  todayYmd,
} from '#/shared/period.ts'

describe('period', () => {
  describe('resolvePeriod', () => {
    it('anchors the Period on the start day within the same month', () => {
      // Start day 1 → the Period is the calendar month.
      expect(resolvePeriod('2026-06-13', 1)).toEqual({
        start: '2026-06-01',
        end: '2026-07-01',
      })
    })

    it('flips to the previous month when today is before the anchor', () => {
      // Start day 25, today the 13th → Period started May 25, ends June 25.
      expect(resolvePeriod('2026-06-13', 25)).toEqual({
        start: '2026-05-25',
        end: '2026-06-25',
      })
    })

    it('keeps the Period in this month when today is on/after the anchor', () => {
      expect(resolvePeriod('2026-06-25', 25)).toEqual({
        start: '2026-06-25',
        end: '2026-07-25',
      })
      // On the anchor day exactly the new Period has just begun.
      expect(resolvePeriod('2026-06-26', 25)).toEqual({
        start: '2026-06-25',
        end: '2026-07-25',
      })
    })

    it('rolls the year backward across the January boundary', () => {
      expect(resolvePeriod('2026-01-10', 25)).toEqual({
        start: '2025-12-25',
        end: '2026-01-25',
      })
    })

    it('rolls the year forward across the December boundary', () => {
      expect(resolvePeriod('2026-12-30', 25)).toEqual({
        start: '2026-12-25',
        end: '2027-01-25',
      })
    })

    it('clamps an out-of-range start day to 1–28', () => {
      expect(resolvePeriod('2026-06-13', 0).start).toBe('2026-06-01')
      expect(resolvePeriod('2026-02-15', 31)).toEqual({
        start: '2026-01-28',
        end: '2026-02-28',
      })
    })
  })

  describe('getPeriodKey', () => {
    it('is the Period start, so dates in the same Period share a key', () => {
      expect(getPeriodKey('2026-06-13', 25)).toBe('2026-05-25')
      expect(getPeriodKey('2026-06-24', 25)).toBe('2026-05-25')
      // Crossing the anchor lands in a new Period with a new key.
      expect(getPeriodKey('2026-06-25', 25)).toBe('2026-06-25')
    })
  })

  describe('daysIntoPeriod', () => {
    it('is 1 on the anchor day and counts up from there', () => {
      expect(daysIntoPeriod('2026-06-25', 25)).toBe(1)
      expect(daysIntoPeriod('2026-06-26', 25)).toBe(2)
      expect(daysIntoPeriod('2026-07-01', 25)).toBe(7)
    })

    it('counts correctly across a month boundary', () => {
      // May 25 → June 13 is 19 days later, so day 20 of the Period.
      expect(daysIntoPeriod('2026-06-13', 25)).toBe(20)
    })
  })

  describe('todayYmd', () => {
    it('formats a Date as a zero-padded local YYYY-MM-DD', () => {
      expect(todayYmd(new Date(2026, 0, 5))).toBe('2026-01-05')
    })
  })
})
