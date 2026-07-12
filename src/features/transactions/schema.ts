import { z } from 'zod'
import { fromCents } from '#/lib/money'
import { TRANSACTION_TYPES } from './constants/transactions.constant'
import type { Transaction } from './types'

// Single source of truth for the quick-add form. Used by the form (via
// @hookform/resolvers' zodResolver) AND by TransactionService as a backstop, so
// the rules never drift between UI and service. Amounts are entered in display
// units (e.g. dollars); the service converts to integer cents. See CONTEXT.md.

export { TRANSACTION_TYPES }

// react-hook-form hands string values from inputs; coerce numbers and treat a
// blank string as "not provided" for the optional note. Mirrors the idiom in
// profile/schema.ts.
const blankToUndefined = (v: unknown) => {
  if (v === null) return undefined
  if (typeof v === 'string' && v.trim() === '') return undefined
  return v
}

// Default the date to today (local), as a 'YYYY-MM-DD' string.
export function today(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

export const quickAddSchema = z.object({
  // Map a blank string to undefined first so an empty input reads as the
  // "Enter an amount" type error rather than coercing to 0 ('Amount must be
  // greater than 0').
  amount: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ message: 'Enter an amount' })
      .positive('Amount must be greater than 0'),
  ),
  type: z.enum(TRANSACTION_TYPES, { message: 'Pick income or expense' }),
  // A category id, or '' / undefined for Uncategorized (stored as null).
  categoryId: z.preprocess(blankToUndefined, z.string().optional()),
  // Blank defaults to today; otherwise must be a valid ISO YYYY-MM-DD date so
  // malformed strings can't reach the service/DB.
  transactionDate: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? today() : v),
    z.iso.date('Enter a valid date'),
  ),
  note: z.preprocess(
    blankToUndefined,
    z.string().trim().max(280, 'Note is too long').optional(),
  ),
})

export type QuickAddInput = z.infer<typeof quickAddSchema>
// Pre-coercion shape the form binds to (all inputs start as strings).
export type QuickAddFormValues = z.input<typeof quickAddSchema>

// The Range filter form (see PRD B): a free-form from/to span the user explores,
// distinct from a Period. Both dates required; both inclusive in the UI. `from`
// must be on/before `to`, and `to` can't be in the future. Lexicographic string
// comparison is correct for zero-padded 'YYYY-MM-DD'. Single source of truth for
// the RangeFilter form; the half-open conversion lives in range.ts.
export const rangeSchema = z
  .object({
    from: z.iso.date('Enter a start date'),
    to: z.iso.date('Enter an end date'),
  })
  .refine((v) => v.from <= v.to, {
    message: 'Start must be on or before end',
    path: ['from'],
  })
  .refine((v) => v.to <= today(), {
    message: "End can't be in the future",
    path: ['to'],
  })

// Validator for the dashboard's `?from=&to=` search params (route validateSearch).
// Both optional and independently lenient: a malformed value falls back to
// undefined rather than throwing mid-navigation. A Range is active only when
// both resolve (enforced where the params are read).
export const rangeSearchSchema = z.object({
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
})

// Seed the form from an existing transaction for edit mode. Cents → display
// units for the amount input; null category/note become '' for the controlled
// inputs (Uncategorized / blank note).
export function transactionToFormValues(tx: Transaction): QuickAddFormValues {
  return {
    amount: String(fromCents(tx.amountCents)),
    type: tx.type,
    categoryId: tx.categoryId ?? '',
    transactionDate: tx.transactionDate,
    note: tx.note ?? '',
  }
}
