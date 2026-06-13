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
