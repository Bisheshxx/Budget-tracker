// Pure Due computation — no React, no I/O. Given the active templates, the
// current Period range, today, and the already-resolved occurrences, derive the
// Due items to auto-post. Nothing is pre-materialized: "Due" is computed on
// read (see ADR 0010, which supersedes ADR 0006 §1-2). Operates on SQL date
// strings ('YYYY-MM-DD'), which sort lexicographically, so all range checks are
// plain string comparisons and stay timezone-deterministic (mirrors
// #/shared/lib/period).

import {
  addDays,
  addMonths,
  formatYmd,
  nthWeekdayOfMonth,
  parseYmd,
} from '#/shared/lib/period'
import { MS_PER_DAY } from '#/shared/constants/period.constant'
import type { PeriodRange } from '#/shared/lib/period'
import type { DueOccurrence, MonthlyRule, RecurringTransaction } from './types'

function epochDay(date: string): number {
  const { year, month, day } = parseYmd(date)
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

// Legacy/defensive fallback for a monthly template whose monthlyRule is
// somehow missing (should be impossible post-migration — every monthly row is
// backfilled to a day-of-month rule) — derive one from firstDueDate's day so
// behavior degrades to the pre-nth-weekday rule rather than throwing.
function monthlyRuleFor(template: RecurringTransaction): MonthlyRule {
  return (
    template.monthlyRule ?? {
      type: 'day-of-month',
      day: Number(template.firstDueDate.slice(8, 10)),
    }
  )
}

function dateForMonthlyRule(
  rule: MonthlyRule,
  year: number,
  month: number,
): string {
  return rule.type === 'nth-weekday'
    ? nthWeekdayOfMonth(year, month, rule.weekday, rule.nth)
    : formatYmd(year, month, rule.day)
}

// The first monthly occurrence date on/after `from`, walking forward from
// firstDueDate's anchor month.
function nextMonthlyOccurrenceOnOrAfter(
  firstDueDate: string,
  rule: MonthlyRule,
  from: string,
): string {
  const first = parseYmd(firstDueDate)
  let year = first.year
  let month = first.month
  let date = dateForMonthlyRule(rule, year, month)
  while (date < from) {
    ;[year, month] = addMonths(year, month, 1)
    date = dateForMonthlyRule(rule, year, month)
  }
  return date
}

function monthlyOccurrenceDates(
  firstDueDate: string,
  rule: MonthlyRule,
  start: string,
  today: string,
): string[] {
  const dates: string[] = []
  let date = nextMonthlyOccurrenceOnOrAfter(firstDueDate, rule, start)
  let { year, month } = parseYmd(date)

  for (
    ;
    date <= today;
    [year, month] = addMonths(year, month, 1),
      date = dateForMonthlyRule(rule, year, month)
  ) {
    dates.push(date)
  }

  return dates
}

/**
 * The Due occurrences to auto-post, sorted by date then template name. An
 * occurrence is Due when its date is within the requested window — on/after the
 * window start and on/before `today` — and has no resolved
 * (`confirmed`/`skipped`) occurrence on that date.
 *
 * Weekly and fortnightly templates repeat every 7/14 days from firstDueDate.
 * Monthly templates repeat per their monthlyRule (day-of-month or nth-weekday).
 * Inactive templates never surface, so a deactivated template stops posting
 * immediately while its history remains.
 */
export function computeDue(
  templates: RecurringTransaction[],
  period: PeriodRange,
  today: string,
  resolved: ReadonlyArray<{
    recurringTransactionId: string
    occurrenceDate: string
  }>,
): DueOccurrence[] {
  const resolvedKeys = new Set(
    resolved.map((o) => `${o.recurringTransactionId}|${o.occurrenceDate}`),
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
      due.push({ recurringTransaction: template, occurrenceDate: date })
    }
  }

  return due.sort(
    (a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate) ||
      a.recurringTransaction.name.localeCompare(b.recurringTransaction.name),
  )
}

function occurrenceDatesForTemplate(
  template: RecurringTransaction,
  period: PeriodRange,
  today: string,
): string[] {
  const windowStart =
    template.firstDueDate > period.start ? template.firstDueDate : period.start

  if (template.frequency === 'monthly') {
    return monthlyOccurrenceDates(
      template.firstDueDate,
      monthlyRuleFor(template),
      windowStart,
      today,
    )
  }

  return intervalOccurrenceDates(
    template.firstDueDate,
    windowStart,
    today,
    intervalDaysFor(template),
  ).filter((date) => date >= period.start && date <= today)
}

/**
 * The single next occurrence date on/after `from` — not bounded by "today",
 * unlike computeDue. Used to show/skip an upcoming occurrence before it's due
 * (pre-emptive skip).
 */
export function nextOccurrenceOnOrAfter(
  template: RecurringTransaction,
  from: string,
): string {
  const start = template.firstDueDate > from ? template.firstDueDate : from

  if (template.frequency === 'monthly') {
    return nextMonthlyOccurrenceOnOrAfter(
      template.firstDueDate,
      monthlyRuleFor(template),
      start,
    )
  }

  return nextIntervalOccurrenceOnOrAfter(
    template.firstDueDate,
    start,
    intervalDaysFor(template),
  )
}

function intervalDaysFor(template: RecurringTransaction): number {
  return template.frequency === 'weekly' ? 7 : 14
}

function isResolved(
  resolvedKeys: Set<string>,
  template: RecurringTransaction,
  date: string,
): boolean {
  return resolvedKeys.has(`${template.id}|${date}`)
}

function nextIntervalOccurrenceOnOrAfter(
  firstDueDate: string,
  from: string,
  intervalDays: number,
): string {
  const firstDay = epochDay(firstDueDate)
  const startOffset = Math.max(0, epochDay(from) - firstDay)
  const firstOffset = Math.ceil(startOffset / intervalDays) * intervalDays
  return addDays(firstDueDate, firstOffset)
}

function intervalOccurrenceDates(
  firstDueDate: string,
  start: string,
  today: string,
  intervalDays: number,
): string[] {
  const dates: string[] = []
  for (
    let date = nextIntervalOccurrenceOnOrAfter(
      firstDueDate,
      start,
      intervalDays,
    );
    date <= today;
    date = addDays(date, intervalDays)
  ) {
    dates.push(date)
  }
  return dates
}
