import { describe, expect, it, vi } from 'vitest'

// Keep the real client module (which demands env vars) out of the import graph.
vi.mock('#/lib/supabase.ts', () => ({ supabase: {} }))

const { dataSource } = await import('#/data/index.ts')
const { createSupabaseDataSource } =
  await import('#/data/supabase-data-source.ts')
const { SupabaseAuthRepository } =
  await import('#/data/auth/supabase-auth-repository.ts')
const { SupabaseCategoryRepository } =
  await import('#/data/categories/supabase-categories-repository.ts')
const { SupabaseProfileRepository } =
  await import('#/data/profile/supabase-profile-repository.ts')
const { SupabaseRecurringTransactionRepository } =
  await import('#/data/recurring/supabase-recurring-transaction-repository.ts')
const { SupabaseReportRepository } =
  await import('#/data/reports/supabase-reports-repository.ts')
const { SupabaseTransactionRepository } =
  await import('#/data/transactions/supabase-transactions-repository.ts')

describe('createSupabaseDataSource', () => {
  it('builds one Supabase repository per data domain', () => {
    const source = createSupabaseDataSource()

    expect(source.auth).toBeInstanceOf(SupabaseAuthRepository)
    expect(source.categories).toBeInstanceOf(SupabaseCategoryRepository)
    expect(source.profile).toBeInstanceOf(SupabaseProfileRepository)
    expect(source.recurring).toBeInstanceOf(
      SupabaseRecurringTransactionRepository,
    )
    expect(source.reports).toBeInstanceOf(SupabaseReportRepository)
    expect(source.transactions).toBeInstanceOf(SupabaseTransactionRepository)
  })

  it('derives reports from the same transaction repository it hands out', async () => {
    const source = createSupabaseDataSource()
    const listInRange = vi
      .spyOn(source.transactions, 'listInRange')
      .mockResolvedValue([])

    await source.reports.getPeriodReport(
      'profile-1',
      { start: '2026-06-01', end: '2026-07-01' },
      { start: '2026-05-01', end: '2026-06-01' },
    )

    expect(listInRange).toHaveBeenCalledTimes(2)
  })
})

describe('#/data/<feature> swap points', () => {
  it('each hands out the repository from the single active data source', async () => {
    const { authRepository } = await import('#/data/auth/index.ts')
    const { categoryRepository } = await import('#/data/categories/index.ts')
    const { profileRepository } = await import('#/data/profile/index.ts')
    const { recurringTransactionRepository } =
      await import('#/data/recurring/index.ts')
    const { reportRepository } = await import('#/data/reports/index.ts')
    const { transactionRepository } =
      await import('#/data/transactions/index.ts')

    expect(authRepository).toBe(dataSource.auth)
    expect(categoryRepository).toBe(dataSource.categories)
    expect(profileRepository).toBe(dataSource.profile)
    expect(recurringTransactionRepository).toBe(dataSource.recurring)
    expect(reportRepository).toBe(dataSource.reports)
    expect(transactionRepository).toBe(dataSource.transactions)
  })
})
