// Pure Period-boundary math — no React, no I/O, no timezone surprises. The
// Period is the app's single budgeting unit: a monthly cycle anchored on the
// user's `budget_period_start_day` (constrained 1–28, see PRD / CONTEXT.md).
// Everything keys off `resolvePeriod`. These functions operate on SQL date
// strings ('YYYY-MM-DD') — the same shape as `transactions.transaction_date` —
// so they stay deterministic regardless of the host timezone. Cross-feature
// (transactions summary, reports, recurring), hence src/shared per ADR 0003.

/** A half-open Period range: `start` inclusive, `end` exclusive (the next Period's start). */
export interface PeriodRange {
  /** Inclusive Period start, 'YYYY-MM-DD'. */
  start: string
  /** Exclusive Period end (= next Period's start), 'YYYY-MM-DD'. */
  end: string
}

const MIN_START_DAY = 1
const MAX_START_DAY = 28

// The start day is constrained 1–28 so the anchor day exists in every month
// (no Feb-30 problem). Clamp defensively — a stored 0/31 still resolves sanely.
function clampStartDay(day: number): number {
  return Math.min(MAX_START_DAY, Math.max(MIN_START_DAY, Math.trunc(day)))
}

function parseYmd(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

function formatYmd(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

// Shift a (year, month) pair by `delta` months, keeping month in 1–12 and
// rolling the year. `month` is 1-based.
function addMonths(year: number, month: number, delta: number): [number, number] {
  const index = month - 1 + delta
  const newYear = year + Math.floor(index / 12)
  const newMonth = ((index % 12) + 12) % 12 + 1
  return [newYear, newMonth]
}

/**
 * Resolve the Period containing `today` for an anchor `startDay`. If today's
 * day-of-month is on/after the anchor, the Period started this month on the
 * anchor; otherwise it started last month (the month-flip). End is the same
 * anchor one month on.
 */
export function resolvePeriod(today: string, startDay: number): PeriodRange {
  const anchor = clampStartDay(startDay)
  const { year, month, day } = parseYmd(today)

  let [startYear, startMonth] = [year, month]
  if (day < anchor) {
    ;[startYear, startMonth] = addMonths(year, month, -1)
  }
  const [endYear, endMonth] = addMonths(startYear, startMonth, 1)

  return {
    start: formatYmd(startYear, startMonth, anchor),
    end: formatYmd(endYear, endMonth, anchor),
  }
}

/**
 * A stable identifier for the Period containing `today` — its start date. Two
 * dates in the same Period share a key; useful as a cache key for Period-scoped
 * queries.
 */
export function getPeriodKey(today: string, startDay: number): string {
  return resolvePeriod(today, startDay).start
}

// Whole-day difference between two 'YYYY-MM-DD' dates (b - a), via UTC epoch
// days so DST never shifts the count.
function dayDiff(a: string, b: string): number {
  const { year: ay, month: am, day: ad } = parseYmd(a)
  const { year: by, month: bm, day: bd } = parseYmd(b)
  const msPerDay = 86_400_000
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / msPerDay,
  )
}

/**
 * How many days into the current Period `today` is, 1-based: on the anchor day
 * itself this is 1. Timing context for the Dashboard.
 */
export function daysIntoPeriod(today: string, startDay: number): number {
  const { start } = resolvePeriod(today, startDay)
  return dayDiff(start, today) + 1
}

/** Today as a local 'YYYY-MM-DD' string — the boundary that feeds the pure helpers. */
export function todayYmd(now: Date = new Date()): string {
  return formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate())
}
