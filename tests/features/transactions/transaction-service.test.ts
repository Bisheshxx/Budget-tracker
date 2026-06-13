import { describe, expect, it, vi } from 'vitest'
import { TransactionService } from '#/features/transactions/transaction-service.ts'
import type {
  Transaction,
  TransactionCreate,
} from '#/features/transactions/types.ts'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository.ts'
import type { QuickAddInput } from '#/features/transactions/schema.ts'

// Minimal in-memory fake — the whole point of ADR 0001's repository pattern.
// `create` echoes the input back with DB-assigned fields so we can assert what
// the service decided to persist.
function makeFakeRepo(overrides: Partial<ITransactionRepository> = {}) {
  return {
    listRecent: vi.fn(async (_userId: string, _limit: number) => []),
    listInRange: vi.fn(
      async (_userId: string, _start: string, _end: string) =>
        [] as Transaction[],
    ),
    create: vi.fn(
      async (input: TransactionCreate): Promise<Transaction> => ({
        id: 'tx-1',
        createdAt: '2026-06-12T00:00:00Z',
        ...input,
      }),
    ),
    ...overrides,
  } satisfies ITransactionRepository
}

const validExpense: QuickAddInput = {
  amount: 12.5,
  type: 'expense',
  transactionDate: '2026-06-12',
  note: 'Lunch',
}

describe('TransactionService', () => {
  describe('create', () => {
    it('converts the display-unit amount to integer cents', async () => {
      const repo = makeFakeRepo()
      const service = new TransactionService(repo)

      await service.create('profile-1', { ...validExpense, amount: 50.5 })

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amountCents: 5050 }),
      )
    })

    it('passes type, note, date, and userId through; category is null', async () => {
      const repo = makeFakeRepo()
      const service = new TransactionService(repo)

      await service.create('profile-1', validExpense)

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'profile-1',
        categoryId: null,
        type: 'expense',
        amountCents: 1250,
        note: 'Lunch',
        transactionDate: '2026-06-12',
      })
    })

    it('passes a selected categoryId through', async () => {
      const repo = makeFakeRepo()
      const service = new TransactionService(repo)

      await service.create('profile-1', { ...validExpense, categoryId: 'cat-9' })

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-9' }),
      )
    })

    it('stores a blank note as null', async () => {
      const repo = makeFakeRepo()
      const service = new TransactionService(repo)

      await service.create('profile-1', {
        amount: 5,
        type: 'income',
        transactionDate: '2026-06-12',
        note: undefined,
      })

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ note: null }),
      )
    })

    it('rejects a zero or negative amount and never hits the repo', async () => {
      const repo = makeFakeRepo()
      const service = new TransactionService(repo)

      await expect(
        service.create('profile-1', { ...validExpense, amount: 0 }),
      ).rejects.toThrow('Amount must be greater than 0')
      await expect(
        service.create('profile-1', { ...validExpense, amount: -5 }),
      ).rejects.toThrow('Amount must be greater than 0')
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('getPeriodSummary', () => {
    const range = { start: '2026-06-01', end: '2026-07-01' }

    // Build a transaction with only the fields the summary reads.
    function tx(
      type: 'income' | 'expense',
      amountCents: number,
      categoryId: string | null = null,
    ): Transaction {
      return {
        id: `tx-${Math.random()}`,
        userId: 'profile-1',
        categoryId,
        type,
        amountCents,
        note: null,
        transactionDate: '2026-06-10',
        createdAt: '2026-06-10T00:00:00Z',
      }
    }

    function makeRepoReturning(transactions: Transaction[]) {
      return makeFakeRepo({
        listInRange: vi.fn(async () => transactions),
      })
    }

    it('queries the repository with the Period range', async () => {
      const repo = makeFakeRepo()
      const service = new TransactionService(repo)

      await service.getPeriodSummary('profile-1', range)

      expect(repo.listInRange).toHaveBeenCalledWith(
        'profile-1',
        '2026-06-01',
        '2026-07-01',
      )
    })

    it('totals income, expenses, and net from cents', async () => {
      const repo = makeRepoReturning([
        tx('income', 50000),
        tx('income', 25000),
        tx('expense', 12000),
        tx('expense', 8000),
      ])
      const service = new TransactionService(repo)

      const summary = await service.getPeriodSummary('profile-1', range)

      expect(summary.incomeCents).toBe(75000)
      expect(summary.expensesCents).toBe(20000)
      expect(summary.netCents).toBe(55000)
    })

    it('reports a negative net when expenses exceed income', async () => {
      const repo = makeRepoReturning([tx('income', 1000), tx('expense', 4000)])
      const service = new TransactionService(repo)

      const summary = await service.getPeriodSummary('profile-1', range)

      expect(summary.netCents).toBe(-3000)
    })

    it('groups expense spend by category, most-spent first, excluding income', async () => {
      const repo = makeRepoReturning([
        tx('expense', 3000, 'food'),
        tx('expense', 2000, 'food'),
        tx('expense', 9000, 'rent'),
        tx('income', 100000, 'salary'),
      ])
      const service = new TransactionService(repo)

      const summary = await service.getPeriodSummary('profile-1', range)

      expect(summary.byCategory).toEqual([
        { categoryId: 'rent', amountCents: 9000 },
        { categoryId: 'food', amountCents: 5000 },
      ])
    })

    it('groups uncategorized expenses under a null categoryId', async () => {
      const repo = makeRepoReturning([
        tx('expense', 1500, null),
        tx('expense', 500, null),
      ])
      const service = new TransactionService(repo)

      const summary = await service.getPeriodSummary('profile-1', range)

      expect(summary.byCategory).toEqual([
        { categoryId: null, amountCents: 2000 },
      ])
    })

    it('returns zeroed totals and an empty breakdown for an empty Period', async () => {
      const repo = makeRepoReturning([])
      const service = new TransactionService(repo)

      const summary = await service.getPeriodSummary('profile-1', range)

      expect(summary).toEqual({
        incomeCents: 0,
        expensesCents: 0,
        netCents: 0,
        byCategory: [],
      })
    })
  })

  describe('listRecent', () => {
    it('delegates to the repository with the default limit', async () => {
      const repo = makeFakeRepo()
      const service = new TransactionService(repo)

      await service.listRecent('profile-1')

      expect(repo.listRecent).toHaveBeenCalledWith('profile-1', 10)
    })

    it('forwards an explicit limit', async () => {
      const repo = makeFakeRepo()
      const service = new TransactionService(repo)

      await service.listRecent('profile-1', 3)

      expect(repo.listRecent).toHaveBeenCalledWith('profile-1', 3)
    })
  })
})
