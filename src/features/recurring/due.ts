// Pure Due computation — no React, no I/O. Given the active templates, the
// current Period range, today, and the already-resolved occurrences, derive the
// Due items to prompt for. Nothing is pre-materialized: "Due" is computed on
// read (see ADR 0006). Operates on SQL date strings ('YYYY-MM-DD'), which sort
// lexicographically, so all range checks are plain string comparisons and stay
// timezone-deterministic (mirrors #/shared/period).

import { addMonths, formatYmd, parseYmd } from '#/shared/period'
import type { PeriodRange } from '#/shared/period'
import type { DueOccurrence, RecurringExpense } from './types'

// Day of week for a 'YYYY-MM-DD' date, 0=Sunday..6=Saturday (UTC so it never
// shifts with the host timezone). Matches recurring_expenses.anchor_day for
// weekly templates and WEEKDAY_LABELS in schema.ts.
function dayOfWeek(date: string): number {
  const { year, month, day } = parseYmd(date)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function nextDay(date: string): string {
  const { year, month, day } = parseYmd(date)
  const d = new Date(Date.UTC(year, month - 1, day + 1))
  return formatYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

// The single date in the current Period on which a monthly template falls. The
// Period is anchored on `period.start`'s day-of-month; a template anchorDay on or
// after that lands in the start month, otherwise in the following month — either
// way inside [start, end).
function monthlyOccurrenceDate(anchorDay: number, period: PeriodRange): string {
  const { year, month, day: periodStartDay } = parseYmd(period.start)
  if (anchorDay >= periodStartDay) {
    return formatYmd(year, month, anchorDay)
  }
  const [y, m] = addMonths(year, month, 1)
  return formatYmd(y, m, anchorDay)
}

/**
 * The Due occurrences to prompt for, sorted by date then template name. An
 * occurrence is Due when its date is within the current window — on/after the
 * Period start and on/before `today` (future dates in the Period aren't prompted
 * yet) — and has no resolved (`confirmed`/`skipped`) occurrence on that date.
 *
 * Weekly templates surface once per matching weekday in the window; monthly
 * templates surface once per Period. Inactive templates never surface, so a
 * deactivated template stops prompting immediately while its history remains.
 */
export function computeDue(
  templates: RecurringExpense[],
  period: PeriodRange,
  today: string,
  resolved: ReadonlyArray<{
    recurringExpenseId: string
    occurrenceDate: string
  }>,
): DueOccurrence[] {
  const resolvedKeys = new Set(
    resolved.map((o) => `${o.recurringExpenseId}|${o.occurrenceDate}`),
  )

  const due: DueOccurrence[] = []

  for (const template of templates) {
    if (!template.active) continue

    const candidateDates =
      template.frequency === 'monthly'
        ? [monthlyOccurrenceDate(template.anchorDay, period)]
        : weeklyOccurrenceDates(template.anchorDay, period.start, today)

    for (const date of candidateDates) {
      // Within the window: [period.start, today]. (today is always inside the
      // current Period, so the period end never excludes it.)
      if (date < period.start || date > today) continue
      if (resolvedKeys.has(`${template.id}|${date}`)) continue
      due.push({ recurringExpense: template, occurrenceDate: date })
    }
  }

  return due.sort(
    (a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate) ||
      a.recurringExpense.name.localeCompare(b.recurringExpense.name),
  )
}

// Every date in [start, today] (inclusive) whose weekday matches `anchorDay`.
function weeklyOccurrenceDates(
  anchorDay: number,
  start: string,
  today: string,
): string[] {
  const dates: string[] = []
  for (let date = start; date <= today; date = nextDay(date)) {
    if (dayOfWeek(date) === anchorDay) dates.push(date)
  }
  return dates
}
