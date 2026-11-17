import { describe, expect, it } from 'vitest'
import { createHouseholdSchema } from '#/features/households/schemas/household.schema.ts'

const valid = {
  name: 'Flat',
  currency: 'AUD',
  periodStartDay: '25',
  timeZone: 'Pacific/Auckland',
}

describe('createHouseholdSchema', () => {
  it('accepts form strings, trimming the name and coercing the day', () => {
    const result = createHouseholdSchema.safeParse({ ...valid, name: ' Flat ' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        name: 'Flat',
        currency: 'AUD',
        periodStartDay: 25,
        timeZone: 'Pacific/Auckland',
      })
    }
  })

  it('accepts UTC as a time zone', () => {
    expect(
      createHouseholdSchema.safeParse({ ...valid, timeZone: 'UTC' }).success,
    ).toBe(true)
  })

  it.each([
    ['name', '', 'Give the group a name'],
    ['name', 'x'.repeat(81), 'Name is too long'],
    ['currency', 'XXX', 'Select a currency'],
    ['periodStartDay', '0', 'Day must be between 1 and 28'],
    ['periodStartDay', '29', 'Day must be between 1 and 28'],
    ['timeZone', '', 'Select a time zone'],
    ['timeZone', 'Not/A_Zone', 'Select a time zone'],
  ])('rejects %s = %j', (field, value, message) => {
    const result = createHouseholdSchema.safeParse({ ...valid, [field]: value })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe(field)
      expect(result.error.issues[0].message).toBe(message)
    }
  })
})
