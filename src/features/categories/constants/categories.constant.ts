export const CATEGORY_PAGE_SIZE = 20

// Curated swatch palette offered when creating a category. These are category
// data values persisted to `categories.color_hex` (chosen per category), not UI
// theme tokens, so the no-raw-hex design-token rule does not apply.
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

