import { z } from 'zod'
import { CATEGORY_ICON_NAMES } from '#/shared/components/CategoryIcon'
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
} from '#/shared/constants/categories.constant'

// Single source of truth for creating a category. Used by the create form (via
// zodResolver) AND by CategoryService as a backstop. Lives in shared because the
// category read/mutate hooks (also shared, see docs/adr/0009) need the input
// types. See CONTEXT.md.

export { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR }

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(40, 'Name is too long'),
  colorHex: z.enum(CATEGORY_COLORS).default(DEFAULT_CATEGORY_COLOR),
  icon: z.enum(CATEGORY_ICON_NAMES as [string, ...string[]]).optional(),
})

export const createCategorySchema = categorySchema
export const updateCategorySchema = categorySchema

export type CategoryCreateInput = z.infer<typeof createCategorySchema>
export type CategoryUpdateInput = z.infer<typeof updateCategorySchema>
// Pre-coercion shape the form binds to.
export type CategoryFormValues = z.input<typeof categorySchema>
