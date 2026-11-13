// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  readActiveHouseholdId,
  subscribeActiveHousehold,
  writeActiveHouseholdId,
} from '#/shared/lib/active-household-storage.ts'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('active household storage', () => {
  it('is empty until a Household has been chosen', () => {
    expect(readActiveHouseholdId('profile-1')).toBeNull()
  })

  it('remembers the choice per profile', () => {
    writeActiveHouseholdId('profile-1', 'flat')
    writeActiveHouseholdId('profile-2', 'family')

    expect(readActiveHouseholdId('profile-1')).toBe('flat')
    expect(readActiveHouseholdId('profile-2')).toBe('family')
  })

  it('notifies subscribers on a change, until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeActiveHousehold(listener)

    writeActiveHouseholdId('profile-1', 'flat')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    writeActiveHouseholdId('profile-1', 'family')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers when another tab changes it', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeActiveHousehold(listener)

    window.dispatchEvent(new StorageEvent('storage'))

    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('degrades to "nothing remembered" when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(() => writeActiveHouseholdId('profile-1', 'flat')).not.toThrow()
    expect(readActiveHouseholdId('profile-1')).toBeNull()
  })
})
