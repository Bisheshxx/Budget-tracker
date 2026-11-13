import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSupabase, postgrestError } from '../../helpers/fake-supabase.ts'

vi.mock('#/lib/supabase.ts', async () => ({
  supabase: (await import('../../helpers/fake-supabase.ts')).fakeSupabase
    .client,
}))

const { SupabaseProfileRepository } =
  await import('#/data/profile/supabase-profile-repository.ts')

const row = {
  id: 'profile-1',
  auth_user_id: 'auth-1',
  display_name: 'Sam',
  email: 'sam@example.com',
  avatar_url: null,
  currency: 'NZD',
  budget_period_start_day: 25,
  monthly_budget_target: 250000,
  onboarding_completed_at: '2026-06-01T00:00:00.000Z',
}

const profile = {
  id: 'profile-1',
  authUserId: 'auth-1',
  displayName: 'Sam',
  email: 'sam@example.com',
  avatarUrl: null,
  currency: 'NZD',
  budgetPeriodStartDay: 25,
  monthlyBudgetTargetCents: 250000,
  onboardingCompletedAt: '2026-06-01T00:00:00.000Z',
}

beforeEach(() => fakeSupabase.reset())

describe('SupabaseProfileRepository', () => {
  it('fetches by auth user id and maps the row to the domain profile', async () => {
    fakeSupabase.enqueue({ data: row })

    const result = await new SupabaseProfileRepository().getByAuthUserId(
      'auth-1',
    )

    expect(result).toEqual(profile)
    expect(fakeSupabase.queries[0].table).toBe('user_profiles')
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['auth_user_id', 'auth-1']])
  })

  it('returns null when the user has no profile row yet', async () => {
    fakeSupabase.enqueue({ data: null })

    await expect(
      new SupabaseProfileRepository().getByAuthUserId('auth-1'),
    ).resolves.toBeNull()
  })

  it('writes the patch in column names, scoped to the auth user', async () => {
    fakeSupabase.enqueue({ data: row })

    const result = await new SupabaseProfileRepository().update('auth-1', {
      displayName: 'Sam',
      currency: 'NZD',
      budgetPeriodStartDay: 25,
      monthlyBudgetTargetCents: 250000,
      onboardingCompletedAt: '2026-06-01T00:00:00.000Z',
    })

    expect(result).toEqual(profile)
    expect(fakeSupabase.argsOf(0, 'update')).toEqual([
      [
        {
          display_name: 'Sam',
          currency: 'NZD',
          budget_period_start_day: 25,
          monthly_budget_target: 250000,
          onboarding_completed_at: '2026-06-01T00:00:00.000Z',
        },
      ],
    ])
    expect(fakeSupabase.argsOf(0, 'eq')).toEqual([['auth_user_id', 'auth-1']])
  })

  it('translates a Supabase failure into a DataError', async () => {
    fakeSupabase.enqueue({ error: postgrestError('PGRST116', 'no rows') })

    await expect(
      new SupabaseProfileRepository().update('auth-1', {} as never),
    ).rejects.toMatchObject({
      name: 'DataError',
      code: 'not-found',
      message: 'no rows',
    })
  })
})
