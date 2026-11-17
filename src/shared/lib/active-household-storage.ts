// Which Household the user last chose to look at, remembered per profile in
// localStorage. This is a device preference, not server state and not something
// that grants access: the id is only ever matched against the Households the
// backend says the user belongs to (HouseholdService.resolveActive).
//
// Deliberately not in the zustand UI store — that store is a module singleton
// shared across SSR requests and must never hold per-user data (ADR 0007).
// Everything here is a no-op on the server.

const listeners = new Set<() => void>()

const storageKey = (profileId: string) => `budget:active-household:${profileId}`

export function readActiveHouseholdId(profileId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(profileId))
  } catch {
    // No window (SSR) or storage blocked: fall back to the default Household.
    return null
  }
}

export function writeActiveHouseholdId(profileId: string, id: string): void {
  try {
    window.localStorage.setItem(storageKey(profileId), id)
  } catch {
    // Storage blocked: the choice still applies for this page via listeners.
  }
  listeners.forEach((listener) => listener())
}

/** Subscribe to changes from this tab and (via the storage event) other tabs. */
export function subscribeActiveHousehold(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}
