import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, postgrestError } from '../../helpers/fake-supabase.ts'

vi.mock('#/lib/supabase.ts', async () => ({
  supabase: (await import('../../helpers/fake-supabase.ts')).fakeSupabase
    .client,
}))

const { SupabaseTransactionRepository } =
  await import('#/data/transactions/supabase-transactions-repository.ts')

const row = {
  id: 'tx-1',
  user_id: 'profile-1',
  category_id: 'cat-1',
  type: 'expense',
  amount_cents: 1250,
  note: 'Lunch',
  transaction_date: '2026-06-10',
  created_at: '2026-06-10T01:00:00.000Z',
  created_by: 'profile-1',
  recurring_transaction_id: null,
  recurring_transactions: null,
}

const transaction = {
  id: 'tx-1',
  userId: 'profile-1',
  categoryId: 'cat-1',
  type: 'expense',
  amountCents: 1250,
  note: 'Lunch',
  transactionDate: '2026-06-10',
  createdAt: '2026-06-10T01:00:00.000Z',
  createdBy: 'profile-1',
  recurringOwnerId: null,
}

const createInput = {
  householdId: 'house-1',
  userId: 'profile-1',
  categoryId: 'cat-1',
  type: 'expense' as const,
  amountCents: 1250,
  note: 'Lunch',
  transactionDate: '2026-06-10',
}

beforeEach(() => fakeSupabase.reset())

describe('SupabaseTransactionRepository', () => {
  describe('listPage', () => {
    it('reads who owns the recurring item behind an auto-posted row', async () => {
      fakeSupabase.enqueue({
        data: [
          {
            ...row,
            created_by: null,
            recurring_transaction_id: 're-1',
            recurring_transactions: { user_id: 'profile-2' },
          },
        ],
      })

      const result = await new SupabaseTransactionRepository().listPage(
        'house-1',
        { limit: 25 },
      )

      expect(result).toEqual([
        { ...transaction, createdBy: null, recurringOwnerId: 'profile-2' },
      ])
      expect(fakeSupabase.argsOf(0, 'select')).toEqual([
        ['*, recurring_transactions(user_id)'],
      ])
    })

    it('scopes to the Household, orders newest-first and applies the window', async () => {
      fakeSupabase.enqueue({ data: [row] })

      const result = await new SupabaseTransactionRepository().listPage(
        'house-1',
        { from: '2026-06-01', to: '2026-07-01', limit: 25 },
      )

      expect(result).toEqual([transaction])
      expect(fakeSupabase.queries[0].table).toBe('transactions')
      expect(fakeSupabase.argsOf(0, 'eq')).toEqual([
        ['household_id', 'house-1'],
      ])
      expect(fakeSupabase.argsOf(0, 'order')).toEqual([
        ['transaction_date', { ascending: false }],
        ['id', { ascending: false }],
      ])
      expect(fakeSupabase.argsOf(0, 'limit')).toEqual([[25]])
      expect(fakeSupabase.argsOf(0, 'gte')).toEqual([
        ['transaction_date', '2026-06-01'],
      ])
      expect(fakeSupabase.argsOf(0, 'lt')).toEqual([
        ['transaction_date', '2026-07-01'],
      ])
      expect(fakeSupabase.argsOf(0, 'or')).toEqual([])
    })

    it('resumes strictly after the cursor row', async () => {
      await new SupabaseTransactionRepository().listPage('house-1', {
        limit: 25,
        cursor: { transactionDate: '2026-06-10', id: 'tx-1' },
      })

      expect(fakeSupabase.argsOf(0, 'or')).toEqual([
        [
          'transaction_date.lt.2026-06-10,and(transaction_date.eq.2026-06-10,id.lt.tx-1)',
        ],
      ])
      // No window given → no date bounds.
      expect(fakeSupabase.argsOf(0, 'gte')).toEqual([])
      expect(fakeSupabase.argsOf(0, 'lt')).toEqual([])
    })
  })

  it('lists a half-open date range for the Household, oldest first', async () => {
    fakeSupabase.enqueue({ data: [row] })

    const result = await new SupabaseTransactionRepository().listInRange(
      'house-1',
      '2026-06-01',
      '2026-07-01',
    )

    expect(result).toEqual([transaction])
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['household_id', 'house-1']])
    expect(fakeSupabase.argsOf(0, 'gte')).toEqual([
      ['transaction_date', '2026-06-01'],
    ])
    expect(fakeSupabase.argsOf(0, 'lt')).toEqual([
      ['transaction_date', '2026-07-01'],
    ])
  })

  it('inserts in column names, with no recurring link by default', async () => {
    fakeSupabase.enqueue({ data: row })

    const result = await new SupabaseTransactionRepository().create(createInput)

    expect(result).toEqual(transaction)
    expect(fakeSupabase.argsOf(0, 'insert')).toEqual([
      [
        {
          household_id: 'house-1',
          user_id: 'profile-1',
          category_id: 'cat-1',
          type: 'expense',
          amount_cents: 1250,
          note: 'Lunch',
          transaction_date: '2026-06-10',
          recurring_transaction_id: null,
        },
      ],
    ])
  })

  describe('createForRecurringOccurrence', () => {
    const input = { ...createInput, recurringTransactionId: 're-1' }

    it('returns the row it inserted when it wins the slot', async () => {
      fakeSupabase.enqueue({ data: [row] })

      const result =
        await new SupabaseTransactionRepository().createForRecurringOccurrence(
          input,
        )

      expect(result).toEqual(transaction)
      expect(fakeSupabase.queries).toHaveLength(1)
      expect(fakeSupabase.argsOf(0, 'upsert')[0][1]).toEqual({
        onConflict: 'recurring_transaction_id,transaction_date',
        ignoreDuplicates: true,
      })
    })

    it('returns the existing row when the slot was already posted', async () => {
      fakeSupabase
        .enqueue({ data: [] })
        .enqueue({ data: { ...row, id: 'tx-winner' } })

      const result =
        await new SupabaseTransactionRepository().createForRecurringOccurrence(
          input,
        )

      expect(result.id).toBe('tx-winner')
      expect(fakeSupabase.argsOf(1, 'eq')).toEqual([
        ['recurring_transaction_id', 're-1'],
        ['transaction_date', '2026-06-10'],
      ])
    })
  })

  it('updates the editable columns of one transaction', async () => {
    fakeSupabase.enqueue({ data: row })

    await new SupabaseTransactionRepository().update('tx-1', {
      categoryId: null,
      type: 'income',
      amountCents: 500,
      note: 'Refund',
      transactionDate: '2026-06-11',
    })

    expect(fakeSupabase.argsOf(0, 'update')).toEqual([
      [
        {
          category_id: null,
          type: 'income',
          amount_cents: 500,
          note: 'Refund',
          transaction_date: '2026-06-11',
        },
      ],
    ])
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['id', 'tx-1']])
  })

  it('deletes by id', async () => {
    await new SupabaseTransactionRepository().delete('tx-1')

    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['id', 'tx-1']])
    expect(fakeSupabase.queries[0].ops[0][0]).toBe('delete')
  })

  it('translates a Supabase failure into a DataError', async () => {
    fakeSupabase.enqueue({ error: postgrestError('42501', 'rls says no') })

    await expect(
      new SupabaseTransactionRepository().delete('tx-1'),
    ).rejects.toMatchObject({
      name: 'DataError',
      code: 'forbidden',
      message: 'rls says no',
    })
  })
})
