import { describe, expect, it, vi } from 'vitest'
import { RecurringService } from '#/features/recurring/recurring-service.ts'
import type { RecurringInput } from '#/features/recurring/schema.ts'
import type {
  RecurringOccurrence,
  RecurringTransaction,
  RecurringTransactionCreate,
  RecurringTransactionUpdate,
} from '#/features/recurring/types.ts'
import type { IRecurringTransactionRepository } from '#/data/recurring/IRecurringTransactionRepository.ts'
import type { ITransactionRepository } from '#/data/transactions/ITransactionRepository.ts'
import type {
  Transaction,
  TransactionCreate,
} from '#/shared/types/transaction.type.ts'

function makeFakeRepo(
  overrides: Partial<IRecurringTransactionRepository> = {},
) {
  return {
    listActive: vi.fn(async (_userId: string) => [] as RecurringTransaction[]),
    listAll: vi.fn(async (_userId: string) => [] as RecurringTransaction[]),
    create: vi.fn(
      async (
        input: RecurringTransactionCreate,
      ): Promise<RecurringTransaction> => ({
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
        input: RecurringTransactionUpdate,
      ): Promise<RecurringTransaction> => ({
        id,
        userId: 'profile-1',
        active: true,
        createdAt: '2026-06-22T00:00:00.000Z',
        deactivatedAt: null,
        ...input,
      }),
    ),
    deactivate: vi.fn(
      async (id: string): Promise<RecurringTransaction> => ({
        id,
        userId: 'profile-1',
        categoryId: 'cat-1',
        name: 'Rent',
        amountCents: 120000,
        kind: 'expense',
        frequency: 'monthly',
        monthlyRule: { type: 'day-of-month', day: 1 },
        firstDueDate: '2026-06-01',
        active: false,
        createdAt: '2026-06-22T00:00:00.000Z',
        deactivatedAt: '2026-06-22T00:00:00.000Z',
      }),
    ),
    delete: vi.fn(async (_id: string) => {}),
    hasConfirmedHistory: vi.fn(async (_id: string) => false),
    listOccurrencesInRange: vi.fn(async () => [] as RecurringOccurrence[]),
    recordConfirmed: vi.fn(
      async (
        recurringTransactionId: string,
        occurrenceDate: string,
        transactionId: string,
      ): Promise<RecurringOccurrence> => ({
        id: 'occ-1',
        recurringTransactionId,
        occurrenceDate,
        status: 'confirmed',
        transactionId,
        createdAt: '2026-06-22T00:00:00.000Z',
      }),
    ),
    recordSkipped: vi.fn(
      async (
        recurringTransactionId: string,
        occurrenceDate: string,
      ): Promise<RecurringOccurrence> => ({
        id: 'occ-2',
        recurringTransactionId,
        occurrenceDate,
        status: 'skipped',
        transactionId: null,
        createdAt: '2026-06-22T00:00:00.000Z',
      }),
    ),
    listRecentlyConfirmed: vi.fn(async () => []),
    ...overrides,
  } satisfies IRecurringTransactionRepository
}

function makeFakeTxRepo(overrides: Partial<ITransactionRepository> = {}) {
  return {
    listPage: vi.fn(async () => [] as Transaction[]),
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
  overrides: Partial<RecurringTransaction> = {},
): RecurringTransaction {
  return {
    id: 're-1',
    userId: 'profile-1',
    categoryId: 'cat-1',
    name: 'Rent',
    amountCents: 120000,
    kind: 'expense',
    frequency: 'monthly',
    monthlyRule: { type: 'day-of-month', day: 5 },
    firstDueDate: '2026-06-05',
    active: true,
    createdAt: '2026-06-01T00:00:00.000Z',
    deactivatedAt: null,
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
    kind: 'expense',
    frequency: 'monthly',
    monthlyRuleType: 'day-of-month',
    firstDueDate: '2026-06-01',
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
        kind: 'expense',
        frequency: 'monthly',
        monthlyRule: { type: 'day-of-month', day: 1 },
        firstDueDate: '2026-06-01',
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

    it('requires a category regardless of kind', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await expect(
        service.create(
          'profile-1',
          validInput({ categoryId: '', kind: 'income' }),
        ),
      ).rejects.toThrow(/category/i)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('rejects a monthly First Due Date after the 28th', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await expect(
        service.create(
          'profile-1',
          validInput({ frequency: 'monthly', firstDueDate: '2026-06-29' }),
        ),
      ).rejects.toThrow()
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('accepts weekly and fortnightly First Due Dates', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await service.create(
        'profile-1',
        validInput({ frequency: 'weekly', firstDueDate: '2026-06-02' }),
      )
      await service.create(
        'profile-1',
        validInput({ frequency: 'fortnightly', firstDueDate: '2026-06-03' }),
      )

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          frequency: 'weekly',
          firstDueDate: '2026-06-02',
        }),
      )
      expect(repo.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          frequency: 'fortnightly',
          firstDueDate: '2026-06-03',
        }),
      )
    })

    it('derives firstDueDate from an nth-weekday rule rather than trusting client input', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      // 2nd Tuesday of June 2026 is the 9th; "today" is before it.
      await service.create(
        'profile-1',
        validInput({
          frequency: 'monthly',
          monthlyRuleType: 'nth-weekday',
          monthlyWeekday: 2,
          monthlyNth: 2,
          firstDueDate: undefined,
        }),
        '2026-06-01',
      )

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          monthlyRule: { type: 'nth-weekday', weekday: 2, nth: 2 },
          firstDueDate: '2026-06-09',
        }),
      )
    })

    it('rolls an nth-weekday firstDueDate to next month when this month already passed', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      // 2nd Tuesday of June 2026 (the 9th) has already passed by the 20th.
      await service.create(
        'profile-1',
        validInput({
          frequency: 'monthly',
          monthlyRuleType: 'nth-weekday',
          monthlyWeekday: 2,
          monthlyNth: 2,
          firstDueDate: undefined,
        }),
        '2026-06-20',
      )

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ firstDueDate: '2026-07-14' }),
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
        kind: 'expense',
        frequency: 'monthly',
        monthlyRule: { type: 'day-of-month', day: 1 },
        firstDueDate: '2026-06-01',
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
    it('delegates a hard delete to the repository, which always severs linked transactions', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await service.delete('re-1')

      expect(repo.delete).toHaveBeenCalledWith('re-1')
    })
  })

  describe('hasConfirmedHistory', () => {
    it('delegates to the repository (confirm-dialog copy only, not a delete gate)', async () => {
      const repo = makeFakeRepo({
        hasConfirmedHistory: vi.fn(async () => true),
      })
      const service = makeService(repo)

      await expect(service.hasConfirmedHistory('re-1')).resolves.toBe(true)
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
          makeTemplate({ frequency: 'monthly', firstDueDate: '2026-06-05' }),
        ]),
      })
      const service = makeService(repo)

      const due = await service.listDue('profile-1', '2026-06-20', 1)

      expect(due.map((d) => d.occurrenceDate)).toEqual(['2026-06-05'])
      expect(repo.listOccurrencesInRange).toHaveBeenCalledWith(
        ['re-1'],
        '2026-06-05',
        '2026-06-21',
      )
    })

    it('excludes an occurrence already resolved', async () => {
      const repo = makeFakeRepo({
        listActive: vi.fn(async () => [
          makeTemplate({ frequency: 'monthly', firstDueDate: '2026-06-05' }),
        ]),
        listOccurrencesInRange: vi.fn(async () => [
          {
            id: 'occ-1',
            recurringTransactionId: 're-1',
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

    it('does not query occurrences with an invalid First Due Date', async () => {
      const repo = makeFakeRepo({
        listActive: vi.fn(async () => [
          makeTemplate({
            firstDueDate: undefined as unknown as string,
          }),
        ]),
      })
      const service = makeService(repo)

      const due = await service.listDue('profile-1', '2026-06-20', 1)

      expect(due).toEqual([])
      expect(repo.listOccurrencesInRange).not.toHaveBeenCalled()
    })
  })

  describe('reconcileDue', () => {
    it('auto-posts one transaction per Due occurrence, typed from kind', async () => {
      const repo = makeFakeRepo({
        listActive: vi.fn(async () => [
          makeTemplate({ id: 're-9', categoryId: 'cat-9', kind: 'income' }),
        ]),
      })
      const txRepo = makeFakeTxRepo()
      const service = makeService(repo, txRepo)

      const results = await service.reconcileDue('profile-1', '2026-06-20', 1)

      expect(txRepo.create).toHaveBeenCalledWith({
        userId: 'profile-1',
        categoryId: 'cat-9',
        type: 'income',
        amountCents: 120000,
        note: null,
        transactionDate: '2026-06-05',
        recurringTransactionId: 're-9',
      })
      expect(repo.recordConfirmed).toHaveBeenCalledWith(
        're-9',
        '2026-06-05',
        'tx-1',
      )
      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('confirmed')
    })

    it('deletes its own transaction when it loses the race to a concurrent reconcile', async () => {
      const repo = makeFakeRepo({
        listActive: vi.fn(async () => [makeTemplate({ id: 're-9' })]),
        // Simulate another caller having already confirmed this occurrence with
        // a different transaction.
        recordConfirmed: vi.fn(
          async (recurringTransactionId, occurrenceDate) => ({
            id: 'occ-winner',
            recurringTransactionId,
            occurrenceDate,
            status: 'confirmed' as const,
            transactionId: 'tx-winner',
            createdAt: '2026-06-05T00:00:00.000Z',
          }),
        ),
      })
      const txRepo = makeFakeTxRepo()
      const service = makeService(repo, txRepo)

      const results = await service.reconcileDue('profile-1', '2026-06-20', 1)

      expect(txRepo.create).toHaveBeenCalledTimes(1)
      expect(txRepo.delete).toHaveBeenCalledWith('tx-1')
      expect(results[0].transactionId).toBe('tx-winner')
    })
  })

  describe('listRecentlyPosted', () => {
    it('delegates to the repository', async () => {
      const repo = makeFakeRepo()
      const service = makeService(repo)

      await service.listRecentlyPosted('profile-1', '2026-06-01')

      expect(repo.listRecentlyConfirmed).toHaveBeenCalledWith(
        'profile-1',
        '2026-06-01',
      )
    })
  })

  describe('skipUpcoming', () => {
    it('records a skipped occurrence ahead of time, without touching transactions', async () => {
      const repo = makeFakeRepo()
      const txRepo = makeFakeTxRepo()
      const service = makeService(repo, txRepo)

      await service.skipUpcoming('re-9', '2026-07-05')

      expect(repo.recordSkipped).toHaveBeenCalledWith('re-9', '2026-07-05')
      expect(txRepo.delete).not.toHaveBeenCalled()
    })
  })

  describe('skip', () => {
    it('deletes the linked transaction and records the occurrence skipped', async () => {
      const repo = makeFakeRepo()
      const txRepo = makeFakeTxRepo()
      const service = makeService(repo, txRepo)
      const occurrence: RecurringOccurrence = {
        id: 'occ-1',
        recurringTransactionId: 're-9',
        occurrenceDate: '2026-06-05',
        status: 'confirmed',
        transactionId: 'tx-1',
        createdAt: '2026-06-05T00:00:00.000Z',
      }

      await service.skip(occurrence)

      expect(txRepo.delete).toHaveBeenCalledWith('tx-1')
      expect(repo.recordSkipped).toHaveBeenCalledWith('re-9', '2026-06-05')
    })

    it('does not try to delete a transaction when there is none', async () => {
      const repo = makeFakeRepo()
      const txRepo = makeFakeTxRepo()
      const service = makeService(repo, txRepo)
      const occurrence: RecurringOccurrence = {
        id: 'occ-2',
        recurringTransactionId: 're-9',
        occurrenceDate: '2026-06-05',
        status: 'skipped',
        transactionId: null,
        createdAt: '2026-06-05T00:00:00.000Z',
      }

      await service.skip(occurrence)

      expect(txRepo.delete).not.toHaveBeenCalled()
      expect(repo.recordSkipped).toHaveBeenCalledWith('re-9', '2026-06-05')
    })
  })
})
