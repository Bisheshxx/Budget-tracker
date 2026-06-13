import { z } from 'zod'
import { fromCents } from '#/lib/money'
import type { Transaction } from './types'

// Single source of truth for the quick-add form. Used by the form (via
// @hookform/resolvers' zodResolver) AND by TransactionService as a backstop, so
// the rules never drift between UI and service. Amounts are entered in display
// units (e.g. dollars); the service converts to integer cents. See CONTEXT.md.

export const TRANSACTION_TYPES = ['income', 'expense'] as const

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
