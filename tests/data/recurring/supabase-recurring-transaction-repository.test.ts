import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, postgrestError } from '../../helpers/fake-supabase.ts'

vi.mock('#/lib/supabase.ts', async () => ({
  supabase: (await import('../../helpers/fake-supabase.ts')).fakeSupabase
    .client,
}))

const { SupabaseRecurringTransactionRepository } =
  await import('#/data/recurring/supabase-recurring-transaction-repository.ts')

const templateRow = {
  id: 're-1',
  user_id: 'profile-1',
  category_id: 'cat-1',
  name: 'Rent',
  amount_cents: 120000,
  kind: 'expense',
  frequency: 'monthly',
  first_due_date: '2026-06-05',
  monthly_rule_type: 'day-of-month',
  monthly_weekday: null,
  monthly_nth: null,
  active: true,
  created_at: '2026-06-01T00:00:00.000Z',
  deactivated_at: null,
}

const template = {
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
}

const occurrenceRow = {
  id: 'occ-1',
  recurring_transaction_id: 're-1',
  occurrence_date: '2026-06-05',
  status: 'confirmed',
  transaction_id: 'tx-1',
  created_at: '2026-06-05T00:00:00.000Z',
}

const occurrence = {
  id: 'occ-1',
  recurringTransactionId: 're-1',
  occurrenceDate: '2026-06-05',
  status: 'confirmed',
  transactionId: 'tx-1',
  createdAt: '2026-06-05T00:00:00.000Z',
}

const transactionRow = {
  id: 'tx-1',
  user_id: 'profile-1',
  category_id: 'cat-1',
  type: 'expense',
  amount_cents: 120000,
  note: null,
  transaction_date: '2026-06-05',
  created_at: '2026-06-05T00:00:00.000Z',
  recurring_transaction_id: 're-1',
}

const repo = () => new SupabaseRecurringTransactionRepository()

beforeEach(() => fakeSupabase.reset())

