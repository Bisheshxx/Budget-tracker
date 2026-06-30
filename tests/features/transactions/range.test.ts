import { describe, expect, it } from 'vitest'
import {
  formatRangeLabel,
  rangeToBounds,
} from '#/features/transactions/range.ts'

describe('rangeToBounds', () => {
  it('maps an inclusive from/to to half-open [from, to+1)', () => {
    expect(rangeToBounds({ from: '2026-01-03', to: '2026-03-18' })).toEqual({
      start: '2026-01-03',
      end: '2026-03-19',
    })
  })

  it('rolls the exclusive end across a month boundary', () => {
    expect(rangeToBounds({ from: '2026-02-01', to: '2026-02-28' })).toEqual({
      start: '2026-02-01',
      end: '2026-03-01',
    })
  })

  it('yields a one-day half-open window for a single-day range', () => {
    expect(rangeToBounds({ from: '2026-02-10', to: '2026-02-10' })).toEqual({
      start: '2026-02-10',
      end: '2026-02-11',
    })
  })
})

describe('formatRangeLabel', () => {
  it('renders an inclusive en-dash span of both ends', () => {
    // Locale-dependent formatting, so assert structure rather than exact text:
    // a separator with non-empty labels on each side.
    const label = formatRangeLabel({ from: '2026-01-03', to: '2026-03-18' })
    const [left, right] = label.split(' – ')
    expect(left.trim().length).toBeGreaterThan(0)
    expect(right.trim().length).toBeGreaterThan(0)
    expect(label).toContain('–')
  })
})
