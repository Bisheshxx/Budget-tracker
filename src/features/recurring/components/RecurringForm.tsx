import { useForm } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useCreateRecurring,
  useUpdateRecurring,
} from '#/features/recurring/use-recurring'
import {
  MONTHLY_RULE_TYPES,
  RECURRING_FREQUENCIES,
  RECURRING_KINDS,
  recurringSchema,
  recurringToFormValues,
} from '#/features/recurring/schema'
import type {
  RecurringFormValues,
  RecurringInput,
} from '#/features/recurring/schema'
import type { RecurringTransaction } from '#/features/recurring/types'
import { useCategories } from '#/shared/hooks/use-categories'
import { CategoryIcon } from '#/shared/components/CategoryIcon'
import { MoneyAmountField } from '#/shared/components/MoneyAmountField'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1)
}

const KIND_OPTIONS = RECURRING_KINDS.map((k) => ({
  value: k,
  label: capitalize(k),
}))

const FREQUENCY_OPTIONS = RECURRING_FREQUENCIES.map((f) => ({
  value: f,
  label: capitalize(f),
}))

const MONTHLY_RULE_OPTIONS = MONTHLY_RULE_TYPES.map((t) => ({
  value: t,
  label: t === 'day-of-month' ? 'A day of the month' : 'A weekday of the month',
}))

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const NTH_OPTIONS = [
  { value: '1', label: '1st' },
  { value: '2', label: '2nd' },
  { value: '3', label: '3rd' },
  { value: '4', label: '4th' },
  { value: '-1', label: 'Last' },
]

const BLANK: RecurringFormValues = {
  name: '',
  categoryId: '',
  amount: '',
  kind: 'expense',
  frequency: 'monthly',
  monthlyRuleType: 'day-of-month',
  firstDueDate: '',
  monthlyWeekday: '',
  monthlyNth: '',
}

// Create a Recurring Transaction template, or edit one when `recurringTransaction`
// is passed. Lives inside the Recurring dialog; on success it persists via the
// create/update mutation (which refreshes the list) then calls `onSuccess` to
// close the dialog.
export function RecurringForm({
  recurringTransaction,
  onSuccess,
  onCancel,
}: {
  recurringTransaction?: RecurringTransaction
  onSuccess: () => void
  onCancel: () => void
}) {
  const { categories } = useCategories()
  const createRecurring = useCreateRecurring()
  const updateRecurring = useUpdateRecurring()
  const isEdit = !!recurringTransaction

  // A Recurring Transaction always has a real category — exclude the
  // Uncategorized system row from the picker.
  const selectableCategories = categories.filter(
    (c) => !(c.isSystem && c.name === 'Uncategorized'),
  )

  const form = useForm<RecurringFormValues, unknown, RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: recurringTransaction
      ? recurringToFormValues(recurringTransaction)
      : BLANK,
  })
  const { control, handleSubmit, formState, setError, watch } = form
  const frequency = watch('frequency')
  const monthlyRuleType = watch('monthlyRuleType')
  const isMonthly = frequency === 'monthly'
  const isNthWeekday = isMonthly && monthlyRuleType === 'nth-weekday'

  async function onSubmit(values: RecurringInput) {
    try {
      if (recurringTransaction) {
        await updateRecurring.mutateAsync({
          id: recurringTransaction.id,
          input: values,
        })
      } else {
        await createRecurring.mutateAsync(values)
      }
      onSuccess()
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error
            ? err.message
            : 'Could not save the recurring transaction',
      })
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoFocus placeholder="e.g. Rent" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MoneyAmountField
            control={control}
            name="amount"
            label="Default amount"
          />

          <EnumSelectField
            control={control}
            name="kind"
            label="Type"
            options={KIND_OPTIONS}
          />
        </div>

        <FormField
          control={control}
          name="categoryId"
          render={({ field }) => {
            const selected = selectableCategories.find(
              (c) => c.id === field.value,
            )
            return (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <SelectMenu value={field.value} onValueChange={field.onChange}>
                    <SelectMenuTrigger>
                      {selected ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: selected.colorHex }}
                          />
                          <CategoryIcon name={selected.icon} className="size-4" />
                          <span>{selected.name}</span>
                        </span>
                      ) : (
                        <SelectMenuValue placeholder="Pick a category" />
                      )}
                    </SelectMenuTrigger>
                    <SelectMenuContent>
                      {selectableCategories.map((c) => (
                        <SelectMenuItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: c.colorHex }}
                            />
                            <CategoryIcon name={c.icon} className="size-4" />
                            <span>{c.name}</span>
                          </span>
                        </SelectMenuItem>
                      ))}
                    </SelectMenuContent>
                  </SelectMenu>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <EnumSelectField
          control={control}
          name="frequency"
          label="Frequency"
          options={FREQUENCY_OPTIONS}
        />

        <MonthlyRuleFields
          control={control}
          isMonthly={isMonthly}
          isNthWeekday={isNthWeekday}
        />

        {formState.errors.root && (
          <p className="text-sm text-destructive">
            {formState.errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Add recurring transaction'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

// The monthly-schedule fields: hidden entirely for weekly/fortnightly, and
// which fields show (a day-of-month picker vs. an nth-weekday pair) depends
// on monthlyRuleType. Split out of RecurringForm to keep its own branching
// isolated from the rest of the form's fields.
function MonthlyRuleFields({
  control,
  isMonthly,
  isNthWeekday,
}: {
  control: Control<RecurringFormValues, unknown, RecurringInput>
  isMonthly: boolean
  isNthWeekday: boolean
}) {
  return (
    <>
      {isMonthly && (
        <EnumSelectField
          control={control}
          name="monthlyRuleType"
          label="Repeats on"
          options={MONTHLY_RULE_OPTIONS}
        />
      )}

      {isNthWeekday ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EnumSelectField
            control={control}
            name="monthlyNth"
            label="Occurrence"
            placeholder="Pick which one"
            options={NTH_OPTIONS}
          />

          <EnumSelectField
            control={control}
            name="monthlyWeekday"
            label="Weekday"
            placeholder="Pick a weekday"
            options={WEEKDAY_OPTIONS}
          />
        </div>
      ) : (
        <FormField
          control={control}
          name="firstDueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Due Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value as string} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}
