-- Seed a system "Income" category alongside the existing defaults from
-- 20260611032503_init_schema.sql. Categories aren't type-restricted (any
-- category can be used on an income or expense transaction), so this is just
-- another user_id-null, is_system row for the picker.
insert into public.categories (user_id, name, color_hex, icon, is_system) values
  (null, 'Income', '#2BB3A3', 'banknote', true);
