// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPendingInvite,
  formatMomentDate,
  inviteUrl,
  readPendingInvite,
  writePendingInvite,
} from '#/features/households/utils/invite.util.ts'

afterEach(() => window.localStorage.clear())

describe('inviteUrl', () => {
  it('builds the join link from the site origin and token', () => {
    expect(inviteUrl('https://budget.example', 'abc123')).toBe(
      'https://budget.example/join/abc123',
    )
  })

  it('escapes a token that is not URL-safe', () => {
    expect(inviteUrl('https://budget.example', 'a/b?c')).toBe(
      'https://budget.example/join/a%2Fb%3Fc',
    )
  })
})

describe('formatMomentDate', () => {
  it("shows a moment as a short date in the device's zone", () => {
    // Noon local time, so the expected day holds whatever zone the tests run in.
    const noonLocal = new Date(2026, 10, 20, 12).toISOString()

    expect(formatMomentDate(noonLocal, 'en-GB')).toBe('20 Nov')
  })
})

describe('pending invite', () => {
  it('is empty until an invite is parked', () => {
    expect(readPendingInvite()).toBeNull()
  })

  it('remembers the parked token until cleared', () => {
    writePendingInvite('abc123')
    expect(readPendingInvite()).toBe('abc123')

    clearPendingInvite()
    expect(readPendingInvite()).toBeNull()
  })
})
