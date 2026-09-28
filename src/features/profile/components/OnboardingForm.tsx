import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '#/features/auth/contexts/auth-context'
import { useProfile } from '#/shared/hooks/use-profile'
import { profileService } from '#/features/profile'
import {
  CURRENCIES,
  onboardingSchema,
  resolveDisplayName,
} from '#/features/profile/schema'
import { DAYS_OF_WEEK } from '#/features/profile/constants/profile.constant'
import type {
  OnboardingFormValues,
  OnboardingInput,
} from '#/features/profile/schema'
import { EnumSelectField } from '#/shared/components/EnumSelectField'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  SelectMenu,
  SelectMenuContent,
  SelectMenuItem,
  SelectMenuTrigger,
  SelectMenuValue,
} from '#/components/ui/select-menu'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }))

// Radix Select disallows an empty-string item value (mirrors CategoryPicker's
// Uncategorized sentinel), so "no preference" gets a sentinel that maps back
// to '' on change.
const GROCERY_DAY_NONE = '__none__'

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
        <EnumSelectField
          control={control}
          name="currency"
          label="Currency"
          options={CURRENCY_OPTIONS}
          showValidation={false}
        />

        <FormField
          control={control}
          name="budgetPeriodStartDay"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-baseline justify-between gap-2">
                <FormLabel>Period start day</FormLabel>
                <FormMessage className="mt-0" />
              </div>
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
              <div className="flex items-baseline justify-between gap-2">
                <FormLabel>Display name</FormLabel>
                <FormMessage className="mt-0" />
              </div>
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
                <SelectMenu
                  value={
                    field.value === '' ? GROCERY_DAY_NONE : (field.value as string)
                  }
                  onValueChange={(v) =>
                    field.onChange(v === GROCERY_DAY_NONE ? '' : v)
                  }
                >
                  <SelectMenuTrigger>
                    <SelectMenuValue />
                  </SelectMenuTrigger>
                  <SelectMenuContent>
                    <SelectMenuItem value={GROCERY_DAY_NONE}>—</SelectMenuItem>
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <SelectMenuItem key={day} value={String(idx)}>
                        {day}
                      </SelectMenuItem>
                    ))}
                  </SelectMenuContent>
                </SelectMenu>
              </FormControl>
            </FormItem>
          )}
        />

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
