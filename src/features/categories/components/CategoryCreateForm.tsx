import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCategories, useCreateCategory } from '#/features/categories/use-categories'
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  createCategorySchema,
} from '#/features/categories/schema'
import { CATEGORY_ICON_NAMES, CategoryIcon } from '#/features/categories/CategoryIcon'
import type {
  CategoryCreateFormValues,
  CategoryCreateInput,
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

// Create-a-category form (lives in its own dialog). On success it hands the new
// category back so the caller can re-open quick-add with it pre-selected.
export function CategoryCreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (category: Category) => void
  onCancel: () => void
}) {
  const { categories } = useCategories()
  const createCategory = useCreateCategory()

  const form = useForm<CategoryCreateFormValues, unknown, CategoryCreateInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      colorHex: DEFAULT_CATEGORY_COLOR,
      icon: CATEGORY_ICON_NAMES[0],
    },
  })
  const { control, handleSubmit, formState, setError, watch } = form

  async function onSubmit(values: CategoryCreateInput) {
    // Avoid a unique-constraint error and silent duplicates: if the name already
    // exists among available categories, surface it rather than creating a dupe.
    const exists = categories.some(
      (c) => c.name.toLowerCase() === values.name.trim().toLowerCase(),
    )
    if (exists) {
      setError('name', { message: 'A category with this name already exists' })
      return
    }
    try {
      const created = await createCategory.mutateAsync(values)
      onSuccess(created)
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error ? err.message : 'Could not create the category',
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
        <div className="flex items-center gap-2 rounded-md border p-3">
          <span
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: previewColor }}
          />
          <CategoryIcon name={previewIcon ?? null} className="size-4" />
          <span className="text-sm">{previewName || 'New category'}</span>
        </div>

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
          render={({ field }) => (
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
                        field.value === color
                          ? 'border-foreground scale-110'
                          : 'border-transparent',
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="icon"
          render={({ field }) => (
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
                        field.value === iconName
                          ? 'border-foreground bg-accent'
                          : 'border-input hover:bg-accent/50',
                      )}
                    >
                      <CategoryIcon name={iconName} className="size-4" />
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
            {formState.isSubmitting ? 'Creating…' : 'Create category'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
