import { describe, expect, it, vi } from 'vitest'
import { RecurringService } from '#/features/recurring/recurring-service.ts'
import type { RecurringInput } from '#/features/recurring/schema.ts'
import type {
  RecurringExpense,
  RecurringExpenseCreate,
  RecurringExpenseUpdate,
} from '#/features/recurring/types.ts'
import type { IRecurringExpenseRepository } from '#/data/recurring/IRecurringExpenseRepository.ts'

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
    ...overrides,
  } satisfies IRecurringExpenseRepository
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
      const service = new RecurringService(repo)

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
      const service = new RecurringService(repo)

      await expect(
        service.create('profile-1', validInput({ amount: 0 })),
      ).rejects.toThrow(/greater than 0/)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('requires a category', async () => {
      const repo = makeFakeRepo()
      const service = new RecurringService(repo)

      await expect(
        service.create('profile-1', validInput({ categoryId: '' })),
      ).rejects.toThrow(/category/i)
      expect(repo.create).not.toHaveBeenCalled()
    })

    it('rejects a monthly anchor outside 1–28', async () => {
      const repo = makeFakeRepo()
      const service = new RecurringService(repo)

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
      const service = new RecurringService(repo)

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
      const service = new RecurringService(repo)

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
      const service = new RecurringService(repo)

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
      const service = new RecurringService(repo)

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
      const service = new RecurringService(repo)

      await service.delete('re-1')

      expect(repo.delete).toHaveBeenCalledWith('re-1')
    })
  })

  describe('list', () => {
    it('listActive and listAll delegate to the repository', async () => {
      const repo = makeFakeRepo()
      const service = new RecurringService(repo)

      await service.listActive('profile-1')
      await service.listAll('profile-1')

      expect(repo.listActive).toHaveBeenCalledWith('profile-1')
      expect(repo.listAll).toHaveBeenCalledWith('profile-1')
    })
  })
})
