// Invite links and the invite a signed-out visitor arrived with.

/** The link a person opens to join: `<origin>/join/<token>`. */
export function inviteUrl(origin: string, token: string): string {
  return `${origin}/join/${encodeURIComponent(token)}`
}

/** A UTC moment as a short local date, e.g. "20 Nov". */
export function formatMomentDate(iso: string, locale?: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  })
}

// Someone who opens an invite link signed out has to log in or sign up first,
// which loses the URL. The token is parked here (this device only) and picked
// up by the signed-in layout, then cleared as soon as the join page shows.
const PENDING_INVITE_KEY = 'budget:pending-invite'

export function readPendingInvite(): string | null {
  try {
    return window.localStorage.getItem(PENDING_INVITE_KEY)
  } catch {
    return null
  }
}

export function writePendingInvite(token: string): void {
  try {
    window.localStorage.setItem(PENDING_INVITE_KEY, token)
  } catch {
    // Storage unavailable: the visitor reopens the link after signing in.
  }
}

export function clearPendingInvite(): void {
  try {
    window.localStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    // Nothing to clear.
  }
}
