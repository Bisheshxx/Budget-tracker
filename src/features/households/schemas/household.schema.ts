import { z } from 'zod'
import { CURRENCIES } from '#/shared/constants/currency.constant'
import {
  MAX_START_DAY,
  MIN_START_DAY,
} from '#/shared/constants/period.constant'
import { isKnownTimeZone } from '#/features/households/utils/time-zone.util'

const PERIOD_DAY_MESSAGE = `Day must be between ${MIN_START_DAY} and ${MAX_START_DAY}`

// Single source of truth for creating a group: bound by CreateHouseholdForm and
// re-checked by HouseholdService. The database enforces the same bounds (see
// supabase/migrations/20261112000100_households.sql).
export const createHouseholdSchema = z.object({
  name: z
    .string({ message: 'Give the group a name' })
    .trim()
    .min(1, 'Give the group a name')
    .max(80, 'Name is too long'),
  currency: z.enum(CURRENCIES, { message: 'Select a currency' }),
  periodStartDay: z.coerce
    .number({ message: PERIOD_DAY_MESSAGE })
    .int('Enter a whole number')
    .min(MIN_START_DAY, PERIOD_DAY_MESSAGE)
    .max(MAX_START_DAY, PERIOD_DAY_MESSAGE),
  timeZone: z
    .string({ message: 'Select a time zone' })
    .refine(isKnownTimeZone, 'Select a time zone'),
})

// What an Admin can change afterwards: the same fields plus the Contributor
// permission toggles. Bound by HouseholdSettingsForm, re-checked by the service.
export const householdSettingsSchema = createHouseholdSchema.extend({
  permissions: z.object({
    contributorsCanEditOthers: z.boolean(),
    contributorsCanDeleteOthers: z.boolean(),
    contributorsCanManageCategories: z.boolean(),
    contributorsCanInvite: z.boolean(),
  }),
})

export type HouseholdSettingsInput = z.infer<typeof householdSettingsSchema>
export type HouseholdSettingsFormValues = z.input<
  typeof householdSettingsSchema
>

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>
// Pre-coercion shape the form binds to (inputs start as strings).
export type CreateHouseholdFormValues = z.input<typeof createHouseholdSchema>
