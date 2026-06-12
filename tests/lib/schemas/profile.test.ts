import { describe, expect, it } from 'vitest'
import {
  onboardingSchema,
  resolveDisplayName,
} from '#/lib/schemas/profile.ts'

describe('onboardingSchema', () => {
  it('accepts the required fields alone and coerces the start day', () => {
    const result = onboardingSchema.safeParse({
      currency: 'USD',
      budgetPeriodStartDay: '15',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.budgetPeriodStartDay).toBe(15)
    }
  })

  it('rejects an unknown currency', () => {
    const result = onboardingSchema.safeParse({
      currency: 'XYZ',
      budgetPeriodStartDay: '1',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a Period start day outside 1–28', () => {
    const result = onboardingSchema.safeParse({
      currency: 'USD',
      budgetPeriodStartDay: '29',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'budgetPeriodStartDay',
      )
      expect(issue?.message).toBe('Day must be between 1 and 28')
    }
  })

  it('treats blank optional fields as omitted', () => {
    const result = onboardingSchema.safeParse({
      currency: 'EUR',
      budgetPeriodStartDay: '1',
      displayName: '',
      paydayDayOfMonth: '',
      paydayFrequency: '',
      groceryDayOfWeek: '',
      monthlyBudgetTarget: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayName).toBeUndefined()
      expect(result.data.paydayDayOfMonth).toBeUndefined()
      expect(result.data.monthlyBudgetTarget).toBeUndefined()
    }
  })

  it('coerces and validates the optional fields when provided', () => {
    const result = onboardingSchema.safeParse({
      currency: 'GBP',
      budgetPeriodStartDay: '25',
      displayName: '  Alex  ',
      paydayDayOfMonth: '28',
      paydayFrequency: 'monthly',
      groceryDayOfWeek: '6',
      monthlyBudgetTarget: '1500.50',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.displayName).toBe('Alex')
      expect(result.data.paydayDayOfMonth).toBe(28)
      expect(result.data.groceryDayOfWeek).toBe(6)
      expect(result.data.monthlyBudgetTarget).toBe(1500.5)
    }
  })

  it('rejects a negative Budget Target', () => {
    const result = onboardingSchema.safeParse({
      currency: 'USD',
      budgetPeriodStartDay: '1',
      monthlyBudgetTarget: '-5',
    })
    expect(result.success).toBe(false)
  })
})

describe('resolveDisplayName', () => {
  it('uses the trimmed provided name when present', () => {
    expect(resolveDisplayName('  Alex  ', 'alex@b.com')).toBe('Alex')
  })

  it('falls back to the email local part when the name is blank', () => {
    expect(resolveDisplayName('', 'sam@b.com')).toBe('sam')
    expect(resolveDisplayName(undefined, 'sam@b.com')).toBe('sam')
    expect(resolveDisplayName('   ', 'sam@b.com')).toBe('sam')
  })

  it('falls back to a generic greeting when there is no email', () => {
    expect(resolveDisplayName(undefined, null)).toBe('there')
  })
})
