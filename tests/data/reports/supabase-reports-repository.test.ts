import { describe, expect, it, vi } from 'vitest'
import { SupabaseReportRepository } from '#/data/reports/supabase-reports-repository.ts'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository.ts'
import type { Transaction } from '#/shared/types/transaction.type.ts'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx',
    userId: 'profile-1',
    categoryId: 'cat-1',
    type: 'expense',
    amountCents: 1000,
    note: 'n',
    transactionDate: '2026-06-10',
    createdAt: '2026-06-10T00:00:00.000Z',
    createdBy: null,
    recurringOwnerId: null,
    ...overrides,
  }
}

const current = { start: '2026-06-01', end: '2026-07-01' }
const previous = { start: '2026-05-01', end: '2026-06-01' }

describe('SupabaseReportRepository', () => {
  it('derives the report from the two Periods of transactions', async () => {
    const listInRange = vi.fn(async (_householdId: string, start: string) =>
      start === current.start
        ? [
            tx({ id: 'a', amountCents: 3000 }),
            tx({ id: 'b', type: 'income', amountCents: 10000 }),
          ]
        : [tx({ id: 'c', amountCents: 2000, transactionDate: '2026-05-10' })],
    )
    const repo = new SupabaseReportRepository({
      listInRange,
    } as unknown as ITransactionRepository)

    const report = await repo.getPeriodReport('house-1', current, previous)

    expect(listInRange).toHaveBeenCalledWith(
      'house-1',
      current.start,
      current.end,
    )
    expect(listInRange).toHaveBeenCalledWith(
      'house-1',
      previous.start,
      previous.end,
    )
    expect(report.comparison.expenses).toMatchObject({
      currentCents: 3000,
      previousCents: 2000,
      deltaCents: 1000,
    })
    expect(report.comparison.income).toMatchObject({
      currentCents: 10000,
      previousCents: 0,
      deltaPercent: null,
    })
    expect(report.currentByCategory).toEqual([
      { categoryId: 'cat-1', amountCents: 3000 },
    ])
    expect(report.weeks.length).toBeGreaterThan(0)
  })

  it('propagates a transaction-repository failure', async () => {
    const repo = new SupabaseReportRepository({
      listInRange: vi.fn().mockRejectedValue(new Error('down')),
    } as unknown as ITransactionRepository)

    await expect(
      repo.getPeriodReport('house-1', current, previous),
    ).rejects.toThrow('down')
  })
})
