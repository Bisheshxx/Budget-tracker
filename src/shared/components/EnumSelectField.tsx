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
  showValidation = true,
}: {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  description?: string
  options: readonly { value: string; label: string }[]
  /**
   * Set false for a field that can never actually fail validation (e.g. a
   * required enum with a real default the user can't clear via the UI), so
   * it doesn't reserve an error line it will never use.
   */
  showValidation?: boolean
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-baseline justify-between gap-2">
            <FormLabel>{label}</FormLabel>
            {showValidation && <FormMessage className="mt-0" />}
          </div>
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
        </FormItem>
      )}
    />
  )
}
