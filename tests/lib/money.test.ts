import { describe, expect, it } from 'vitest'
import { fromCents, toCents } from '#/lib/money.ts'

describe('money', () => {
  describe('toCents', () => {
    it('converts whole and fractional display units to integer cents', () => {
      expect(toCents(0)).toBe(0)
      expect(toCents(12)).toBe(1200)
      expect(toCents(12.34)).toBe(1234)
    })

    it('rounds to the nearest cent', () => {
      expect(toCents(12.345)).toBe(1235)
      expect(toCents(0.014)).toBe(1)
    })
  })

  describe('fromCents', () => {
    it('converts integer cents back to display units', () => {
      expect(fromCents(0)).toBe(0)
      expect(fromCents(1200)).toBe(12)
      expect(fromCents(1234)).toBe(12.34)
    })
  })

  it('round-trips a display amount through cents', () => {
    expect(fromCents(toCents(99.99))).toBe(99.99)
  })
})
