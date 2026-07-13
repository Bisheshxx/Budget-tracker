import { describe, expect, it } from 'vitest'
import { nextCategoryPageCursor } from '#/features/categories/utils/pagination.util.ts'
import type { Category } from '#/features/categories/types/category.type.ts'

function category(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    userId: 'profile-1',
    name: 'Groceries',
    colorHex: '#639922',
    icon: 'utensils',
    isSystem: false,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('nextCategoryPageCursor', () => {
  it('returns undefined for a short final page', () => {
    expect(nextCategoryPageCursor([category()], 2)).toBeUndefined()
  })

  it('returns the last row cursor for a full page', () => {
    expect(
      nextCategoryPageCursor(
        [
          category({ id: 'cat-2', createdAt: '2026-01-02T00:00:00.000Z' }),
          category({ id: 'cat-1', createdAt: '2026-01-01T00:00:00.000Z' }),
        ],
        2,
      ),
    ).toEqual({
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'cat-1',
    })
  })
})
