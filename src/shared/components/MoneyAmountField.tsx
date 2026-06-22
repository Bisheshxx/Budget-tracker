import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { Input } from '#/components/ui/input'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

// Shared money-amount form field: the number input every form uses to capture an
// amount in display units (quick-add, recurring default amount, the profile Budget
// Target). The value binds as a string because the owning zod schemas
// coerce/preprocess the amount (their z.input is unknown), so the controlled input
// always reads a string. Keeps the input markup in one place across features.
export function MoneyAmountField<T extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<T>
  name: FieldPath<T>
  label: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
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
  )
}
