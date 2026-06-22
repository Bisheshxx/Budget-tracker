import { describe, expect, it, vi } from 'vitest'
import { RecurringService } from '#/features/recurring/recurring-service.ts'
import type { RecurringInput } from '#/features/recurring/schema.ts'
import type {
  DueOccurrence,
  RecurringExpense,
  RecurringExpenseCreate,
  RecurringExpenseUpdate,
  RecurringOccurrence,
} from '#/features/recurring/types.ts'
import type { IRecurringExpenseRepository } from '#/data/recurring/IRecurringExpenseRepository.ts'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository.ts'
import type {
  Transaction,
  TransactionCreate,
} from '#/features/transactions/types.ts'

function makeFakeRepo(overrides: Partial<IRecurringExpenseRepository> = {}) {
  return {
    listActive: vi.fn(async (_userId: string) => [] as RecurringExpense[]),
    listAll: vi.fn(async (_userId: string) => [] as RecurringExpense[]),
    create: vi.fn(
      async (input: RecurringExpenseCreate): Promise<RecurringExpense> => ({
        id: 're-1',
        active: true,
        createdAt: '2026-06-22T00:00:00.000Z',
        deactivatedAt: null,
        ...input,
      }),
    ),
    update: vi.fn(
      async (
        id: string,
        input: RecurringExpenseUpdate,
      ): Promise<RecurringExpense> => ({
        id,
        userId: 'profile-1',
        active: true,
        createdAt: '2026-06-22T00:00:00.000Z',
        deactivatedAt: null,
        ...input,
      }),
    ),
    deactivate: vi.fn(
      async (id: string): Promise<RecurringExpense> => ({
        id,
        userId: 'profile-1',
        categoryId: 'cat-1',
        name: 'Rent',
        amountCents: 120000,
        frequency: 'monthly',
        anchorDay: 1,
        active: false,
        createdAt: '2026-06-22T00:00:00.000Z',
        deactivatedAt: '2026-06-22T00:00:00.000Z',
      }),
    ),
    delete: vi.fn(async (_id: string) => {}),
    listOccurrencesInRange: vi.fn(async () => [] as RecurringOccurrence[]),
    recordConfirmed: vi.fn(
      async (
        recurringExpenseId: string,
        occurrenceDate: string,
        transactionId: string,
      ): Promise<RecurringOccurrence> => ({
        id: 'occ-1',
        recurringExpenseId,
        occurrenceDate,
        status: 'confirmed',
        transactionId,
        createdAt: '2026-06-22T00:00:00.000Z',
      }),
    ),
    recordSkipped: vi.fn(
      async (
        recurringExpenseId: string,
        occurrenceDate: string,
      ): Promise<RecurringOccurrence> => ({
        id: 'occ-2',
        recurringExpenseId,
        occurrenceDate,
        status: 'skipped',
        transactionId: null,
        createdAt: '2026-06-22T00:00:00.000Z',
      }),
    ),
    ...overrides,
  } satisfies IRecurringExpenseRepository
}

function makeFakeTxRepo(overrides: Partial<ITransactionRepository> = {}) {
  return {
    listRecent: vi.fn(async () => [] as Transaction[]),
    listInRange: vi.fn(async () => [] as Transaction[]),
    create: vi.fn(
      async (input: TransactionCreate): Promise<Transaction> => ({
        id: 'tx-1',
        userId: input.userId,
        categoryId: input.categoryId,
        type: input.type,
        amountCents: input.amountCents,
        note: input.note,
        transactionDate: input.transactionDate,
        createdAt: '2026-06-22T00:00:00.000Z',
      }),
    ),
    update: vi.fn(),
    delete: vi.fn(async (_id: string) => {}),
    ...overrides,
  } satisfies ITransactionRepository
}

