// The error half of the repository contract (see docs/adr/0011). Every
// repository implementation — Supabase today, the REST backend later — throws
// DataError and nothing else for a failed data call, so services, hooks and UI
// can branch on `code` without knowing which backend produced the failure.
//
// The codes map 1:1 onto the HTTP statuses the future backend will return:
//   invalid → 400/422, unauthenticated → 401, forbidden → 403, not-found → 404,
//   conflict → 409, rate-limited → 429, network → no response, unknown → 5xx.
export type DataErrorCode =
  | 'invalid'
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  | 'network'
  | 'unknown'

export class DataError extends Error {
  readonly code: DataErrorCode

  constructor(code: DataErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DataError'
    this.code = code
  }
}

export function isDataError(err: unknown): err is DataError {
  return err instanceof DataError
}
