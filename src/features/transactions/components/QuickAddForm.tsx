import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateTransaction } from '#/features/transactions/use-transactions'
import { TRANSACTION_TYPES, quickAddSchema, today } from '#/features/transactions/schema'
import type {
  QuickAddFormValues,
  QuickAddInput,
} from '#/features/transactions/schema'
import { CategoryPicker } from '#/features/categories/components/CategoryPicker'
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

const BLANK: QuickAddFormValues = {
  amount: '',
  type: 'expense',
  categoryId: '',
  transactionDate: today(),
  note: '',
}

// The one-tap quick-add: log an income/expense. Owns its own form state; on
// success it persists via the create mutation (which refreshes the recent list),
// resets, then calls `onSuccess` (the parent uses this to close the dialog).
// `defaultValues` restores a draft after the create-category dialog swap;
// `onCreateCategory` hands the current values up so the parent can preserve them.
export function QuickAddForm({
  defaultValues,
  onSuccess,
  onCreateCategory,
}: {
  defaultValues?: QuickAddFormValues
  onSuccess?: () => void
  onCreateCategory?: (current: QuickAddFormValues) => void
}) {
  const createTransaction = useCreateTransaction()

  const form = useForm<QuickAddFormValues, unknown, QuickAddInput>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: defaultValues ?? BLANK,
  })
  const { control, handleSubmit, formState, setError, reset, getValues } = form

  async function onSubmit(values: QuickAddInput) {
    try {
      await createTransaction.mutateAsync(values)
      reset(BLANK)
      onSuccess?.()
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error ? err.message : 'Could not save your transaction',
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
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

          <FormField
            control={control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {TRANSACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t[0].toUpperCase() + t.slice(1)}
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
                <CategoryPicker
                  value={(field.value as string | undefined) ?? ''}
                  onChange={field.onChange}
                  onCreateNew={() => onCreateCategory?.(getValues())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="transactionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value as string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Optional"
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
          {formState.isSubmitting ? 'Adding…' : 'Add transaction'}
        </Button>
      </form>
    </Form>
  )
}
