import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, postgrestError } from '../../helpers/fake-supabase.ts'

vi.mock('#/lib/supabase.ts', async () => ({
  supabase: (await import('../../helpers/fake-supabase.ts')).fakeSupabase
    .client,
}))

const { SupabaseCategoryRepository } =
  await import('#/data/categories/supabase-categories-repository.ts')

const USER = '11111111-1111-4111-8111-111111111111'
const HOUSE = '33333333-3333-4333-8333-333333333333'
const CAT = '22222222-2222-4222-8222-222222222222'

const row = {
  id: CAT,
  user_id: USER,
  name: 'Groceries',
  color_hex: 'teal',
  icon: 'cart',
  is_system: false,
  is_default: false,
  created_at: '2026-06-01T00:00:00.000Z',
}

const category = {
  id: CAT,
  userId: USER,
  name: 'Groceries',
  colorHex: 'teal',
  icon: 'cart',
  isSystem: false,
  isDefault: false,
  createdAt: '2026-06-01T00:00:00.000Z',
}

beforeEach(() => fakeSupabase.reset())

describe('SupabaseCategoryRepository', () => {
  it('lists system + own categories by name and maps the rows', async () => {
    fakeSupabase.enqueue({ data: [row] })

    const result = await new SupabaseCategoryRepository().listAvailable(HOUSE)

    expect(result).toEqual([category])
    expect(fakeSupabase.queries[0].table).toBe('categories')
    expect(fakeSupabase.argsOf(0, 'or')).toEqual([
      [`household_id.is.null,household_id.eq.${HOUSE}`],
    ])
    expect(fakeSupabase.argsOf(0, 'order')).toEqual([
      ['name', { ascending: true }],
    ])
  })

  it('refuses a non-uuid household id before it can reach the filter string', async () => {
    await expect(
      new SupabaseCategoryRepository().listAvailable('x,household_id.neq.y'),
    ).rejects.toThrow()
    expect(fakeSupabase.queries).toHaveLength(0)
  })

  it('pages newest-first and resumes after the cursor row', async () => {
    fakeSupabase.enqueue({ data: [row] })

    await new SupabaseCategoryRepository().listAvailablePage(USER, {
      limit: 20,
      cursor: { createdAt: '2026-05-01T00:00:00.000Z', id: CAT },
    })

    expect(fakeSupabase.argsOf(0, 'limit')).toEqual([[20]])
    expect(fakeSupabase.argsOf(0, 'order')).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ])
    expect(fakeSupabase.argsOf(0, 'or')[1]).toEqual([
      `created_at.lt.2026-05-01T00:00:00.000Z,and(created_at.eq.2026-05-01T00:00:00.000Z,id.lt.${CAT})`,
    ])
  })

  it('adds no keyset predicate on the first page', async () => {
    await new SupabaseCategoryRepository().listAvailablePage(USER, {
      limit: 20,
    })

    expect(fakeSupabase.argsOf(0, 'or')).toHaveLength(1)
  })

  it('creates a Household-owned (never system) category', async () => {
    fakeSupabase.enqueue({ data: row })

    const result = await new SupabaseCategoryRepository().create({
      householdId: HOUSE,
      userId: USER,
      name: 'Groceries',
      colorHex: 'teal',
      icon: 'cart',
    })

    expect(result).toEqual(category)
    expect(fakeSupabase.argsOf(0, 'insert')).toEqual([
      [
        {
          household_id: HOUSE,
          user_id: USER,
          name: 'Groceries',
          color_hex: 'teal',
          icon: 'cart',
          is_system: false,
        },
      ],
    ])
  })

  it('updates the editable columns of one category', async () => {
    fakeSupabase.enqueue({ data: row })

    await new SupabaseCategoryRepository().update(CAT, {
      name: 'Food',
      colorHex: 'amber',
      icon: null,
    })

    expect(fakeSupabase.argsOf(0, 'update')).toEqual([
      [{ name: 'Food', color_hex: 'amber', icon: null }],
    ])
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['id', CAT]])
  })

  it('deletes by id', async () => {
    await new SupabaseCategoryRepository().delete(CAT)

    expect(fakeSupabase.queries[0].ops.map(([name]) => name)).toEqual([
      'delete',
      'eq',
    ])
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['id', CAT]])
  })

  it('translates a Supabase failure into a DataError', async () => {
    fakeSupabase.enqueue({ error: postgrestError('23505', 'duplicate name') })

    await expect(
      new SupabaseCategoryRepository().create({
        householdId: HOUSE,
        userId: USER,
        name: 'Groceries',
        colorHex: 'teal',
        icon: null,
      }),
    ).rejects.toMatchObject({
      name: 'DataError',
      code: 'conflict',
      message: 'duplicate name',
    })
  })
})
