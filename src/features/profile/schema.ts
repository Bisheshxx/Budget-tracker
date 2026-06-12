import { z } from 'zod'

// Single source of truth for Onboarding input. Used by the onboarding form (via
// @hookform/resolvers' zodResolver) AND by ProfileService as a backstop, so the
// required/optional rules never drift between UI and service. See CONTEXT.md for
// the domain language (Period, Payday, Budget Target).

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'INR',
  'NPR',
] as const

export const PAYDAY_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const

// react-hook-form hands string values from inputs; coerce numbers and treat a
// blank string as "not provided" for the optional fields. Whitespace-only
// strings count as blank too, so a display name of "   " is absent (and falls
// back) rather than failing .trim().min(1) validation.
const blankToUndefined = (v: unknown) => {
  if (v === null) return undefined
  if (typeof v === 'string' && v.trim() === '') return undefined
  return v
}

export const onboardingSchema = z.object({
  // Required.
  currency: z.enum(CURRENCIES, { message: 'Select a currency' }),
  budgetPeriodStartDay: z.coerce
    .number({ message: 'Enter a day between 1 and 28' })
    .int('Enter a whole number')
    .min(1, 'Day must be between 1 and 28')
    .max(28, 'Day must be between 1 and 28'),

  // Optional — skippable now, editable later in Settings.
  displayName: z.preprocess(
    blankToUndefined,
    z.string().trim().min(1).max(80, 'Name is too long').optional(),
  ),
  paydayDayOfMonth: z.preprocess(
    blankToUndefined,
    z.coerce
      .number()
      .int('Enter a whole number')
      .min(1, 'Day must be between 1 and 31')
      .max(31, 'Day must be between 1 and 31')
      .optional(),
  ),
  paydayFrequency: z.preprocess(
    blankToUndefined,
    z.enum(PAYDAY_FREQUENCIES).optional(),
  ),
  groceryDayOfWeek: z.preprocess(
    blankToUndefined,
    z.coerce
      .number()
      .int()
      .min(0, 'Pick a day of the week')
      .max(6, 'Pick a day of the week')
      .optional(),
  ),
  // Display units (e.g. dollars); ProfileService converts to integer cents.
  monthlyBudgetTarget: z.preprocess(
    blankToUndefined,
    z.coerce.number().min(0, 'Target cannot be negative').optional(),
  ),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
// Pre-coercion shape the form binds to (all inputs start as strings).
export type OnboardingFormValues = z.input<typeof onboardingSchema>

// display_name is optional input but marks "onboarded" — fall back to the
// email's local part so a user is never stuck un-onboarded.
export function resolveDisplayName(
  rawName: string | undefined,
  email: string | null,
): string {
  const trimmed = rawName?.trim()
  if (trimmed) return trimmed
  return email?.split('@')[0] || 'there'
}
