import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createHouseholdSchema } from '#/features/households/schemas/household.schema'
import type {
  CreateHouseholdFormValues,
  CreateHouseholdInput,
} from '#/features/households/schemas/household.schema'
import { useCreateHousehold } from '#/features/households/hooks/use-create-household'
import {
  listTimeZones,
  timeZoneLabel,
} from '#/features/households/utils/time-zone.util'
import { CURRENCIES } from '#/shared/constants/currency.constant'
import { deviceTimeZone } from '#/shared/lib/period'
import { useProfile } from '#/shared/hooks/use-profile'
import { EnumSelectField } from '#/shared/components/EnumSelectField'
import { PeriodStartField } from '#/shared/components/PeriodStartField'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
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

function isCurrency(
  value: string | undefined,
): value is (typeof CURRENCIES)[number] {
  return (CURRENCIES as readonly string[]).includes(value ?? '')
}

// Create a group (a shared Household). The creator becomes its Admin. A group's
// currency, Period start and time zone are its own settings — they start from
// the user's current ones but are independent afterwards (docs/adr/0012).
export function CreateHouseholdForm({ onCreated }: { onCreated: () => void }) {
  const { profile } = useProfile()
  const createHousehold = useCreateHousehold()

  const zone = deviceTimeZone()
  const timeZoneOptions = useMemo(
    () =>
      listTimeZones([zone]).map((tz) => ({
        value: tz,
        label: timeZoneLabel(tz),
      })),
    [zone],
  )

  const form = useForm<
    CreateHouseholdFormValues,
    unknown,
    CreateHouseholdInput
  >({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: {
      name: '',
      currency: isCurrency(profile?.currency) ? profile.currency : 'USD',
      periodStartDay: String(profile?.budgetPeriodStartDay ?? 1),
      timeZone: zone,
    },
  })
  const { control, handleSubmit, formState, setError } = form

  async function onSubmit(values: CreateHouseholdInput) {
    try {
      await createHousehold.mutateAsync(values)
      onCreated()
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error ? err.message : 'Could not create the group',
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-baseline justify-between gap-2">
                <FormLabel>Group name</FormLabel>
                <FormMessage className="mt-0" />
              </div>
              <FormControl>
                <Input
                  autoComplete="off"
                  placeholder="e.g. Flat, Family"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                You&apos;ll be the admin and can invite others afterwards.
              </FormDescription>
            </FormItem>
          )}
        />

        <EnumSelectField
          control={control}
          name="currency"
          label="Currency"
          description="Every amount in this group is shown in this currency."
          options={CURRENCY_OPTIONS}
          showValidation={false}
        />

        <PeriodStartField control={control} name="periodStartDay" />

        <EnumSelectField
          control={control}
          name="timeZone"
          label="Time zone"
          description="Decides when a new day, and so a new Period, starts for everyone in the group."
          options={timeZoneOptions}
        />

        {formState.errors.root && (
          <p className="text-sm text-destructive">
            {formState.errors.root.message}
          </p>
        )}

        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Creating…' : 'Create group'}
        </Button>
      </form>
    </Form>
  )
}
