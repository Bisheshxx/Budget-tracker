import { SupabaseAuthRepository } from './auth/supabase-auth-repository'
import { SupabaseCategoryRepository } from './categories/supabase-categories-repository'
import { SupabaseHouseholdRepository } from './households/supabase-households-repository'
import { SupabaseProfileRepository } from './profile/supabase-profile-repository'
import { SupabaseRecurringTransactionRepository } from './recurring/supabase-recurring-transaction-repository'
import { SupabaseReportRepository } from './reports/supabase-reports-repository'
import { SupabaseTransactionRepository } from './transactions/supabase-transactions-repository'
import type { IDataSource } from './IDataSource'

// Builds the full Supabase-backed repository family. The report repository
// derives from the transaction repository client-side, so the two share one
// instance. See docs/adr/0011.
export function createSupabaseDataSource(): IDataSource {
  const transactions = new SupabaseTransactionRepository()
  return {
    auth: new SupabaseAuthRepository(),
    categories: new SupabaseCategoryRepository(),
    households: new SupabaseHouseholdRepository(),
    profile: new SupabaseProfileRepository(),
    recurring: new SupabaseRecurringTransactionRepository(),
    reports: new SupabaseReportRepository(transactions),
    transactions,
  }
}
