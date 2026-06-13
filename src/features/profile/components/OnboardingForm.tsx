import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '#/features/auth/auth-context'
import { useProfile } from '#/features/profile/use-profile'
import { profileService } from '#/features/profile'
import {
  CURRENCIES,
  onboardingSchema,
  resolveDisplayName,
} from '#/features/profile/schema'
import type {
  OnboardingFormValues,
  OnboardingInput,
} from '#/features/profile/schema'
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

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// The Onboarding form. Owns its own form state; on success it persists the
// profile, refreshes the profile context (flipping isOnboarded), then routes on
/**
 * Renders the onboarding form, persists the user's onboarding settings, refreshes the profile, and invokes the provided callback when setup completes.
 *
 * @param onComplete - Callback invoked after onboarding is successfully saved and the profile has been refreshed
 * @returns The onboarding form React element
 */
export function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const { session } = useAuth()
  const { refresh } = useProfile()

  const form = useForm<OnboardingFormValues, unknown, OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      currency: 'USD',
      budgetPeriodStartDay: '1',
      displayName: '',
      groceryDayOfWeek: '',
      monthlyBudgetTarget: '',
    },
  })
  const { control, handleSubmit, formState, setError } = form

  /**
   * Complete onboarding using the provided form values and finalize setup for the current user.
   *
   * Attempts to persist the onboarding values for the currently authenticated user, refreshes the profile context, and invokes the `onComplete` callback on success. If there is no active session the function returns without side effects. On failure, sets a root form error message using the thrown error's message when available or a generic fallback.
   *
   * @param values - The onboarding form values to persist
   */
  async function onSubmit(values: OnboardingInput) {
    if (!session) return
    try {
      await profileService.completeOnboarding(session.user.id, {
        ...values,
        displayName: resolveDisplayName(values.displayName, session.user.email),
      })
      await refresh()
      onComplete()
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error ? err.message : 'Could not save your setup',
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
                The day each monthly Period begins (1–28) — match it to your pay
                or billing rhythm.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="h-px bg-border" />
        <p className="text-sm font-medium text-muted-foreground">Optional</p>

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
                What we&apos;ll call you in the app — you can change this later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <FormField
            control={control}
            name="monthlyBudgetTarget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget Target</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    value={field.value as string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {formState.errors.root && (
          <p className="text-sm text-destructive">
            {formState.errors.root.message}
          </p>
        )}

        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Saving…' : 'Finish setup'}
        </Button>
      </form>
    </Form>
  )
}
