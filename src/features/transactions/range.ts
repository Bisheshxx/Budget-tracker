// Pure helpers for the Range filter (see PRD B) — no React, no I/O. A Range is a
// free-form from/to span the user explores, *not* a Period (see CONTEXT.md): no
// anchor, no Budget Target, no pass/fail. Both dates are inclusive in the UI.

import { addDays, parseYmd } from '#/shared/period'
import type { PeriodRange } from '#/shared/period'

// An inclusive from/to span as the UI and URL carry it.
export interface Range {
  /** Inclusive start, 'YYYY-MM-DD'. */
  from: string
  /** Inclusive end, 'YYYY-MM-DD'. */
  to: string
}

/**
 * Convert an inclusive Range into the half-open [start, end) bounds the data
 * layer speaks (matching listInRange / PeriodRange): `end` is the day *after*
 * `to`. This is the single place the +1-day conversion happens, so the card
 * summary and the list never disagree on what "through `to`" means.
 */
export function rangeToBounds(range: Range): PeriodRange {
  return { start: range.from, end: addDays(range.to, 1) }
}

/**
 * The Range's display label for the card title and list heading, e.g.
 * "3 Jan – 18 Mar 2026". Both ends are inclusive dates ('YYYY-MM-DD').
 */
export function formatRangeLabel(range: Range): string {
  return `${formatDate(range.from)} – ${formatDate(range.to)}`
}

function formatDate(date: string): string {
  const { year, month, day } = parseYmd(date)
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}
