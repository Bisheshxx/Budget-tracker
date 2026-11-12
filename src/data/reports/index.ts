import { dataSource } from '#/data'

// The report repository the app uses, taken from the active data source. The
// backend is chosen once, in src/data/index.ts — not here. See docs/adr/0011.
export const reportRepository = dataSource.reports
