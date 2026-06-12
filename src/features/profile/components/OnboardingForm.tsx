import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '#/features/auth/auth-context'
import { useProfile } from '#/features/profile/use-profile'
import { profileService } from '#/features/profile'
import {
  CURRENCIES,
  PAYDAY_FREQUENCIES,
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
// via the supplied callback. Rendered only once the gate has allowed it.
export function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const { session } = useAuth()
  const { refresh } = useProfile()

  const form = useForm<OnboardingFormValues, unknown, OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      currency: 'USD',
      budgetPeriodStartDay: '1',
      displayName: '',
      paydayDayOfMonth: '',
      paydayFrequency: '',
      groceryDayOfWeek: '',
      monthlyBudgetTarget: '',
    },
  })
  const { control, handleSubmit, formState, setError } = form

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
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="paydayDayOfMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payday (day of month)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    {...field}
                    value={field.value as string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="paydayFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payday frequency</FormLabel>
                <FormControl>
                  <Select {...field} value={field.value as string}>
                    <option value="">—</option>
                    {PAYDAY_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f[0].toUpperCase() + f.slice(1)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
