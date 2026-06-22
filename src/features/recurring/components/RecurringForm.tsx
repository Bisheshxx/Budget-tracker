import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useCreateRecurring,
  useUpdateRecurring,
} from '#/features/recurring/use-recurring'
import {
  RECURRING_FREQUENCIES,
  WEEKDAY_LABELS,
  recurringSchema,
  recurringToFormValues,
} from '#/features/recurring/schema'
import type {
  RecurringFormValues,
  RecurringInput,
} from '#/features/recurring/schema'
import type { RecurringExpense } from '#/features/recurring/types'
import { useCategories } from '#/features/categories/use-categories'
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

const BLANK: RecurringFormValues = {
  name: '',
  categoryId: '',
  amount: '',
  frequency: 'monthly',
  anchorDay: '1',
}

// Day-of-month options for monthly anchors (1–28, matching the DB CHECK and the
// budget_period_start_day clamp).
const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1)

// Create a Recurring Expense template, or edit one when `recurringExpense` is
// passed. Lives inside the Recurring dialog; on success it persists via the
// create/update mutation (which refreshes the list) then calls `onSuccess` to
// close the dialog.
export function RecurringForm({
  recurringExpense,
  onSuccess,
  onCancel,
}: {
  recurringExpense?: RecurringExpense
  onSuccess: () => void
  onCancel: () => void
}) {
  const { categories } = useCategories()
  const createRecurring = useCreateRecurring()
  const updateRecurring = useUpdateRecurring()
  const isEdit = !!recurringExpense

  // A Recurring Expense always has a real category — exclude the Uncategorized
  // system row from the picker.
  const selectableCategories = categories.filter(
    (c) => !(c.isSystem && c.name === 'Uncategorized'),
  )

  const form = useForm<RecurringFormValues, unknown, RecurringInput>({
    resolver: zodResolver(recurringSchema),
    defaultValues: recurringExpense
      ? recurringToFormValues(recurringExpense)
      : BLANK,
  })
  const { control, handleSubmit, formState, setError, watch, setValue } = form
  const frequency = watch('frequency')

  async function onSubmit(values: RecurringInput) {
    try {
      if (recurringExpense) {
        await updateRecurring.mutateAsync({
          id: recurringExpense.id,
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
            : 'Could not save the recurring expense',
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      // Reset the anchor to a valid default for the new frequency
                      // so a stale day-of-month (e.g. 28) can't fail weekly's 0–6.
                      // '1' is valid for both (Monday / the 1st).
                      setValue('anchorDay', '1')
                    }}
                  >
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

          <FormField
            control={control}
            name="anchorDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {frequency === 'weekly' ? 'Day of week' : 'Day of month'}
                </FormLabel>
                <FormControl>
                  <Select {...field} value={field.value as string}>
                    {frequency === 'weekly'
                      ? WEEKDAY_LABELS.map((label, day) => (
                          <option key={label} value={day}>
                            {label}
                          </option>
                        ))
                      : MONTH_DAYS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                  </Select>
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Add recurring expense'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
