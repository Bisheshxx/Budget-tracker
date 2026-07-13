import { describe, expect, it } from 'vitest'
import { nextPageCursor } from '#/shared/utils/pagination.util.ts'

describe('nextPageCursor', () => {
  it('returns the mapped cursor for a full page', () => {
    const page = [
      { id: 'row-2', transactionDate: '2026-06-24' },
      { id: 'row-1', transactionDate: '2026-06-20' },
    ]

    expect(
      nextPageCursor(page, 2, (last) => ({
        transactionDate: last.transactionDate,
        id: last.id,
      })),
    ).toEqual({
      transactionDate: '2026-06-20',
      id: 'row-1',
    })
  })

  it('returns undefined for a short final page', () => {
    const page = [{ id: 'row-1', createdAt: '2026-01-01T00:00:00.000Z' }]

    expect(
      nextPageCursor(page, 2, (last) => ({
        createdAt: last.createdAt,
        id: last.id,
      })),
    ).toBeUndefined()
  })

  it('returns undefined for an empty page', () => {
    expect(
      nextPageCursor([] as Array<{ id: string }>, 25, (last) => ({
        id: last.id,
      })),
    ).toBeUndefined()
  })

  it('supports different cursor shapes', () => {
    const page = [
      { id: 'cat-2', createdAt: '2026-01-02T00:00:00.000Z' },
      { id: 'cat-1', createdAt: '2026-01-01T00:00:00.000Z' },
    ]

    expect(
      nextPageCursor(page, 2, (last) => ({
        createdAt: last.createdAt,
        id: last.id,
      })),
    ).toEqual({
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'cat-1',
    })
  })
})