function makeTemplate(
  overrides: Partial<RecurringExpense> = {},
): RecurringExpense {
  return {
    id: 're-1',
    userId: 'profile-1',
    categoryId: 'cat-1',
    name: 'Rent',
    amountCents: 120000,
    frequency: 'monthly',
    anchorDay: 5,
    active: true,
    createdAt: '2026-06-01T00:00:00.000Z',
    deactivatedAt: null,
    ...overrides,
  }
}

function makeDue(overrides: Partial<DueOccurrence> = {}): DueOccurrence {
  return {
    recurringExpense: makeTemplate(),
    occurrenceDate: '2026-06-05',
    ...overrides,
  }
}

function makeService(
  repo: ReturnType<typeof makeFakeRepo>,
  txRepo: ReturnType<typeof makeFakeTxRepo> = makeFakeTxRepo(),
) {
  return new RecurringService(repo, txRepo)
}

function validInput(overrides: Partial<RecurringInput> = {}): RecurringInput {
  return {
    name: 'Rent',
    categoryId: 'cat-1',
    amount: 1200,
    frequency: 'monthly',
    anchorDay: 1,
    ...overrides,
  }
}

describe('RecurringService', () => {
  describe('create', () => {
    it('persists a validated template with the owner id and amount in cents', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await service.create('profile-1', validInput({ amount: 1200 }))

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'profile-1',
        categoryId: 'cat-1',
        name: 'Rent',
        amountCents: 120000,
        frequency: 'monthly',
        anchorDay: 1,
      })
    })

    it('rejects a zero or negative amount', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await expect(
        service.create('profile-1', validInput({ amount: 0 })),
      ).rejects.toThrow(/greater than 0/)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('requires a category', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await expect(
        service.create('profile-1', validInput({ categoryId: '' })),
      ).rejects.toThrow(/category/i)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('rejects a monthly anchor outside 1–28', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await expect(
        service.create(
          'profile-1',
          validInput({ frequency: 'monthly', anchorDay: 31 }),
        ),
      ).rejects.toThrow()
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('rejects a weekly anchor outside 0–6', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await expect(
        service.create(
          'profile-1',
          validInput({ frequency: 'weekly', anchorDay: 9 }),
        ),
      ).rejects.toThrow()
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('accepts a valid weekly anchor (0–6)', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await service.create(
        'profile-1',
        validInput({ frequency: 'weekly', anchorDay: 2 }),
      )

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ frequency: 'weekly', anchorDay: 2 }),
      )
    })
  })

  describe('update', () => {
    it('re-validates and writes the editable fields in cents', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await service.update('re-1', validInput({ amount: 1500 }))

      expect(repo.update).toHaveBeenCalledWith('re-1', {
        categoryId: 'cat-1',
        name: 'Rent',
        amountCents: 150000,
        frequency: 'monthly',
        anchorDay: 1,
      })
    })
  })

  describe('deactivate', () => {
    it('delegates to the repository (history retained, not deleted)', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      const result = await service.deactivate('re-1')

      expect(repo.deactivate).toHaveBeenCalledWith('re-1')
      expect(repo.delete).not.toHaveBeenCalled()
      expect(result.active).toBe(false)
      expect(result.deactivatedAt).not.toBeNull()
    })
  })

  describe('delete', () => {
    it('delegates a hard delete to the repository', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await service.delete('re-1')

      expect(repo.delete).toHaveBeenCalledWith('re-1')
    })
  })

  describe('list', () => {
    it('listAll delegates to the repository', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await service.listAll('profile-1')

      expect(repo.listAll).toHaveBeenCalledWith('profile-1')
    })
  })

  describe('listDue', () => {
    it('computes Due from active templates minus resolved occurrences', async () => {
      // A monthly template due on the 5th; today is the 20th and nothing is
      // resolved yet, so it should surface once.
      const repo = makeFakeRepo({
        listActive: vi.fn(async () => [
          makeTemplate({ frequency: 'monthly', anchorDay: 5 }),
        ]),
      })
      const service = makeService(repo)

      const due = await service.listDue('profile-1', '2026-06-20', 1)

      expect(due.map((d) => d.occurrenceDate)).toEqual(['2026-06-05'])
      // Queried the occurrences for the resolved period [start, end) — anchored
      // on the Period start day (1), independent of the template's anchor (5).
      expect(repo.listOccurrencesInRange).toHaveBeenCalledWith(
        ['re-1'],
        '2026-06-01',
        '2026-07-01',
      )
    })

    it('excludes an occurrence already resolved', async () => {
      const repo = makeFakeRepo({
        listActive: vi.fn(async () => [
          makeTemplate({ frequency: 'monthly', anchorDay: 5 }),
        ]),
        listOccurrencesInRange: vi.fn(async () => [
          {
            id: 'occ-1',
            recurringExpenseId: 're-1',
            occurrenceDate: '2026-06-05',
            status: 'confirmed' as const,
            transactionId: 'tx-1',
            createdAt: '2026-06-05T00:00:00.000Z',
          },
        ]),
      })
      const service = makeService(repo)

      const due = await service.listDue('profile-1', '2026-06-20', 1)

      expect(due).toEqual([])
    })

    it('returns nothing and skips the occurrence query when no active templates', async () => {
      const repo = makeFakeRepo({ listActive: vi.fn(async () => []) })
      const service = makeService(repo)

      const due = await service.listDue('profile-1', '2026-06-20', 1)

      expect(due).toEqual([])
      expect(repo.listOccurrencesInRange).not.toHaveBeenCalled()
    })
  })

  describe('confirm', () => {
    it('creates a linked expense transaction and records a confirmed occurrence', async () => {
      const repo = makeFakeRepo()
      const txRepo = makeFakeTxRepo()
      const service = makeService(repo, txRepo)
      const due = makeDue({
        recurringExpense: makeTemplate({ id: 're-9', categoryId: 'cat-9' }),
        occurrenceDate: '2026-06-05',
      })

      // User edits the amount (1300) and the actual pay date (06-07); the
      // occurrence is still recorded against the fixed Due date (06-05).
      await service.confirm('profile-1', due, {
        amount: 1300,
        type: 'expense',
        categoryId: 'cat-9',
        transactionDate: '2026-06-07',
        note: undefined,
      })

      expect(txRepo.create).toHaveBeenCalledWith({
        userId: 'profile-1',
        categoryId: 'cat-9',
        type: 'expense',
        amountCents: 130000,
        note: null,
        transactionDate: '2026-06-07',
        recurringExpenseId: 're-9',
      })
      expect(repo.recordConfirmed).toHaveBeenCalledWith(
        're-9',
        '2026-06-05',
        'tx-1',
      )
    })

    it('rejects a non-positive amount without creating anything', async () => {
      const repo = makeFakeRepo()
      const txRepo = makeFakeTxRepo()
      const service = makeService(repo, txRepo)

      await expect(
        service.confirm('profile-1', makeDue(), {
          amount: 0,
          type: 'expense',
          categoryId: 'cat-1',
          transactionDate: '2026-06-05',
          note: undefined,
        }),
      ).rejects.toThrow(/greater than 0/)
      expect(txRepo.create).not.toHaveBeenCalled()
      expect(repo.recordConfirmed).not.toHaveBeenCalled()
    })
  })

  describe('skip', () => {
    it('records a skipped occurrence and creates no transaction', async () => {
      const repo = makeFakeRepo()
      const txRepo = makeFakeTxRepo()
      const service = makeService(repo, txRepo)
      const due = makeDue({
        recurringExpense: makeTemplate({ id: 're-9' }),
        occurrenceDate: '2026-06-05',
      })

      await service.skip(due)

      expect(repo.recordSkipped).toHaveBeenCalledWith('re-9', '2026-06-05')
      expect(txRepo.create).not.toHaveBeenCalled()
    })
  })
})
