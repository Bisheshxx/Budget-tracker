import { z } from 'zod'
import { CATEGORY_ICON_NAMES } from './CategoryIcon'

// Single source of truth for creating a category. Used by the create form (via
// zodResolver) AND by CategoryService as a backstop. See CONTEXT.md.

// Curated swatch palette offered when creating a category. These are category
// *data* values persisted to `categories.color_hex` (chosen per category), not UI
// theme tokens — so the no-raw-hex design-token rule (ADR 0005) doesn't apply.
// The first is the DB default (matches the seed's gray for Uncategorized).
/* eslint-disable no-restricted-syntax -- stored category colors, not theme tokens */
export const CATEGORY_COLORS = [
  '#888780',
  '#378ADD',
  '#639922',
  '#BA7517',
  '#D4537E',
  '#7F77DD',
  '#2BB3A3',
  '#E0533D',
  '#C9A227',
  '#5A6ACF',
] as const
/* eslint-enable no-restricted-syntax */

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0]

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(40, 'Name is too long'),
  colorHex: z.enum(CATEGORY_COLORS).default(DEFAULT_CATEGORY_COLOR),
  icon: z.enum(CATEGORY_ICON_NAMES as [string, ...string[]]).optional(),
})

export type CategoryCreateInput = z.infer<typeof createCategorySchema>
// Pre-coercion shape the form binds to.
export type CategoryCreateFormValues = z.input<typeof createCategorySchema>
