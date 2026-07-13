// Pure Due computation — no React, no I/O. Given the active templates, the
// current Period range, today, and the already-resolved occurrences, derive the
// Due items to prompt for. Nothing is pre-materialized: "Due" is computed on
// read (see ADR 0006). Operates on SQL date strings ('YYYY-MM-DD'), which sort
// lexicographically, so all range checks are plain string comparisons and stay
// timezone-deterministic (mirrors #/shared/lib/period).

import { addDays, addMonths, formatYmd, parseYmd } from '#/shared/lib/period'
import { MS_PER_DAY } from '#/shared/constants/period.constant'
import type { PeriodRange } from '#/shared/lib/period'
import type { DueOccurrence, RecurringExpense } from './types'

function epochDay(date: string): number {
  const { year, month, day } = parseYmd(date)
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

function monthlyOccurrenceDates(
  firstDueDate: string,
  start: string,
  today: string,
): string[] {
  const dates: string[] = []
  const first = parseYmd(firstDueDate)
  const dueDay = first.day
  let year = first.year
  let month = first.month

  while (formatYmd(year, month, dueDay) < start) {
    ;[year, month] = addMonths(year, month, 1)
  }

  for (
    let date = formatYmd(year, month, dueDay);
    date <= today;
    [year, month] = addMonths(year, month, 1),
      date = formatYmd(year, month, dueDay)
  ) {
    dates.push(date)
  }

  return dates
}

/**
 * The Due occurrences to prompt for, sorted by date then template name. An
 * occurrence is Due when its date is within the requested window — on/after the
 * window start and on/before `today` — and has no resolved
 * (`confirmed`/`skipped`) occurrence on that date.
 *
 * Weekly and fortnightly templates repeat every 7/14 days from firstDueDate.
 * Monthly templates repeat on firstDueDate's day-of-month. Inactive templates
 * never surface, so a deactivated template stops prompting immediately while
 * its history remains.
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
    if (!template.active) {
      continue
    }
    for (const date of occurrenceDatesForTemplate(template, period, today)) {
      if (isResolved(resolvedKeys, template, date)) {
        continue
      }
      due.push({ recurringExpense: template, occurrenceDate: date })
    }
  }

  return due.sort(
    (a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate) ||
      a.recurringExpense.name.localeCompare(b.recurringExpense.name),
  )
}

function occurrenceDatesForTemplate(
  template: RecurringExpense,
  period: PeriodRange,
  today: string,
): string[] {
  const windowStart =
    template.firstDueDate > period.start ? template.firstDueDate : period.start

  if (template.frequency === 'monthly') {
    return monthlyOccurrenceDates(template.firstDueDate, windowStart, today)
  }

  return intervalOccurrenceDates(
    template.firstDueDate,
    windowStart,
    today,
    intervalDaysFor(template),
  ).filter((date) => date >= period.start && date <= today)
}

function intervalDaysFor(template: RecurringExpense): number {
  return template.frequency === 'weekly' ? 7 : 14
}

function isResolved(
  resolvedKeys: Set<string>,
  template: RecurringExpense,
  date: string,
): boolean {
  return resolvedKeys.has(`${template.id}|${date}`)
}

function intervalOccurrenceDates(
  firstDueDate: string,
  start: string,
  today: string,
  intervalDays: number,
): string[] {
  const dates: string[] = []
  const firstDay = epochDay(firstDueDate)
  const startOffset = Math.max(0, epochDay(start) - firstDay)
  const firstOffset = Math.ceil(startOffset / intervalDays) * intervalDays

  for (
    let date = addDays(firstDueDate, firstOffset);
    date <= today;
    date = addDays(date, intervalDays)
  ) {
    dates.push(date)
  }
  return dates
}
