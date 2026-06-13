import { describe, expect, it, vi } from 'vitest'
import { CategoryService } from '#/features/categories/category-service.ts'
import type {
  Category,
  CategoryCreate,
} from '#/features/categories/types.ts'
import type { ICategoryRepository } from '#/data/categories/ICategoryRepository.ts'

function makeFakeRepo(overrides: Partial<ICategoryRepository> = {}) {
  return {
    listAvailable: vi.fn(async (_userId: string) => [] as Category[]),
    create: vi.fn(
      async (input: CategoryCreate): Promise<Category> => ({
        id: 'cat-1',
        isSystem: false,
        isDefault: false,
        ...input,
      }),
    ),
    delete: vi.fn(async (_categoryId: string) => {}),
    ...overrides,
  } satisfies ICategoryRepository
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    userId: 'profile-1',
    name: 'Groceries',
    colorHex: '#639922',
    icon: 'utensils',
    isSystem: false,
    isDefault: false,
    ...overrides,
  }
}

describe('CategoryService', () => {
  describe('listAvailable', () => {
    it('delegates to the repository', async () => {
      const repo = makeFakeRepo()
      const service = new CategoryService(repo)

      await service.listAvailable('profile-1')

      expect(repo.listAvailable).toHaveBeenCalledWith('profile-1')
    })
  })

  describe('create', () => {
    it('persists a validated category with the owner id', async () => {
      const repo = makeFakeRepo()
      const service = new CategoryService(repo)

      await service.create('profile-1', {
        name: 'Groceries',
        colorHex: '#639922',
        icon: 'utensils',
      })

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'profile-1',
        name: 'Groceries',
        colorHex: '#639922',
        icon: 'utensils',
      })
    })

    it('maps an omitted icon to null', async () => {
      const repo = makeFakeRepo()
      const service = new CategoryService(repo)

      await service.create('profile-1', {
        name: 'Misc',
        colorHex: '#888780',
      })

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ icon: null }),
      )
    })

    it('rejects a blank name and never hits the repo', async () => {
      const repo = makeFakeRepo()
      const service = new CategoryService(repo)

      await expect(
        service.create('profile-1', { name: '   ', colorHex: '#888780' }),
      ).rejects.toThrow('Enter a name')
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('deletes a non-system category by id', async () => {
      const repo = makeFakeRepo()
      const service = new CategoryService(repo)

      await service.delete(makeCategory({ id: 'cat-9', isSystem: false }))

      expect(repo.delete).toHaveBeenCalledWith('cat-9')
    })

    it('refuses to delete a system category and never hits the repo', async () => {
      const repo = makeFakeRepo()
      const service = new CategoryService(repo)

      await expect(
        service.delete(makeCategory({ isSystem: true, userId: null })),
      ).rejects.toThrow('System categories cannot be deleted')
      expect(repo.delete).not.toHaveBeenCalled()
    })
  })
})
