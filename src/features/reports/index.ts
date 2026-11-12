import { reportRepository } from '#/data/reports'
import { ReportService } from './report-service'

// Composition root for the reports feature: the app-wide ReportService
// singleton, wired to the active report repository.
// The backend behind it is chosen in src/data/index.ts (docs/adr/0011) —
// nothing here changes on a swap.
export const reportService = new ReportService(reportRepository)
