import type { IAuthRepository } from './auth/IAuthRepository'
import type { ICategoryRepository } from './categories/ICategoryRepository'
import type { IHouseholdRepository } from './households/IHouseholdRepository'
import type { IProfileRepository } from './profile/IProfileRepository'
import type { IRecurringTransactionRepository } from './recurring/IRecurringTransactionRepository'
import type { IReportRepository } from './reports/IReportRepository'
import type { ITransactionRepository } from './transactions/ITransactionRepository'

// The whole backend, as the app sees it: one repository per data domain. A
// backend is "supported" when it has a factory that returns this (an Abstract
// Factory — see docs/adr/0011). `createSupabaseDataSource` is the only one
// today; the REST backend adds a second and `#/data` picks between them.
export interface IDataSource {
  auth: IAuthRepository
  categories: ICategoryRepository
  households: IHouseholdRepository
  profile: IProfileRepository
  recurring: IRecurringTransactionRepository
  reports: IReportRepository
  transactions: ITransactionRepository
}
