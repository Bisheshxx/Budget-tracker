import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useAuth } from '#/features/auth/auth-context'
import { useProfile } from '#/features/profile/use-profile'
import { profileService } from '#/features/profile'
import { CURRENCIES, onboardingSchema } from '#/features/profile/schema'
import { DAYS_OF_WEEK } from '#/features/profile/constants/profile.constant'
import { fromCents } from '#/lib/money'
import type {
  OnboardingFormValues,
  OnboardingInput,
} from '#/features/profile/schema'
import type { UserProfile } from '#/features/profile/types'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

// Seed the (string-typed) form inputs from the saved profile. Budget Target is
// hidden/deprecated, but preserved in form state so saving settings does not wipe
// existing stored values.
function toFormValues(profile: UserProfile): OnboardingFormValues {
  return {
    // currency is a free string in the DB row but the form binds the enum; the
    // schema re-validates it on submit, so narrow the seed value here.
    currency: profile.currency as (typeof CURRENCIES)[number],
    budgetPeriodStartDay: String(profile.budgetPeriodStartDay),
    displayName: profile.displayName ?? '',
    groceryDayOfWeek:
      profile.groceryDayOfWeek == null ? '' : String(profile.groceryDayOfWeek),
    monthlyBudgetTarget:
      profile.monthlyBudgetTargetCents > 0
        ? String(fromCents(profile.monthlyBudgetTargetCents))
        : '',
  }
}

// Settings: edit any profile field after Onboarding. Reuses the profile
// service/schema (onboardingSchema is the single source of validation); on save
// it persists via the repository and refreshes the profile query so currency and
// Period boundaries update everywhere they're read.
export function SettingsForm({ profile }: { profile: UserProfile }) {
  const { session } = useAuth()
  const { refresh } = useProfile()
  const [saved, setSaved] = useState(false)

  const form = useForm<OnboardingFormValues, unknown, OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: toFormValues(profile),
  })
  const { control, handleSubmit, formState, setError, reset, getValues } = form

  async function onSubmit(values: OnboardingInput) {
    if (!session) {
      // _authed guarantees a session, so this is defensive — but surface it
      // rather than letting the Save click do nothing.
      setError('root', { message: 'You need to be signed in to save changes' })
      return
    }
    setSaved(false)
    try {
      await profileService.updateProfile(session.user.id, values)
      await refresh()
      // Re-baseline the form to the just-saved values so it reads clean again
      // (isDirty → false): the Save button disables and "Changes saved." shows.
      reset(getValues())
      setSaved(true)
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error ? err.message : 'Could not save your changes',
      })
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
      >
        <FormField
          control={control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="How should we greet you?"
                  {...field}
                  value={field.value as string}
                />
              </FormControl>
              <FormDescription>
                What we&apos;ll call you in the app.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Select {...field}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormDescription>
                The currency every amount is displayed in.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="budgetPeriodStartDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period start day</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  {...field}
                  value={field.value as string}
                />
              </FormControl>
              <FormDescription>
                The day each monthly Period begins (1–28) — changing it shifts
                the current Period boundaries.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="groceryDayOfWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grocery day</FormLabel>
              <FormControl>
                <Select {...field} value={field.value as string}>
                  <option value="">—</option>
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formState.errors.root && (
          <p className="text-sm text-destructive">
            {formState.errors.root.message}
          </p>
        )}
        {saved && !formState.isDirty && (
          <p className="text-sm text-primary">Changes saved.</p>
        )}

        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isDirty}
        >
          {formState.isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </Form>
  )
}
