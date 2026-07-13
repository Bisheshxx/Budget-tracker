-- Add email + avatar_url to user_profiles, populated on signup.
-- email mirrors auth.users.email; avatar_url comes from the OAuth provider's
-- metadata (e.g. Google puts it in raw_user_meta_data->>'avatar_url').
-- Both are nullable: email can be absent for non-email providers, and only
-- OAuth signups carry an avatar.

alter table public.user_profiles
  add column email      text,
  add column avatar_url text;

-- Extend the signup trigger to copy email + avatar over from the new auth row.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (auth_user_id, email, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Backfill existing profiles from their auth.users row.
update public.user_profiles p
set
  email      = u.email,
  avatar_url = u.raw_user_meta_data->>'avatar_url'
from auth.users u
where u.id = p.auth_user_id;
