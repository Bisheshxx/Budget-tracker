// Duplicated, framework-free copy of the Due computation logic from
// src/features/recurring/due.ts + the date helpers it needs from
// src/shared/lib/period.ts, for use inside the Deno Edge Function runtime
// (which can't resolve the app's `#/` alias, Vite bundling, or the
// browser-session-bound Supabase client). Keep this in sync with the source of
// truth by hand — there is no automated build step sharing the two runtimes.
// See docs/adr/0010-recurring-transactions-auto-posting.md.

export interface PeriodRange {
  start: string
  end: string
}

export type RecurringFrequency = 'weekly' | 'fortnightly' | 'monthly'
export type MonthlyNth = 1 | 2 | 3 | 4 | -1
export type MonthlyRule =
  | { type: 'day-of-month'; day: number }
  | { type: 'nth-weekday'; weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; nth: MonthlyNth }

export interface RecurringTransactionLike {
  id: string
  name: string
  firstDueDate: string
  frequency: RecurringFrequency
  monthlyRule: MonthlyRule | null
  active: boolean
}

export interface DueOccurrence<T extends RecurringTransactionLike> {
  recurringTransaction: T
  occurrenceDate: string
}

const MS_PER_DAY = 86_400_000

function parseYmd(date: string): {
  year: number
  month: number
  day: number
} {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

function formatYmd(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function addMonths(
  year: number,
  month: number,
  delta: number,
): [number, number] {
  const index = month - 1 + delta
  const newYear = year + Math.floor(index / 12)
  const newMonth = (((index % 12) + 12) % 12) + 1
  return [newYear, newMonth]
}

function addDays(date: string, delta: number): string {
  const { year, month, day } = parseYmd(date)
  const shifted = new Date(Date.UTC(year, month - 1, day) + delta * MS_PER_DAY)
  return formatYmd(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  )
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  nth: 1 | 2 | 3 | 4 | -1,
): string {
  if (nth === -1) {
    const lastDay = daysInMonth(year, month)
    const lastDow = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay()
    const day = lastDay - ((lastDow - weekday + 7) % 7)
    return formatYmd(year, month, day)
  }
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const firstOccurrence = 1 + ((weekday - firstDow + 7) % 7)
  return formatYmd(year, month, firstOccurrence + (nth - 1) * 7)
}

function epochDay(date: string): number {
  const { year, month, day } = parseYmd(date)
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

function monthlyRuleFor(template: RecurringTransactionLike): MonthlyRule {
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

function intervalDaysFor(template: RecurringTransactionLike): number {
  return template.frequency === 'weekly' ? 7 : 14
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

function occurrenceDatesForTemplate(
  template: RecurringTransactionLike,
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

export function computeDue<T extends RecurringTransactionLike>(
  templates: T[],
  period: PeriodRange,
  today: string,
  resolved: ReadonlyArray<{
    recurringTransactionId: string
    occurrenceDate: string
  }>,
): DueOccurrence<T>[] {
  const resolvedKeys = new Set(
    resolved.map((o) => `${o.recurringTransactionId}|${o.occurrenceDate}`),
  )
  const due: DueOccurrence<T>[] = []

  for (const template of templates) {
    if (!template.active) continue
    for (const date of occurrenceDatesForTemplate(template, period, today)) {
      if (resolvedKeys.has(`${template.id}|${date}`)) continue
      due.push({ recurringTransaction: template, occurrenceDate: date })
    }
  }

  return due.sort(
    (a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate) ||
      a.recurringTransaction.name.localeCompare(b.recurringTransaction.name),
  )
}
