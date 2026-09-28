import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import {
  SelectMenu,
  SelectMenuContent,
  SelectMenuItem,
  SelectMenuTrigger,
  SelectMenuValue,
} from '#/components/ui/select-menu'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

// A shadcn/Radix SelectMenu bound to an RHF field, for any plain string-enum
// picker (no icons/colors — see CategoryPicker for that). Radix Select drives
// via `value`/`onValueChange`, not `onChange`, so this can't just spread
// `{...field}` the way a native `<select>` can — hence its own binding here
// rather than at each call site.
export function EnumSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  options,
}: {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  description?: string
  options: readonly { value: string; label: string }[]
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <SelectMenu
              value={field.value ?? ''}
              onValueChange={field.onChange}
            >
              <SelectMenuTrigger>
                <SelectMenuValue placeholder={placeholder} />
              </SelectMenuTrigger>
              <SelectMenuContent>
                {options.map((o) => (
                  <SelectMenuItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectMenuItem>
                ))}
              </SelectMenuContent>
            </SelectMenu>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
