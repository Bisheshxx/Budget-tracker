import { DataError } from './data-error'
import type { DataErrorCode } from './data-error'

// Anti-corruption layer for failures: turns whatever supabase-js hands back
// (a PostgrestError, an AuthError, or a thrown fetch failure) into the app's
// own DataError, so no Supabase error shape crosses the repository port. The
// original is kept as `cause` for debugging; the message is passed through
// unchanged so the UI copy is the same as before. See docs/adr/0011.

// Postgres SQLSTATE / PostgREST codes → DataError codes.
const POSTGREST_CODES: Record<string, DataErrorCode> = {
  '23505': 'conflict', // unique_violation
  '23503': 'conflict', // foreign_key_violation
  '23502': 'invalid', // not_null_violation
  '23514': 'invalid', // check_violation
  '22P02': 'invalid', // invalid_text_representation (e.g. a malformed uuid)
  '42501': 'forbidden', // insufficient_privilege (RLS)
  PGRST116: 'not-found', // .single() matched no row
  PGRST301: 'unauthenticated', // JWT expired / invalid
}

// supabase-js auth error codes that say more than their HTTP status does.
const AUTH_CODES: Record<string, DataErrorCode> = {
  invalid_credentials: 'unauthenticated',
  user_already_exists: 'conflict',
  email_exists: 'conflict',
  over_request_rate_limit: 'rate-limited',
  over_email_send_rate_limit: 'rate-limited',
}

const HTTP_STATUSES: Record<number, DataErrorCode> = {
  400: 'invalid',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  422: 'invalid',
  429: 'rate-limited',
}

const FETCH_FAILURE_RE =
  /failed to fetch|fetch failed|networkerror|load failed/i

function codeFor(error: {
  code?: unknown
  status?: unknown
  message?: unknown
}): DataErrorCode {
  const code = typeof error.code === 'string' ? error.code : ''
  if (code in POSTGREST_CODES) return POSTGREST_CODES[code]
  if (code in AUTH_CODES) return AUTH_CODES[code]

  const message = typeof error.message === 'string' ? error.message : ''
  // supabase-js reports a dropped connection as status 0 (auth) or as an
  // error whose message carries the underlying TypeError (postgrest).
  if (error.status === 0 || FETCH_FAILURE_RE.test(message)) return 'network'

  if (typeof error.status === 'number' && error.status in HTTP_STATUSES) {
    return HTTP_STATUSES[error.status]
  }
  return 'unknown'
}

export function toDataError(error: unknown): DataError {
  if (error instanceof DataError) return error
  if (typeof error !== 'object' || error === null) {
    return new DataError('unknown', String(error || 'Something went wrong'), {
      cause: error,
    })
  }
  const source = error as {
    code?: unknown
    status?: unknown
    message?: unknown
  }
  const message =
    typeof source.message === 'string' && source.message
      ? source.message
      : 'Something went wrong'
  return new DataError(codeFor(source), message, { cause: error })
}
