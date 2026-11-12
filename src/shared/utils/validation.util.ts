import type { z } from 'zod'

// Service-layer validation backstop: parse `input` with the feature's zod
// schema and return the typed result, or throw a plain Error carrying the first
// issue's message — so callers (UI catch blocks, tests) get a friendly message
// rather than a raw ZodError. Every service validates through this, so the rule
// and the error shape are the same everywhere.
export function parseOrThrow<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new Error(result.error.issues[0].message)
  }
  return result.data
}
