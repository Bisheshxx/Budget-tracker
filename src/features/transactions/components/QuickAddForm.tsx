import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useCreateTransaction,
  useUpdateTransaction,
} from '#/features/transactions/use-transactions'
import {
  TRANSACTION_TYPES,
  quickAddSchema,
  today,
  transactionToFormValues,
} from '#/features/transactions/schema'
import type {
  QuickAddFormValues,
  QuickAddInput,
} from '#/features/transactions/schema'
import type { Transaction } from '#/features/transactions/types'
import { CategoryPicker } from '#/features/categories/components/CategoryPicker'
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

const BLANK: QuickAddFormValues = {
  amount: '',
  type: 'expense',
  categoryId: '',
  transactionDate: today(),
  note: '',
}

// The transaction form: logs a new income/expense, or edits an existing one when
// `transaction` is passed (edit mode also exposes a Delete button). Owns its own
// form state; on success it persists via the create/update mutation (which
// refreshes the recent list and Cashflow totals), then calls `onSuccess` (the
// parent uses this to close the dialog). `defaultValues` restores a draft after
// the create-category dialog swap; `onCreateCategory` hands the current values up
// so the parent can preserve them.
export function QuickAddForm({
  transaction,
  defaultValues,
  onSuccess,
  onCreateCategory,
}: {
  transaction?: Transaction
  defaultValues?: QuickAddFormValues
  onSuccess?: () => void
  onCreateCategory?: (current: QuickAddFormValues) => void
}) {
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const isEdit = !!transaction

  const form = useForm<QuickAddFormValues, unknown, QuickAddInput>({
    resolver: zodResolver(quickAddSchema),
    // A preserved draft (category-create swap) wins; otherwise seed from the
    // transaction being edited, falling back to a blank add form.
    defaultValues:
      defaultValues ??
      (transaction ? transactionToFormValues(transaction) : BLANK),
  })
  const { control, handleSubmit, formState, setError, reset, getValues } = form

  async function onSubmit(values: QuickAddInput) {
    try {
      if (transaction) {
        await updateTransaction.mutateAsync({
          id: transaction.id,
          input: values,
        })
      } else {
        await createTransaction.mutateAsync(values)
        reset(BLANK)
      }
      onSuccess?.()
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error
            ? err.message
            : 'Could not save your transaction',
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
          <MoneyAmountField control={control} name="amount" label="Amount" />

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
          {formState.isSubmitting
            ? 'Saving…'
            : isEdit
              ? 'Save changes'
              : 'Add transaction'}
        </Button>
      </form>
    </Form>
  )
}
