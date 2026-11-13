// IANA time-zone helpers for the Household time zone (see CONTEXT.md).

/** Whether the runtime recognises `timeZone` as an IANA zone name. */
export function isKnownTimeZone(timeZone: string): boolean {
  if (!timeZone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

/**
 * Every zone the picker offers, sorted. `always` are added on top of the
 * runtime's own list, which omits "UTC" and can lag behind a device's zone.
 */
export function listTimeZones(always: readonly string[] = []): string[] {
  const zones = new Set([
    ...always.filter(isKnownTimeZone),
    'UTC',
    ...Intl.supportedValuesOf('timeZone'),
  ])
  return [...zones].sort((a, b) => a.localeCompare(b))
}

/** "Pacific/Port_Moresby" reads better as "Pacific/Port Moresby". */
export function timeZoneLabel(timeZone: string): string {
  return timeZone.replaceAll('_', ' ')
}
