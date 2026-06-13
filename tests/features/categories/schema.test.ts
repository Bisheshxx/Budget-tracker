import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CATEGORY_COLOR,
  createCategorySchema,
} from '#/features/categories/schema.ts'

describe('createCategorySchema', () => {
  it('accepts a name and trims it; color defaults', () => {
    const result = createCategorySchema.safeParse({ name: '  Groceries  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Groceries')
      expect(result.data.colorHex).toBe(DEFAULT_CATEGORY_COLOR)
      expect(result.data.icon).toBeUndefined()
    }
  })

  it('rejects a blank name', () => {
    const result = createCategorySchema.safeParse({ name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects a color outside the palette', () => {
    const result = createCategorySchema.safeParse({
      name: 'X',
      colorHex: '#123456',
    })
    expect(result.success).toBe(false)
  })

  it('accepts a known icon name', () => {
    const result = createCategorySchema.safeParse({
      name: 'Food',
      icon: 'utensils',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.icon).toBe('utensils')
  })
})
