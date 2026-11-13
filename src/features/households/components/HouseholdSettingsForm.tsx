import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { householdSettingsSchema } from '#/features/households/schemas/household.schema'
import type {
  HouseholdSettingsFormValues,
  HouseholdSettingsInput,
} from '#/features/households/schemas/household.schema'
import { useUpdateHouseholdSettings } from '#/features/households/hooks/use-update-household-settings'
import {
  listTimeZones,
  timeZoneLabel,
} from '#/features/households/utils/time-zone.util'
import { CURRENCIES } from '#/shared/constants/currency.constant'
import { deviceTimeZone } from '#/shared/lib/period'
import { getErrorMessage } from '#/lib/errors'
import type { Household } from '#/shared/types/household.type'
import { EnumSelectField } from '#/shared/components/EnumSelectField'
import { PeriodStartField } from '#/shared/components/PeriodStartField'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Switch } from '#/components/ui/switch'
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

type PermissionName = keyof HouseholdSettingsInput['permissions']

const PERMISSIONS: readonly {
  name: PermissionName
  label: string
  description: string
}[] = [
  {
    name: 'contributorsCanEditOthers',
    label: "Edit other people's entries",
    description: 'Everyone can always edit their own.',
  },
  {
    name: 'contributorsCanDeleteOthers',
    label: "Delete other people's entries",
    description: 'Everyone can always delete their own.',
  },
  {
    name: 'contributorsCanManageCategories',
    label: 'Add and edit categories',
    description: "Applies to this group's custom categories.",
  },
  {
    name: 'contributorsCanInvite',
    label: 'Invite people',
    description: 'Lets contributors create invite links.',
  },
]

function toFormValues(household: Household): HouseholdSettingsFormValues {
  return {
    name: household.name,
    // A free string in the row; the schema re-validates it on submit.
    currency: household.currency as (typeof CURRENCIES)[number],
    periodStartDay: String(household.periodStartDay),
    timeZone: household.timeZone ?? deviceTimeZone(),
    permissions: household.permissions,
  }
}

function PermissionSwitch({
  control,
  name,
  label,
  description,
}: {
  control: Control<HouseholdSettingsFormValues, unknown, HouseholdSettingsInput>
  name: PermissionName
  label: string
  description: string
}) {
  return (
    <FormField
      control={control}
      name={`permissions.${name}`}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

// A group's own settings, edited by its Admin: name, currency, Period start
// day, time zone and what Contributors may do. Independent of the user's
// profile settings, which belong to their Personal household.
export function HouseholdSettingsForm({ household }: { household: Household }) {
  const updateSettings = useUpdateHouseholdSettings(household.id)
  const [saved, setSaved] = useState(false)

  const currentZone = household.timeZone ?? deviceTimeZone()
  const timeZoneOptions = useMemo(
    () =>
      listTimeZones([currentZone]).map((tz) => ({
        value: tz,
        label: timeZoneLabel(tz),
      })),
    [currentZone],
  )

  const form = useForm<
    HouseholdSettingsFormValues,
    unknown,
    HouseholdSettingsInput
  >({
    resolver: zodResolver(householdSettingsSchema),
    defaultValues: toFormValues(household),
  })
  const { control, handleSubmit, formState, setError, reset, getValues } = form

  async function onSubmit(values: HouseholdSettingsInput) {
    setSaved(false)
    try {
      await updateSettings.mutateAsync(values)
      // Re-baseline so the form reads clean again and Save disables.
      reset(getValues())
      setSaved(true)
    } catch (err) {
      setError('root', {
        message: getErrorMessage(err, 'Could not save the group settings'),
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
                <Input autoComplete="off" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <EnumSelectField
          control={control}
          name="currency"
          label="Currency"
          description="Every amount in this group is shown in this currency. Changing it does not convert existing amounts."
          options={CURRENCY_OPTIONS}
          showValidation={false}
        />

        <PeriodStartField
          control={control}
          name="periodStartDay"
          hint="Changing it shifts the current Period boundaries for everyone."
        />

        <EnumSelectField
          control={control}
          name="timeZone"
          label="Time zone"
          description="Decides when a new day, and so a new Period, starts for everyone in the group."
          options={timeZoneOptions}
        />

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-medium">Contributors can</legend>
          {PERMISSIONS.map((permission) => (
            <PermissionSwitch
              key={permission.name}
              control={control}
              {...permission}
            />
          ))}
        </fieldset>

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
          {formState.isSubmitting ? 'Saving…' : 'Save group settings'}
        </Button>
      </form>
    </Form>
  )
}
