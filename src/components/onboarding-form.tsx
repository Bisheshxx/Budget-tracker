import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth-context'
import { useProfile } from '../lib/profile-query'
import { profileService } from '../services'
import {
  CURRENCIES,
  PAYDAY_FREQUENCIES,
  onboardingSchema,
  resolveDisplayName,
} from '../lib/schemas/profile'
import type {
  OnboardingFormValues,
  OnboardingInput,
} from '../lib/schemas/profile'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'
import { Label } from './ui/label'

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// Labelled field wrapper: keeps the per-field label/hint/error markup in one
// place so the form body stays flat and declarative.
function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  // Accepts react-hook-form's field error (only `message` is read).
  error?: { message?: string }
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  )
}

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
  const { register, handleSubmit, formState, setError } = form
  const { errors, isSubmitting } = formState

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
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      <Field label="Currency" htmlFor="currency" error={errors.currency}>
        <Select id="currency" {...register('currency')}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Period start day"
        htmlFor="budgetPeriodStartDay"
        hint="The day each monthly Period begins (1–28) — match it to your pay or billing rhythm."
        error={errors.budgetPeriodStartDay}
      >
        <Input
          id="budgetPeriodStartDay"
          type="number"
          min={1}
          max={28}
          {...register('budgetPeriodStartDay')}
        />
      </Field>

      <div className="h-px bg-border" />
      <p className="text-sm font-medium text-muted-foreground">Optional</p>

      <Field label="Display name" htmlFor="displayName" error={errors.displayName}>
        <Input
          id="displayName"
          autoComplete="name"
          placeholder="How should we greet you?"
          {...register('displayName')}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Payday (day of month)"
          htmlFor="paydayDayOfMonth"
          error={errors.paydayDayOfMonth}
        >
          <Input
            id="paydayDayOfMonth"
            type="number"
            min={1}
            max={31}
            {...register('paydayDayOfMonth')}
          />
        </Field>

        <Field
          label="Payday frequency"
          htmlFor="paydayFrequency"
          error={errors.paydayFrequency}
        >
          <Select id="paydayFrequency" {...register('paydayFrequency')}>
            <option value="">—</option>
            {PAYDAY_FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {f[0].toUpperCase() + f.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Grocery day"
          htmlFor="groceryDayOfWeek"
          error={errors.groceryDayOfWeek}
        >
          <Select id="groceryDayOfWeek" {...register('groceryDayOfWeek')}>
            <option value="">—</option>
            {DAYS_OF_WEEK.map((day, idx) => (
              <option key={day} value={idx}>
                {day}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Budget Target"
          htmlFor="monthlyBudgetTarget"
          error={errors.monthlyBudgetTarget}
        >
          <Input
            id="monthlyBudgetTarget"
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            {...register('monthlyBudgetTarget')}
          />
        </Field>
      </div>

      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Finish setup'}
      </Button>
    </form>
  )
}
