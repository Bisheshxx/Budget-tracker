// Pure helpers for the Range filter (see PRD B) — no React, no I/O. A Range is a
// free-form from/to span the user explores, *not* a Period (see CONTEXT.md): no
// First Due Date, no target, no pass/fail. Both dates are inclusive in the UI.
// Shared across the transactions (Dashboard Cashflow/Recent list) and reports
// features — promoted here per ADR 0003 once reports became a second consumer.

import { addDays, parseYmd } from '#/shared/lib/period'
import type { PeriodRange } from '#/shared/lib/period'

// An inclusive from/to span as the UI and URL carry it.
export interface Range {
  /** Inclusive start, 'YYYY-MM-DD'. */
  from: string
  /** Inclusive end, 'YYYY-MM-DD'. */
  to: string
}

/**
 * Resolve a `?from=&to=` search-param pair into the active Range, or null for
 * "no Range" (falls back to whatever default the caller uses instead). Active
 * only when both ends resolved (validateSearch keeps each lenient) and the
 * span isn't inverted — a hand-edited URL with from > to falls back to the
 * default rather than showing an empty inverted span.
 */
export function searchToRange(from?: string, to?: string): Range | null {
  return from && to && from <= to ? { from, to } : null
}

/**
 * Convert an inclusive Range into the half-open [start, end) bounds the data
 * layer speaks (matching listInRange / PeriodRange): `end` is the day *after*
 * `to`. This is the single place the +1-day conversion happens, so callers
 * never disagree on what "through `to`" means.
 */
export function rangeToBounds(range: Range): PeriodRange {
  return { start: range.from, end: addDays(range.to, 1) }
}

/**
 * Map an inclusive Range to the infinite-list hook's half-open {from, to}
 * window, or undefined so the hook falls back to its default (current
 * Period).
 */
export function rangeToHookBounds(range: Range | null | undefined) {
  if (!range) return undefined
  const { start, end } = rangeToBounds(range)
  return { from: start, to: end }
}

/**
 * The Range's display label for card titles and headings, e.g.
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
