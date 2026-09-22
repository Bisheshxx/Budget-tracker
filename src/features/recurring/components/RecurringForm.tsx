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
import { MoneyAmountField } from '#/shared/components/MoneyAmountField'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Select } from '#/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const NTH_OPTIONS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
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

          <FormField
            control={control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {RECURRING_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k[0].toUpperCase() + k.slice(1)}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value="" disabled>
                    Pick a category
                  </option>
                  {selectableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <FormControl>
                <Select {...field}>
                  {RECURRING_FREQUENCIES.map((f) => (
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
        <FormField
          control={control}
          name="monthlyRuleType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Repeats on</FormLabel>
              <FormControl>
                <Select {...field} value={field.value as string}>
                  {MONTHLY_RULE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === 'day-of-month'
                        ? 'A day of the month'
                        : 'A weekday of the month'}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {isNthWeekday ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="monthlyNth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Occurrence</FormLabel>
                <FormControl>
                  <Select {...field} value={field.value as string}>
                    <option value="" disabled>
                      Pick which one
                    </option>
                    {NTH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
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
            name="monthlyWeekday"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weekday</FormLabel>
                <FormControl>
                  <Select {...field} value={field.value as string}>
                    <option value="" disabled>
                      Pick a weekday
                    </option>
                    {WEEKDAY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
