import { reportRepository } from '#/data/reports'
import { ReportService } from './report-service'

// Composition root for the reports feature: the app-wide ReportService
// singleton, wired to the active report repository. Swap the repository in
// #/data/reports to move off the client-side Supabase derivation.
export const reportService = new ReportService(reportRepository)
