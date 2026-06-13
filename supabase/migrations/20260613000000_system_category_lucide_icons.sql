-- Re-point the seeded system category icons from Tabler names (ti-*) to lucide
-- names, so they render with the app's lucide icon registry
-- (src/features/categories/CategoryIcon.tsx). System rows have user_id is null.

update public.categories set icon = 'home'     where is_system and name = 'Housing';
update public.categories set icon = 'utensils' where is_system and name = 'Food';
update public.categories set icon = 'car'      where is_system and name = 'Transport';
update public.categories set icon = 'heart'    where is_system and name = 'Health';
update public.categories set icon = 'tv'       where is_system and name = 'Entertainment';
update public.categories set icon = 'tag'      where is_system and name = 'Uncategorized';
