import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '#/features/categories/use-categories'
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  categorySchema,
} from '#/features/categories/schema'
import {
  CATEGORY_ICON_NAMES,
  CategoryIcon,
} from '#/features/categories/CategoryIcon'
import type {
  CategoryCreateInput,
  CategoryFormValues,
} from '#/features/categories/schema'
import type { Category } from '#/features/categories/types'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '#/components/ui/form'

function defaultValuesFor(category?: Category): CategoryFormValues {
  if (!category) {
    return {
      name: '',
      colorHex: DEFAULT_CATEGORY_COLOR,
      icon: CATEGORY_ICON_NAMES[0],
    }
  }
  return {
    name: category.name,
    colorHex: category.colorHex,
    icon: category.icon ?? CATEGORY_ICON_NAMES[0],
  }
}

function categoryNameExists(
  categories: Category[],
  category: Category | undefined,
  name: string,
): boolean {
  const normalizedName = name.trim().toLowerCase()
  return categories.some(
    (c) => c.id !== category?.id && c.name.toLowerCase() === normalizedName,
  )
}

function submitLabel(isSubmitting: boolean, isEdit: boolean): string {
  if (isSubmitting) return 'Saving…'
  return isEdit ? 'Save changes' : 'Create category'
}

// Create or edit a user category. On create success it hands the new category
// back so callers can re-open quick-add with it pre-selected.
export function CategoryCreateForm({
  category,
  onSuccess,
  onCancel,
}: {
  category?: Category
  onSuccess: (category: Category) => void
  onCancel: () => void
}) {
  const { categories } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const isEdit = !!category

  const form = useForm<CategoryFormValues, unknown, CategoryCreateInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultValuesFor(category),
  })
  const { control, handleSubmit, formState, setError, watch } = form

  async function onSubmit(values: CategoryCreateInput) {
    // Avoid a unique-constraint error and silent duplicates: if the name already
    // exists among available categories, surface it rather than creating a dupe.
    if (categoryNameExists(categories, category, values.name)) {
      setError('name', { message: 'A category with this name already exists' })
      return
    }
    try {
      const saved = category
        ? await updateCategory.mutateAsync({ category, input: values })
        : await createCategory.mutateAsync(values)
      onSuccess(saved)
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error ? err.message : 'Could not save the category',
      })
    }
  }

  const previewColor = watch('colorHex')
  const previewIcon = watch('icon')
  const previewName = watch('name')

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-5"
      >
        <CategoryPreview
          colorHex={previewColor}
          icon={previewIcon ?? null}
          name={previewName}
        />

        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoFocus placeholder="e.g. Groceries" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="colorHex"
          render={({ field }) => <ColorField field={field} />}
        />

        <FormField
          control={control}
          name="icon"
          render={({ field }) => <IconField field={field} />}
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
            {submitLabel(formState.isSubmitting, isEdit)}
          </Button>
        </div>
      </form>
    </Form>
  )
}

function CategoryPreview({
  colorHex,
  icon,
  name,
}: {
  colorHex: string
  icon: string | null
  name: unknown
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-3">
      <span
        className="size-4 shrink-0 rounded-full"
        style={{ backgroundColor: colorHex }}
      />
      <CategoryIcon name={icon} className="size-4" />
      <span className="text-sm">
        {typeof name === 'string' && name ? name : 'New category'}
      </span>
    </div>
  )
}

function selectedColorClass(selected: boolean): string {
  return selected ? 'border-foreground scale-110' : 'border-transparent'
}

function selectedIconClass(selected: boolean): string {
  return selected
    ? 'border-foreground bg-accent'
    : 'border-input hover:bg-accent/50'
}

function ColorField({
  field,
}: {
  field: {
    value: unknown
    onChange: (value: string) => void
  }
}) {
  return (
    <FormItem>
      <FormLabel>Color</FormLabel>
      <FormControl>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => field.onChange(color)}
              className={cn(
                'size-7 rounded-full border-2 transition-transform',
                selectedColorClass(field.value === color),
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}

function IconField({
  field,
}: {
  field: {
    value: unknown
    onChange: (value: string) => void
  }
}) {
  return (
    <FormItem>
      <FormLabel>Icon</FormLabel>
      <FormControl>
        <div className="grid grid-cols-8 gap-2">
          {CATEGORY_ICON_NAMES.map((iconName) => (
            <button
              key={iconName}
              type="button"
              aria-label={iconName}
              onClick={() => field.onChange(iconName)}
              className={cn(
                'flex items-center justify-center rounded-md border p-2 transition-colors',
                selectedIconClass(field.value === iconName),
              )}
            >
              <CategoryIcon name={iconName} className="size-4" />
            </button>
          ))}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  )
}
