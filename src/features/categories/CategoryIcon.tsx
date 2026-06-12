import {
  Banknote,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  Cat,
  Coffee,
  Dumbbell,
  Gift,
  Heart,
  Home,
  Music,
  PiggyBank,
  Plane,
  ShoppingCart,
  Smartphone,
  Stethoscope,
  Tag,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react'
import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'

// Curated set of lucide icons offered for categories. Only these are imported, so
// we never pull in the full lucide catalog. Icons are stored on a category as the
// string key (e.g. 'home'); ICON_REGISTRY maps the key back to the component.
const ICON_REGISTRY: Record<string, LucideIcon | undefined> = {
  home: Home,
  utensils: Utensils,
  'shopping-cart': ShoppingCart,
  coffee: Coffee,
  car: Car,
  bus: Bus,
  plane: Plane,
  cat: Cat,
  heart: Heart,
  stethoscope: Stethoscope,
  dumbbell: Dumbbell,
  tv: Tv,
  music: Music,
  'book-open': BookOpen,
  gift: Gift,
  briefcase: Briefcase,
  banknote: Banknote,
  'piggy-bank': PiggyBank,
  wallet: Wallet,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  wrench: Wrench,
  tag: Tag,
}

export const CATEGORY_ICON_NAMES = Object.keys(ICON_REGISTRY)

// Renders a category's lucide icon by stored name, falling back to a generic tag.
// `name` is omitted from the lucide props (it collides with the SVG name attribute).
export function CategoryIcon({
  name,
  ...props
}: Omit<ComponentProps<LucideIcon>, 'name'> & { name: string | null }) {
  const Icon = (name && ICON_REGISTRY[name]) || Tag
  return <Icon {...props} />
}
