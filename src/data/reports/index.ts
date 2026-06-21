import { transactionRepository } from '#/data/transactions'
import { SupabaseReportRepository } from './supabase-reports-repository'
import type { IReportRepository } from './IReportRepository'

// THE swap point for report data. The V1 impl derives reports from the
// transaction repository client-side; replace this one construction with an
// axios-backed impl that calls the future Node.js reports endpoint and nothing
// else changes.
export const reportRepository: IReportRepository = new SupabaseReportRepository(
  transactionRepository,
)
