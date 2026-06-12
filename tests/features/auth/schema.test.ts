import { describe, expect, it } from 'vitest'
import { credentialsSchema } from '#/features/auth/schema.ts'

describe('credentialsSchema', () => {
  it('accepts a valid email and a 6+ char password', () => {
    const result = credentialsSchema.safeParse({
      email: 'a@b.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an email without "@" with a friendly message', () => {
    const result = credentialsSchema.safeParse({
      email: 'nope',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path[0] === 'email')
      expect(emailIssue?.message).toBe('Enter a valid email address')
    }
  })

  it('rejects a password shorter than 6 chars with a friendly message', () => {
    const result = credentialsSchema.safeParse({
      email: 'a@b.com',
      password: '12345',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const pwIssue = result.error.issues.find((i) => i.path[0] === 'password')
      expect(pwIssue?.message).toBe('Password must be at least 6 characters')
    }
  })

  it('reports both fields when both are invalid', () => {
    const result = credentialsSchema.safeParse({ email: 'nope', password: '1' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain('email')
      expect(paths).toContain('password')
    }
  })
})
