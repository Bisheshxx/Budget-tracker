import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseOrThrow } from '#/shared/utils/validation.util.ts'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
})

describe('parseOrThrow', () => {
  it('returns the parsed (transformed/coerced) output', () => {
    expect(parseOrThrow(schema, { name: '  Rent ', amount: '12.5' })).toEqual({
      name: 'Rent',
      amount: 12.5,
    })
  })

  it('throws a plain Error carrying the first issue message', () => {
    const attempt = () => parseOrThrow(schema, { name: '', amount: -1 })

    expect(attempt).toThrow('Name is required')
    expect(attempt).not.toThrow(z.ZodError)
  })
})
