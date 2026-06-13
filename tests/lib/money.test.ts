import { describe, expect, it } from 'vitest'
import { formatMoney, fromCents, toCents } from '#/lib/money.ts'

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

  describe('formatMoney', () => {
    it('renders the currency symbol, thousands separator, and two decimals', () => {
      expect(formatMoney(137000, 'USD')).toBe('$1,370.00')
    })

    it('formats a different currency with its own symbol', () => {
      expect(formatMoney(5000, 'GBP')).toBe('£50.00')
    })

    it('shows a leading minus on negative amounts by default', () => {
      expect(formatMoney(-1250, 'USD')).toBe('-$12.50')
    })

    it("does not sign a positive amount under the default signDisplay", () => {
      expect(formatMoney(1250, 'USD')).toBe('$12.50')
    })

    it("forces a leading + on positives when signDisplay is 'always'", () => {
      expect(formatMoney(1250, 'USD', { signDisplay: 'always' })).toBe('+$12.50')
      // Zero reads as a signed positive under 'always'.
      expect(formatMoney(0, 'USD', { signDisplay: 'always' })).toBe('+$0.00')
    })

    it("drops the sign entirely when signDisplay is 'never'", () => {
      expect(formatMoney(-1250, 'USD', { signDisplay: 'never' })).toBe('$12.50')
    })
  })
})