describe('SupabaseRecurringTransactionRepository', () => {
  describe('row mapping', () => {
    it('maps a day-of-month monthly template', async () => {
      fakeSupabase.enqueue({ data: [templateRow] })

      await expect(repo().listAll('profile-1')).resolves.toEqual([template])
    })

    it('rebuilds an nth-weekday rule from its flat columns', async () => {
      fakeSupabase.enqueue({
        data: [
          {
            ...templateRow,
            monthly_rule_type: 'nth-weekday',
            monthly_weekday: 5,
            monthly_nth: -1,
          },
        ],
      })

      const [result] = await repo().listAll('profile-1')

      expect(result.monthlyRule).toEqual({
        type: 'nth-weekday',
        weekday: 5,
        nth: -1,
      })
    })

    it('gives non-monthly templates no monthly rule', async () => {
      fakeSupabase.enqueue({
        data: [
          { ...templateRow, frequency: 'weekly', monthly_rule_type: null },
        ],
      })

      const [result] = await repo().listAll('profile-1')

      expect(result.monthlyRule).toBeNull()
    })

    it('derives the first due date from a legacy weekly anchor day', async () => {
      // Created Mon 2026-06-01; anchor day 3 (Wed) → first due Wed 2026-06-03.
      fakeSupabase.enqueue({
        data: [
          {
            ...templateRow,
            frequency: 'weekly',
            first_due_date: '',
            anchor_day: 3,
          },
        ],
      })

      const [result] = await repo().listAll('profile-1')

      expect(result.firstDueDate).toBe('2026-06-03')
    })

    it('rolls a legacy monthly anchor that already passed into next month', async () => {
      fakeSupabase.enqueue({
        data: [
          {
            ...templateRow,
            created_at: '2026-06-20T00:00:00.000Z',
            first_due_date: '',
            anchor_day: 5,
          },
        ],
      })

      const [result] = await repo().listAll('profile-1')

      expect(result.firstDueDate).toBe('2026-07-05')
      expect(result.monthlyRule).toEqual({ type: 'day-of-month', day: 5 })
    })

    it('falls back to the created date when there is no usable date at all', async () => {
      fakeSupabase.enqueue({
        data: [{ ...templateRow, frequency: 'weekly', first_due_date: '' }],
      })

      const [result] = await repo().listAll('profile-1')

      expect(result.firstDueDate).toBe('2026-06-01')
    })
  })

  it('lists only the active templates of the user', async () => {
    fakeSupabase.enqueue({ data: [templateRow] })

    await repo().listActive('profile-1')

    expect(fakeSupabase.queries[0].table).toBe('recurring_transactions')
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([
      ['user_id', 'profile-1'],
      ['active', true],
    ])
  })

  it('lists every template of the user, active first', async () => {
    await repo().listAll('profile-1')

    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['user_id', 'profile-1']])
    expect(fakeSupabase.argsOf(0, 'order')[0]).toEqual([
      'active',
      { ascending: false },
    ])
  })

  it('creates a template, flattening the monthly rule into columns', async () => {
    fakeSupabase.enqueue({ data: templateRow })

    const result = await repo().create({
      userId: 'profile-1',
      categoryId: 'cat-1',
      name: 'Rent',
      amountCents: 120000,
      kind: 'expense',
      frequency: 'monthly',
      monthlyRule: { type: 'nth-weekday', weekday: 5, nth: -1 },
      firstDueDate: '2026-06-05',
    })

    expect(result).toEqual(template)
    expect(fakeSupabase.argsOf(0, 'insert')).toEqual([
      [
        {
          user_id: 'profile-1',
          category_id: 'cat-1',
          name: 'Rent',
          amount_cents: 120000,
          kind: 'expense',
          frequency: 'monthly',
          first_due_date: '2026-06-05',
          monthly_rule_type: 'nth-weekday',
          monthly_weekday: 5,
          monthly_nth: -1,
        },
      ],
    ])
  })

  it('updates a template and clears the rule columns when not monthly', async () => {
    fakeSupabase.enqueue({ data: templateRow })

    await repo().update('re-1', {
      categoryId: 'cat-2',
      name: 'Gym',
      amountCents: 2500,
      kind: 'expense',
      frequency: 'weekly',
      monthlyRule: null,
      firstDueDate: '2026-06-08',
    })

    expect(fakeSupabase.argsOf(0, 'update')).toEqual([
      [
        {
          category_id: 'cat-2',
          name: 'Gym',
          amount_cents: 2500,
          kind: 'expense',
          frequency: 'weekly',
          first_due_date: '2026-06-08',
          monthly_rule_type: null,
          monthly_weekday: null,
          monthly_nth: null,
        },
      ],
    ])
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['id', 're-1']])
  })

  it('deactivates by stamping active=false and a deactivation time', async () => {
    fakeSupabase.enqueue({ data: { ...templateRow, active: false } })

    const result = await repo().deactivate('re-1')

    expect(result.active).toBe(false)
    const [[patch]] = fakeSupabase.argsOf(0, 'update') as [
      [{ active: boolean; deactivated_at: string }],
    ]
    expect(patch.active).toBe(false)
    expect(Number.isNaN(Date.parse(patch.deactivated_at))).toBe(false)
  })

  describe('delete', () => {
    it('severs linked transactions before deleting the template', async () => {
      await repo().delete('re-1')

      expect(fakeSupabase.queries.map((q) => q.table)).toEqual([
        'transactions',
        'recurring_transactions',
      ])
      expect(fakeSupabase.argsOf(0, 'update')).toEqual([
        [{ recurring_transaction_id: null }],
      ])
      expect(fakeSupabase.argsOf(0, 'eq')).toEqual([
        ['recurring_transaction_id', 're-1'],
      ])
      expect(fakeSupabase.queries[1].ops[0][0]).toBe('delete')
      expect(fakeSupabase.argsOf(1, 'eq')).toEqual([['id', 're-1']])
    })

    it('does not delete the template when severing fails', async () => {
      fakeSupabase.enqueue({ error: postgrestError('42501') })

      await expect(repo().delete('re-1')).rejects.toMatchObject({
        code: 'forbidden',
      })
      expect(fakeSupabase.queries).toHaveLength(1)
    })
  })

  it('reports confirmed history from the row count', async () => {
    fakeSupabase.enqueue({ count: 2 }).enqueue({ count: 0 }).enqueue({})

    await expect(repo().hasConfirmedHistory('re-1')).resolves.toBe(true)
    await expect(repo().hasConfirmedHistory('re-1')).resolves.toBe(false)
    await expect(repo().hasConfirmedHistory('re-1')).resolves.toBe(false)
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([
      ['recurring_transaction_id', 're-1'],
      ['status', 'confirmed'],
    ])
  })

  describe('listOccurrencesInRange', () => {
    it('skips the query entirely when there are no templates', async () => {
      await expect(
        repo().listOccurrencesInRange([], '2026-06-01', '2026-07-01'),
      ).resolves.toEqual([])
      expect(fakeSupabase.queries).toHaveLength(0)
    })

    it('fetches the half-open range for the given templates', async () => {
      fakeSupabase.enqueue({ data: [occurrenceRow] })

      const result = await repo().listOccurrencesInRange(
        ['re-1', 're-2'],
        '2026-06-01',
        '2026-07-01',
      )

      expect(result).toEqual([occurrence])
      expect(fakeSupabase.queries[0].table).toBe(
        'recurring_transaction_occurrences',
      )
      expect(fakeSupabase.argsOf(0, 'in')).toEqual([
        ['recurring_transaction_id', ['re-1', 're-2']],
      ])
      expect(fakeSupabase.argsOf(0, 'gte')).toEqual([
        ['occurrence_date', '2026-06-01'],
      ])
      expect(fakeSupabase.argsOf(0, 'lt')).toEqual([
        ['occurrence_date', '2026-07-01'],
      ])
    })
  })

  describe('recordConfirmed', () => {
    it('returns the row it inserted when it wins the slot', async () => {
      fakeSupabase.enqueue({ data: [occurrenceRow] })

      const result = await repo().recordConfirmed('re-1', '2026-06-05', 'tx-1')

      expect(result).toEqual(occurrence)
      expect(fakeSupabase.queries).toHaveLength(1)
      expect(fakeSupabase.argsOf(0, 'upsert')).toEqual([
        [
          {
            recurring_transaction_id: 're-1',
            occurrence_date: '2026-06-05',
            status: 'confirmed',
            transaction_id: 'tx-1',
          },
          {
            onConflict: 'recurring_transaction_id,occurrence_date',
            ignoreDuplicates: true,
          },
        ],
      ])
    })

    it('returns the winning row when it loses the race', async () => {
      fakeSupabase
        .enqueue({ data: [] })
        .enqueue({ data: { ...occurrenceRow, transaction_id: 'tx-winner' } })

      const result = await repo().recordConfirmed('re-1', '2026-06-05', 'tx-1')

      expect(result.transactionId).toBe('tx-winner')
      expect(fakeSupabase.argsOf(1, 'eq')).toEqual([
        ['recurring_transaction_id', 're-1'],
        ['occurrence_date', '2026-06-05'],
      ])
    })
  })

  it('records a skip as an overwriting upsert with no transaction', async () => {
    fakeSupabase.enqueue({
      data: { ...occurrenceRow, status: 'skipped', transaction_id: null },
    })

    const result = await repo().recordSkipped('re-1', '2026-06-05')

    expect(result).toMatchObject({ status: 'skipped', transactionId: null })
    expect(fakeSupabase.argsOf(0, 'upsert')).toEqual([
      [
        {
          recurring_transaction_id: 're-1',
          occurrence_date: '2026-06-05',
          status: 'skipped',
          transaction_id: null,
        },
        {
          onConflict: 'recurring_transaction_id,occurrence_date',
          ignoreDuplicates: false,
        },
      ],
    ])
  })

  it('lists recently confirmed occurrences with their template and transaction', async () => {
    fakeSupabase.enqueue({
      data: [
        {
          ...occurrenceRow,
          recurring_transactions: templateRow,
          transactions: transactionRow,
        },
      ],
    })

    const result = await repo().listRecentlyConfirmed('profile-1', '2026-06-01')

    expect(result).toEqual([
      {
        occurrence,
        recurringTransaction: template,
        transaction: {
          id: 'tx-1',
          userId: 'profile-1',
          categoryId: 'cat-1',
          type: 'expense',
          amountCents: 120000,
          note: null,
          transactionDate: '2026-06-05',
          createdAt: '2026-06-05T00:00:00.000Z',
        },
      },
    ])
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([
      ['status', 'confirmed'],
      ['recurring_transactions.user_id', 'profile-1'],
    ])
    expect(fakeSupabase.argsOf(0, 'gte')).toEqual([
      ['occurrence_date', '2026-06-01'],
    ])
  })

  it('translates a Supabase failure into a DataError', async () => {
    fakeSupabase.enqueue({ error: postgrestError('23503', 'no such category') })

    await expect(repo().listActive('profile-1')).rejects.toMatchObject({
      name: 'DataError',
      code: 'conflict',
      message: 'no such category',
    })
  })
})
