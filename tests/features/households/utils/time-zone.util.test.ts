import { describe, expect, it } from 'vitest'
import {
  isKnownTimeZone,
  listTimeZones,
  timeZoneLabel,
} from '#/features/households/utils/time-zone.util.ts'

describe('isKnownTimeZone', () => {
  it('recognises IANA zone names', () => {
    expect(isKnownTimeZone('Pacific/Auckland')).toBe(true)
    expect(isKnownTimeZone('Asia/Kathmandu')).toBe(true)
    expect(isKnownTimeZone('UTC')).toBe(true)
  })

  it('rejects blanks and made-up names', () => {
    expect(isKnownTimeZone('')).toBe(false)
    expect(isKnownTimeZone('Mars/Olympus')).toBe(false)
  })
})

describe('listTimeZones', () => {
  it('offers UTC and the common zones, sorted, without duplicates', () => {
    const zones = listTimeZones(['Pacific/Auckland'])

    expect(zones).toContain('UTC')
    expect(zones).toContain('Pacific/Auckland')
    expect(zones).toContain('America/New_York')
    expect(new Set(zones).size).toBe(zones.length)
    expect(zones).toEqual([...zones].sort((a, b) => a.localeCompare(b)))
  })

  it('never offers a zone the runtime cannot use', () => {
    expect(listTimeZones(['Mars/Olympus'])).not.toContain('Mars/Olympus')
  })
})

describe('timeZoneLabel', () => {
  it('shows underscores as spaces', () => {
    expect(timeZoneLabel('America/New_York')).toBe('America/New York')
  })
})
