import { describe, expect, it } from 'vitest'
import { DataError, isDataError } from '#/data/data-error.ts'
import { toDataError } from '#/data/supabase-error.ts'

describe('toDataError', () => {
  it.each([
    ['23505', 'conflict'],
    ['23503', 'conflict'],
    ['23502', 'invalid'],
    ['23514', 'invalid'],
    ['22P02', 'invalid'],
    ['42501', 'forbidden'],
    ['PGRST116', 'not-found'],
    ['PGRST301', 'unauthenticated'],
  ])('maps the Postgres/PostgREST code %s to %s', (code, expected) => {
    const err = toDataError({ code, message: 'boom', details: '', hint: '' })
    expect(err.code).toBe(expected)
  })

  it.each([
    [{ code: 'invalid_credentials', status: 400 }, 'unauthenticated'],
    [{ code: 'user_already_exists', status: 422 }, 'conflict'],
    [{ code: 'over_request_rate_limit', status: 429 }, 'rate-limited'],
    [{ status: 401 }, 'unauthenticated'],
    [{ status: 403 }, 'forbidden'],
    [{ status: 404 }, 'not-found'],
    [{ status: 409 }, 'conflict'],
    [{ status: 422 }, 'invalid'],
    [{ status: 429 }, 'rate-limited'],
    [{ status: 500 }, 'unknown'],
  ])('maps the auth error %o to %s', (source, expected) => {
    expect(toDataError({ message: 'boom', ...source }).code).toBe(expected)
  })

  it('treats a dropped connection as a network error', () => {
    expect(toDataError({ status: 0, message: 'x' }).code).toBe('network')
    expect(toDataError({ message: 'TypeError: Failed to fetch' }).code).toBe(
      'network',
    )
    expect(toDataError(new TypeError('fetch failed')).code).toBe('network')
  })

  it('keeps the original message and exposes the source as `cause`', () => {
    const source = { code: '23505', message: 'duplicate key value' }
    const err = toDataError(source)

    expect(err).toBeInstanceOf(Error)
    expect(isDataError(err)).toBe(true)
    expect(err.name).toBe('DataError')
    expect(err.message).toBe('duplicate key value')
    expect(err.cause).toBe(source)
  })

  it('falls back to "unknown" with a generic message for shapeless input', () => {
    expect(toDataError({})).toMatchObject({
      code: 'unknown',
      message: 'Something went wrong',
    })
    expect(toDataError(null)).toMatchObject({
      code: 'unknown',
      message: 'Something went wrong',
    })
    expect(toDataError('plain string')).toMatchObject({
      code: 'unknown',
      message: 'plain string',
    })
  })

  it('passes an existing DataError through untouched', () => {
    const original = new DataError('forbidden', 'nope')
    expect(toDataError(original)).toBe(original)
  })
})
