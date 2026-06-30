import { afterEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import {
  quickAddSchema,
  rangeSchema,
  today,
} from '#/features/transactions/schema.ts'

// The message of the first validation issue on a given field, or undefined when
// the parse succeeded or no issue targets that field.
function issueMessage(
  result: z.ZodSafeParseResult<unknown>,
  field: string,
): string | undefined {
  if (result.success) return undefined
  return result.error.issues.find((i) => i.path[0] === field)?.message
}

describe('quickAddSchema', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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
      expect(issueMessage(result, 'amount')).toBe(
        'Amount must be greater than 0',
      )
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
    // Freeze the clock so the schema's internal today() and the assertion's
    // today() can't straddle midnight.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-13T12:00:00'))
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

describe('rangeSchema', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('accepts a valid past span', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-25T12:00:00'))
    const result = rangeSchema.safeParse({
      from: '2026-01-03',
      to: '2026-03-18',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a single-day span (from === to)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-25T12:00:00'))
    const result = rangeSchema.safeParse({
      from: '2026-02-10',
      to: '2026-02-10',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a start after the end', () => {
    const result = rangeSchema.safeParse({
      from: '2026-03-18',
      to: '2026-01-03',
    })
    expect(result.success).toBe(false)
    expect(issueMessage(result, 'from')).toBe('Start must be on or before end')
  })

  it('rejects an end in the future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-25T12:00:00'))
    const result = rangeSchema.safeParse({
      from: '2026-06-01',
      to: '2026-12-31',
    })
    expect(result.success).toBe(false)
    expect(issueMessage(result, 'to')).toBe("End can't be in the future")
  })

  it('requires both dates', () => {
    expect(rangeSchema.safeParse({ from: '2026-01-03' }).success).toBe(false)
    expect(rangeSchema.safeParse({ to: '2026-03-18' }).success).toBe(false)
    expect(rangeSchema.safeParse({}).success).toBe(false)
  })
})
