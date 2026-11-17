// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { CATEGORY_PAGE_SIZE } from '#/shared/constants/categories.constant.ts'
import { queryKeys } from '#/shared/lib/query-keys.ts'
import { createQueryHarness } from '../../helpers/query-client.ts'
import type { Category } from '#/shared/types/category.type.ts'
import { ledger, ledgerLoaded, ledgerPending } from '../../helpers/ledger.ts'

const { useLedger, service } = vi.hoisted(() => ({
  useLedger: vi.fn(),
  service: {
    listAvailable: vi.fn(),
    listAvailablePage: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('#/shared/hooks/use-ledger', () => ({ useLedger }))
vi.mock('#/features/categories', () => ({ categoryService: service }))

const {
  useCategories,
  useCategoriesInfinite,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} = await import('#/shared/hooks/use-categories.ts')

function category(id: string): Category {
  return {
    id,
    userId: 'profile-1',
    name: id,
    colorHex: 'teal',
    icon: null,
    isSystem: false,
    isDefault: false,
    createdAt: `2026-06-01T00:00:00.${id.padStart(3, '0')}Z`,
  }
}

const keys = {
  list: queryKeys.categories.list('house-1'),
  infinite: queryKeys.categories.infinite('house-1'),
  txList: queryKeys.transactions.infinite('house-1', {
    from: '2026-06-01',
    to: '2026-07-01',
  }),
  txSummary: queryKeys.transactions.periodSummary('house-1', {
    start: '2026-06-01',
    end: '2026-07-01',
  }),
}

const signedIn = ledgerLoaded()

// The table-driven cases below run several differently-typed mutation hooks
// through one body, so they are widened to this common shape.
type AnyMutationHook = () => {
  mutateAsync: (variables: unknown) => Promise<unknown>
}

afterEach(() => vi.clearAllMocks())

describe('useCategories', () => {
  it('stays loading and never queries until the Household resolves', () => {
    useLedger.mockReturnValue(ledgerPending())

    const { result } = renderHook(() => useCategories(), {
      wrapper: createQueryHarness().wrapper,
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.categories).toEqual([])
    expect(service.listAvailable).not.toHaveBeenCalled()
  })

  it('lists the categories available to the Household', async () => {
    useLedger.mockReturnValue(signedIn)
    service.listAvailable.mockResolvedValue([category('1')])

    const { result } = renderHook(() => useCategories(), {
      wrapper: createQueryHarness().wrapper,
    })

    await waitFor(() => expect(result.current.categories).toHaveLength(1))
    expect(service.listAvailable).toHaveBeenCalledWith('house-1')
  })

  it('surfaces a query error', async () => {
    useLedger.mockReturnValue(signedIn)
    service.listAvailable.mockRejectedValue(new Error('down'))

    const { result } = renderHook(() => useCategories(), {
      wrapper: createQueryHarness().wrapper,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(new Error('down'))
  })
})

describe('useCategoriesInfinite', () => {
  it('fetches the next page from the last row of a full page', async () => {
    useLedger.mockReturnValue(signedIn)
    const fullPage = Array.from({ length: CATEGORY_PAGE_SIZE }, (_, i) =>
      category(String(i + 1)),
    )
    const last = fullPage[fullPage.length - 1]
    service.listAvailablePage
      .mockResolvedValueOnce(fullPage)
      .mockResolvedValueOnce([category('999')])

    const { result } = renderHook(() => useCategoriesInfinite(), {
      wrapper: createQueryHarness().wrapper,
    })

    await waitFor(() => expect(result.current.hasNextPage).toBe(true))
    expect(service.listAvailablePage).toHaveBeenCalledWith('house-1', {
      limit: CATEGORY_PAGE_SIZE,
      cursor: undefined,
    })

    result.current.fetchNextPage()

    await waitFor(() =>
      expect(result.current.categories).toHaveLength(CATEGORY_PAGE_SIZE + 1),
    )
    expect(service.listAvailablePage).toHaveBeenLastCalledWith('house-1', {
      limit: CATEGORY_PAGE_SIZE,
      cursor: { createdAt: last.createdAt, id: last.id },
    })
    // A short page is the last one.
    expect(result.current.hasNextPage).toBe(false)
  })
})

describe('category mutations', () => {
  it('create refreshes the category caches but not the transaction views', async () => {
    useLedger.mockReturnValue(signedIn)
    service.create.mockResolvedValue(category('1'))
    const harness = createQueryHarness()
    harness.seed(keys.list, keys.infinite, keys.txList)
    const input = { name: 'Food', colorHex: 'teal' }

    const { result } = renderHook(() => useCreateCategory(), {
      wrapper: harness.wrapper,
    })
    await result.current.mutateAsync(input as never)

    expect(service.create).toHaveBeenCalledWith(ledger, input)
    expect(harness.isStale(keys.list)).toBe(true)
    expect(harness.isStale(keys.infinite)).toBe(true)
    expect(harness.isStale(keys.txList)).toBe(false)
  })

  it('create rejects without calling the service when no Household is loaded', async () => {
    useLedger.mockReturnValue(ledgerPending(false))

    const { result } = renderHook(() => useCreateCategory(), {
      wrapper: createQueryHarness().wrapper,
    })

    await expect(result.current.mutateAsync({} as never)).rejects.toThrow(
      'No group loaded',
    )
    expect(service.create).not.toHaveBeenCalled()
  })

  it.each([
    [
      'update',
      () => useUpdateCategory(),
      { category: category('1'), input: { name: 'Food' } },
    ],
    ['delete', () => useDeleteCategory(), category('1')],
  ] as const)(
    '%s refreshes the categories and every view that renders them',
    async (name, useHook, variables) => {
      useLedger.mockReturnValue(signedIn)
      service[name].mockResolvedValue(undefined)
      const harness = createQueryHarness()
      harness.seed(keys.list, keys.infinite, keys.txList, keys.txSummary)

      const { result } = renderHook(useHook as AnyMutationHook, {
        wrapper: harness.wrapper,
      })
      await result.current.mutateAsync(variables)

      expect(service[name]).toHaveBeenCalledTimes(1)
      for (const key of Object.values(keys)) {
        expect(harness.isStale(key)).toBe(true)
      }
    },
  )
})
