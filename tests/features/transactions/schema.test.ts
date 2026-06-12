import { describe, expect, it } from 'vitest'
import { quickAddSchema, today } from '#/features/transactions/schema.ts'

describe('quickAddSchema', () => {
  it('accepts a valid expense and coerces the amount string', () => {
    const result = quickAddSchema.safeParse({
      amount: '12.50',
      type: 'expense',
      transactionDate: '2026-06-12',
      note: 'Lunch',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amount).toBe(12.5)
      expect(result.data.type).toBe('expense')
      expect(result.data.note).toBe('Lunch')
    }
  })

  it('rejects an amount of zero or below', () => {
    for (const amount of ['0', '-5']) {
      const result = quickAddSchema.safeParse({
        amount,
        type: 'income',
        transactionDate: '2026-06-12',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'amount')
        expect(issue?.message).toBe('Amount must be greater than 0')
      }
    }
  })

  it('rejects an unknown type', () => {
    const result = quickAddSchema.safeParse({
      amount: '5',
      type: 'transfer',
      transactionDate: '2026-06-12',
    })
    expect(result.success).toBe(false)
  })

  it('treats a blank note as omitted', () => {
    const result = quickAddSchema.safeParse({
      amount: '5',
      type: 'income',
      transactionDate: '2026-06-12',
      note: '   ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.note).toBeUndefined()
    }
  })

  it('defaults a blank date to today', () => {
    const result = quickAddSchema.safeParse({
      amount: '5',
      type: 'income',
      transactionDate: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.transactionDate).toBe(today())
    }
  })
})
