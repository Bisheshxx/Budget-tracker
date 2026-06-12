// Domain types owned by the categories feature — the vocabulary the service,
// hooks, components, and the repository port all speak. The persistence port
// that traffics in these lives in #/data/categories/ICategoryRepository.
// See docs/adr/0004.

export interface Category {
  id: string
  /** Null = a system/preset category visible to everyone; otherwise the owner's profile id. */
  userId: string | null
  name: string
  colorHex: string
  /** A lucide icon name (e.g. 'home'), or null. */
  icon: string | null
  isSystem: boolean
  isDefault: boolean
}

// The fields a create writes. System categories are seeded, never created here.
export interface CategoryCreate {
  userId: string
  name: string
  colorHex: string
  icon: string | null
}
