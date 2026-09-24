import { describe, expect, it, vi } from 'vitest'
import { ReportService } from '#/features/reports/report-service.ts'
import type { IReportRepository } from '#/data/reports/IReportRepository.ts'
import type { PeriodReport } from '#/features/reports/types.ts'

const EMPTY_REPORT: PeriodReport = {
  comparison: {
    income: {
      currentCents: 0,
      previousCents: 0,
      deltaCents: 0,
      deltaPercent: null,
    },
    expenses: {
      currentCents: 0,
      previousCents: 0,
      deltaCents: 0,
      deltaPercent: null,
    },
    net: {
      currentCents: 0,
      previousCents: 0,
      deltaCents: 0,
      deltaPercent: null,
    },
    byCategory: [],
  },
  weeks: [],
  currentByCategory: [],
}

function makeFakeRepo(overrides: Partial<IReportRepository> = {}) {
  return {
    getPeriodReport: vi.fn(async () => EMPTY_REPORT),
    ...overrides,
  } satisfies IReportRepository
}

describe('ReportService', () => {
  it('resolves the current and previous Period ranges and passes them through', async () => {
    const repo = makeFakeRepo()
    const service = new ReportService(repo)

    // Today 06-13 with anchor 25 → current Period May 25–June 25; previous is the
    // adjacent Apr 25–May 25 (its end meets the current start).
    await service.getPeriodReport('user-1', '2026-06-13', 25)

    expect(repo.getPeriodReport).toHaveBeenCalledWith(
      'user-1',
      { start: '2026-05-25', end: '2026-06-25' },
      { start: '2026-04-25', end: '2026-05-25' },
    )
  })

  it('returns the repository-computed report unchanged', async () => {
    const report = makeFakeRepo()
    const service = new ReportService(report)
    await expect(
      service.getPeriodReport('user-1', '2026-06-13', 1),
    ).resolves.toBe(EMPTY_REPORT)
  })

  it('resolves a custom range against its own mirrored previous range', async () => {
    const repo = makeFakeRepo()
    const service = new ReportService(repo)

    await service.getReport(
      'user-1',
      '2026-06-13',
      'custom',
      1,
      undefined,
      { start: '2026-01-03', end: '2026-01-11' },
    )

    expect(repo.getPeriodReport).toHaveBeenCalledWith(
      'user-1',
      { start: '2026-01-03', end: '2026-01-11' },
      { start: '2025-12-26', end: '2026-01-03' },
    )
  })

  it('throws for the custom view without a customRange', () => {
    const repo = makeFakeRepo()
    const service = new ReportService(repo)

    expect(() =>
      service.getReport('user-1', '2026-06-13', 'custom', 1),
    ).toThrow('custom view requires a customRange')
  })
})
