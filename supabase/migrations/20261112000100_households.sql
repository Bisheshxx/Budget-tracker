-- Households (shared ledgers) — schema, backfill, authorization.
-- See docs/adr/0012-households-shared-ledgers.md.
--
-- This is the EXPAND half of an expand/contract change. Ledger tables gain
-- `household_id` next to the existing `user_id`, every existing user is moved
-- into a Personal household, and RLS switches from "rows I own" to "rows of a
-- household I am an active member of". The app that still reads and writes by
-- `user_id` keeps working unchanged: a trigger files a row with no
-- `household_id` under its owner's Personal household. A later CONTRACT
-- migration drops `user_id` and the profile-level currency / period columns
-- once every adapter is household-scoped.

-- ---------------------------------------------------------------------------
-- private schema: helpers for RLS and triggers, not reachable through the API
-- ---------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create table public.households (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(btrim(name)) between 1 and 80),
  -- Set for a Personal household (a household of one, created at signup); null
  -- for a group. Unique, so a user has exactly one Personal household.
  personal_owner_id uuid unique references public.user_profiles(id) on delete cascade,
  currency          text not null default 'USD',
  period_start_day  int  not null default 1 check (period_start_day between 1 and 28),
  -- IANA zone name. Null only for households backfilled below (the creator's
  -- zone was never recorded); the client sets it from the browser on next load
  -- and treats null as "device zone" until then. Validated by trigger.
  time_zone         text,
  -- Messenger-style permission toggles, changed by the Admin only.
  contributors_can_edit_others       bool not null default true,
  contributors_can_delete_others     bool not null default false,
  contributors_can_manage_categories bool not null default true,
  contributors_can_invite            bool not null default false,
  created_by        uuid references public.user_profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- household_members — membership is soft-ended (left_at), never deleted, so
-- a former member's entries keep their author.
-- ---------------------------------------------------------------------------
create table public.household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  profile_id   uuid not null references public.user_profiles(id) on delete cascade,
  role         text not null default 'contributor' check (role in ('admin', 'contributor')),
  joined_at    timestamptz not null default now(),
  left_at      timestamptz
);

-- One active membership per person per household (rejoining adds a new row).
create unique index household_members_one_active_membership
  on public.household_members (household_id, profile_id)
  where left_at is null;

-- Exactly one active Admin per household.
create unique index household_members_one_active_admin
  on public.household_members (household_id)
  where role = 'admin' and left_at is null;

create index idx_household_members_profile_active
  on public.household_members (profile_id)
  where left_at is null;

-- ---------------------------------------------------------------------------
-- household_invites — single-use link, 7-day expiry, only the hash is stored
-- ---------------------------------------------------------------------------
create table public.household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token_hash   text not null unique,
  created_by   uuid references public.user_profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '7 days'),
  used_at      timestamptz,
  used_by      uuid references public.user_profiles(id) on delete set null,
  revoked_at   timestamptz
);

create index idx_household_invites_household on public.household_invites (household_id);

-- ---------------------------------------------------------------------------
-- Ledger tables: add household scope, authorship and a row version
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column household_id uuid references public.households(id) on delete cascade,
  -- Author. Null for auto-posted recurring entries (shown as "Recurring") and
  -- for server-side writes. Never cascade-deleted with the profile.
  add column created_by   uuid references public.user_profiles(id) on delete set null,
  add column updated_by   uuid references public.user_profiles(id) on delete set null,
  add column updated_at   timestamptz not null default now(),
  -- Optimistic concurrency: an update names the version it read; a stale one
  -- matches no row. Bumped by trigger on every update.
  add column version      int not null default 1;

alter table public.categories
  add column household_id uuid references public.households(id) on delete cascade;

alter table public.recurring_transactions
  add column household_id uuid references public.households(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Backfill: one Personal household per existing user, then file their rows
-- ---------------------------------------------------------------------------
insert into public.households
  (name, personal_owner_id, currency, period_start_day, created_by, created_at)
select 'Personal', p.id, p.currency, p.budget_period_start_day, p.id, p.created_at
from public.user_profiles p;

insert into public.household_members (household_id, profile_id, role, joined_at)
select h.id, h.personal_owner_id, 'admin', h.created_at
from public.households h
where h.personal_owner_id is not null;

update public.transactions t
set household_id = h.id,
    created_by   = case when t.recurring_transaction_id is null then t.user_id end,
    updated_by   = case when t.recurring_transaction_id is null then t.user_id end,
    updated_at   = t.created_at
from public.households h
where h.personal_owner_id = t.user_id;

update public.categories c
set household_id = h.id
from public.households h
where h.personal_owner_id = c.user_id;

update public.recurring_transactions rt
set household_id = h.id
from public.households h
where h.personal_owner_id = rt.user_id;

alter table public.transactions           alter column household_id set not null;
alter table public.recurring_transactions alter column household_id set not null;
-- categories.household_id stays nullable: system categories belong to nobody.

create index idx_transactions_household_date
  on public.transactions (household_id, transaction_date desc);
create index idx_recurring_transactions_household_active
  on public.recurring_transactions (household_id, active);
create unique index categories_household_name_key
  on public.categories (household_id, name);

-- ---------------------------------------------------------------------------
-- Identity + membership helpers (security definer: they read membership tables
-- regardless of the caller's own RLS, and only ever answer about the caller)
-- ---------------------------------------------------------------------------
create function private.current_profile_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.id from public.user_profiles p where p.auth_user_id = (select auth.uid())
$$;

create function private.current_household_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.household_id
  from public.household_members m
  where m.profile_id = private.current_profile_id()
    and m.left_at is null
$$;

create function private.is_household_admin(p_household_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = p_household_id
      and m.profile_id = private.current_profile_id()
      and m.left_at is null
      and m.role = 'admin'
  )
$$;

-- True when the caller is an active member AND (is the Admin OR the named
-- permission toggle is on). Unknown permission names are denied.
create function private.household_allows(p_household_id uuid, p_permission text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    join public.households h on h.id = m.household_id
    where m.household_id = p_household_id
      and m.profile_id = private.current_profile_id()
      and m.left_at is null
      and (
        m.role = 'admin'
        or case p_permission
             when 'edit_others'       then h.contributors_can_edit_others
             when 'delete_others'     then h.contributors_can_delete_others
             when 'manage_categories' then h.contributors_can_manage_categories
             when 'invite'            then h.contributors_can_invite
             else false
           end
      )
  )
$$;

create function private.hash_invite_token(p_token text)
returns text
language sql immutable set search_path = ''
as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Expand-phase bridge: a row written by `user_id` alone lands in that user's
-- Personal household. RLS still runs afterwards, so naming someone else's
-- user_id resolves to a household the caller is not in and is rejected.
create function private.fill_household_id()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.household_id is null and new.user_id is not null then
    select h.id into new.household_id
    from public.households h
    where h.personal_owner_id = new.user_id;
  end if;
  return new;
end;
$$;

-- A row never moves between households.
create function private.forbid_household_change()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.household_id is distinct from old.household_id then
    raise exception 'A row cannot be moved to another household'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Authorship and version are decided here, never taken from the client.
create function private.stamp_transaction()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := case
      when new.recurring_transaction_id is null then private.current_profile_id()
    end;
    new.updated_by := new.created_by;
    new.updated_at := now();
    new.version := 1;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := private.current_profile_id();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

-- An auto-posted entry belongs wherever its template lives, whoever (or
-- whichever job) posts it; anything else falls back to the bridge above.
create function private.fill_transaction_household_id()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.household_id is null and new.recurring_transaction_id is not null then
    select rt.household_id into new.household_id
    from public.recurring_transactions rt
    where rt.id = new.recurring_transaction_id;
  end if;
  if new.household_id is null and new.user_id is not null then
    select h.id into new.household_id
    from public.households h
    where h.personal_owner_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger transactions_fill_household
  before insert on public.transactions
  for each row execute function private.fill_transaction_household_id();
create trigger transactions_keep_household
  before update on public.transactions
  for each row execute function private.forbid_household_change();
-- Named to sort after the two above (triggers fire in name order).
create trigger transactions_stamp
  before insert or update on public.transactions
  for each row execute function private.stamp_transaction();

create trigger categories_fill_household
  before insert on public.categories
  for each row execute function private.fill_household_id();
create trigger categories_keep_household
  before update on public.categories
  for each row execute function private.forbid_household_change();

create trigger recurring_transactions_fill_household
  before insert on public.recurring_transactions
  for each row execute function private.fill_household_id();
create trigger recurring_transactions_keep_household
  before update on public.recurring_transactions
  for each row execute function private.forbid_household_change();

-- Household rows: validate the zone, freeze identity columns.
create function private.guard_household()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.time_zone is not null
     and (tg_op = 'INSERT' or new.time_zone is distinct from old.time_zone)
     and not exists (
       select 1 from pg_catalog.pg_timezone_names z where z.name = new.time_zone
     )
  then
    raise exception 'Unknown time zone "%"', new.time_zone
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.time_zone is null and old.time_zone is not null then
      raise exception 'A household time zone cannot be cleared'
        using errcode = '23514';
    end if;
    new.personal_owner_id := old.personal_owner_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger households_guard
  before insert or update on public.households
  for each row execute function private.guard_household();

-- Expand-phase bridge: Onboarding/Settings still write currency and Period
-- start day to the profile; mirror them onto the Personal household so the two
-- cannot drift before the frontend moves to household settings.
create function private.mirror_profile_to_personal_household()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.households h
  set currency = new.currency,
      period_start_day = new.budget_period_start_day
  where h.personal_owner_id = new.id;
  return new;
end;
$$;

create trigger user_profiles_mirror_to_household
  after update of currency, budget_period_start_day on public.user_profiles
  for each row execute function private.mirror_profile_to_personal_household();

-- Signup: profile + Personal household + its Admin membership.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_household_id uuid;
begin
  insert into public.user_profiles (auth_user_id, email, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'avatar_url')
  returning id into v_profile_id;

  insert into public.households (name, personal_owner_id, created_by)
  values ('Personal', v_profile_id, v_profile_id)
  returning id into v_household_id;

  insert into public.household_members (household_id, profile_id, role)
  values (v_household_id, v_profile_id, 'admin');

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

-- households: members read; the Admin edits settings and may delete a group.
-- Creation goes through create_household() so the Admin row is always made.
create policy "members can read their households"
  on public.households for select to authenticated
  using (id in (select private.current_household_ids()));

create policy "admin can update the household"
  on public.households for update to authenticated
  using (private.is_household_admin(id))
  with check (private.is_household_admin(id));

create policy "admin can delete a group household"
  on public.households for delete to authenticated
  using (personal_owner_id is null and private.is_household_admin(id));

-- household_members / household_invites: read-only through the API; every
-- change goes through the functions below.
create policy "members can read the member list"
  on public.household_members for select to authenticated
  using (household_id in (select private.current_household_ids()));

create policy "admin and inviter can read invites"
  on public.household_invites for select to authenticated
  using (
    private.is_household_admin(household_id)
    or (
      created_by = (select private.current_profile_id())
      and household_id in (select private.current_household_ids())
    )
  );

-- transactions
drop policy "users can manage own transactions" on public.transactions;

create policy "members can read household transactions"
  on public.transactions for select to authenticated
  using (household_id in (select private.current_household_ids()));

create policy "members can add household transactions"
  on public.transactions for insert to authenticated
  with check (household_id in (select private.current_household_ids()));

create policy "members can edit permitted transactions"
  on public.transactions for update to authenticated
  using (
    household_id in (select private.current_household_ids())
    and (
      created_by = (select private.current_profile_id())
      or private.household_allows(household_id, 'edit_others')
    )
  )
  with check (household_id in (select private.current_household_ids()));

create policy "members can delete permitted transactions"
  on public.transactions for delete to authenticated
  using (
    household_id in (select private.current_household_ids())
    and (
      created_by = (select private.current_profile_id())
      or private.household_allows(household_id, 'delete_others')
    )
  );

-- categories: system rows are global and read-only; custom rows belong to a
-- household and follow the manage-categories toggle.
drop policy "users can read system and own categories" on public.categories;
drop policy "users can insert own categories" on public.categories;
drop policy "users can update own categories" on public.categories;
drop policy "users can delete own non-system categories" on public.categories;

create policy "members can read system and household categories"
  on public.categories for select to authenticated
  using (
    (household_id is null and user_id is null)
    or household_id in (select private.current_household_ids())
  );

create policy "permitted members can add categories"
  on public.categories for insert to authenticated
  with check (
    is_system = false
    and private.household_allows(household_id, 'manage_categories')
  );

create policy "permitted members can edit categories"
  on public.categories for update to authenticated
  using (
    is_system = false
    and private.household_allows(household_id, 'manage_categories')
  )
  with check (
    is_system = false
    and private.household_allows(household_id, 'manage_categories')
  );

create policy "permitted members can delete categories"
  on public.categories for delete to authenticated
  using (
    is_system = false
    and private.household_allows(household_id, 'manage_categories')
  );

-- recurring templates and their resolved occurrences
drop policy "users can manage own recurring transactions" on public.recurring_transactions;
create policy "members can manage household recurring transactions"
  on public.recurring_transactions for all to authenticated
  using (household_id in (select private.current_household_ids()))
  with check (household_id in (select private.current_household_ids()));

drop policy "users can manage own recurring transaction occurrences"
  on public.recurring_transaction_occurrences;
create policy "members can manage household recurring occurrences"
  on public.recurring_transaction_occurrences for all to authenticated
  using (recurring_transaction_id in (
    select rt.id
    from public.recurring_transactions rt
    where rt.household_id in (select private.current_household_ids())
  ))
  with check (recurring_transaction_id in (
    select rt.id
    from public.recurring_transactions rt
    where rt.household_id in (select private.current_household_ids())
  ));

-- ---------------------------------------------------------------------------
-- API functions (called with supabase.rpc). All derive the actor from the
-- token; none accepts a caller-supplied user id.
-- SQLSTATEs are chosen for src/data/supabase-error.ts: 42501 -> forbidden,
-- 23505 -> conflict, 23514 -> invalid.
-- ---------------------------------------------------------------------------

create function private.require_profile()
returns uuid
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_me uuid := private.current_profile_id();
begin
  if v_me is null then
    raise exception 'You need to be signed in' using errcode = '42501';
  end if;
  return v_me;
end;
$$;

-- Create a group; the caller becomes its Admin.
create function public.create_household(
  p_name text,
  p_currency text,
  p_period_start_day int,
  p_time_zone text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := private.require_profile();
  v_household_id uuid;
begin
  if p_time_zone is null then
    raise exception 'A household needs a time zone' using errcode = '23514';
  end if;

  insert into public.households (name, currency, period_start_day, time_zone, created_by)
  values (btrim(p_name), p_currency, p_period_start_day, p_time_zone, v_me)
  returning id into v_household_id;

  insert into public.household_members (household_id, profile_id, role)
  values (v_household_id, v_me, 'admin');

  return v_household_id;
end;
$$;

-- Names and avatars of everyone who is or was in the household, so entries can
-- show their author. Profiles stay private otherwise (no email, no settings).
create function public.household_people(p_household_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  role text,
  joined_at timestamptz,
  left_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_household_id not in (select private.current_household_ids()) then
    raise exception 'You are not a member of this household' using errcode = '42501';
  end if;

  return query
  select distinct on (m.profile_id)
    m.profile_id, p.display_name, p.avatar_url, m.role, m.joined_at, m.left_at
  from public.household_members m
  join public.user_profiles p on p.id = m.profile_id
  where m.household_id = p_household_id
  -- Latest membership per person: an active row wins over an ended one.
  order by m.profile_id, (m.left_at is null) desc, m.joined_at desc;
end;
$$;

-- Returns the raw token exactly once; only its hash is stored.
create function public.create_household_invite(p_household_id uuid)
returns table (invite_id uuid, token text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := private.require_profile();
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if not private.household_allows(p_household_id, 'invite') then
    raise exception 'You are not allowed to invite people to this household'
      using errcode = '42501';
  end if;
  if exists (
    select 1 from public.households h
    where h.id = p_household_id and h.personal_owner_id is not null
  ) then
    raise exception 'A personal household cannot have other members'
      using errcode = '23514';
  end if;

  return query
  insert into public.household_invites as i (household_id, token_hash, created_by)
  values (p_household_id, private.hash_invite_token(v_token), v_me)
  returning i.id, v_token, i.expires_at;
end;
$$;

create function public.revoke_household_invite(p_invite_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := private.require_profile();
begin
  update public.household_invites i
  set revoked_at = now()
  where i.id = p_invite_id
    and i.used_at is null
    and i.revoked_at is null
    and (
      private.is_household_admin(i.household_id)
      or (
        i.created_by = v_me
        and i.household_id in (select private.current_household_ids())
      )
    );
  if not found then
    raise exception 'Invite not found, already used, or not yours to revoke'
      using errcode = '42501';
  end if;
end;
$$;

-- What the accept screen shows before the user commits.
create function public.preview_household_invite(p_token text)
returns table (household_id uuid, household_name text, invited_by text, expires_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_profile();

  return query
  select h.id, h.name, p.display_name, i.expires_at
  from public.household_invites i
  join public.households h on h.id = i.household_id
  left join public.user_profiles p on p.id = i.created_by
  where i.token_hash = private.hash_invite_token(p_token)
    and i.used_at is null
    and i.revoked_at is null
    and i.expires_at > now();
  if not found then
    raise exception 'This invite is invalid or has expired' using errcode = '23514';
  end if;
end;
$$;

-- Join as a Contributor. Never touches the caller's existing data.
create function public.accept_household_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := private.require_profile();
  v_invite public.household_invites;
begin
  select * into v_invite
  from public.household_invites i
  where i.token_hash = private.hash_invite_token(p_token)
  for update;

  if not found
     or v_invite.used_at is not null
     or v_invite.revoked_at is not null
     or v_invite.expires_at <= now()
  then
    raise exception 'This invite is invalid or has expired' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.household_members m
    where m.household_id = v_invite.household_id
      and m.profile_id = v_me
      and m.left_at is null
  ) then
    raise exception 'You are already a member of this household'
      using errcode = '23505';
  end if;

  insert into public.household_members (household_id, profile_id, role)
  values (v_invite.household_id, v_me, 'contributor');

  update public.household_invites
  set used_at = now(), used_by = v_me
  where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

-- Admin removes someone else. Their entries stay.
create function public.remove_household_member(p_household_id uuid, p_profile_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := private.require_profile();
begin
  if not private.is_household_admin(p_household_id) then
    raise exception 'Only the admin can remove members' using errcode = '42501';
  end if;
  if p_profile_id = v_me then
    raise exception 'Use leave_household to leave' using errcode = '23514';
  end if;

  update public.household_members m
  set left_at = now()
  where m.household_id = p_household_id
    and m.profile_id = p_profile_id
    and m.left_at is null;
  if not found then
    raise exception 'That person is not a member of this household'
      using errcode = '23514';
  end if;
end;
$$;

create function public.transfer_household_admin(p_household_id uuid, p_profile_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := private.require_profile();
begin
  -- Serialize role changes for this household.
  perform 1 from public.households h where h.id = p_household_id for update;

  if not private.is_household_admin(p_household_id) then
    raise exception 'Only the admin can transfer the admin role' using errcode = '42501';
  end if;
  if p_profile_id = v_me then
    return;
  end if;
  if not exists (
    select 1 from public.household_members m
    where m.household_id = p_household_id
      and m.profile_id = p_profile_id
      and m.left_at is null
  ) then
    raise exception 'That person is not a member of this household'
      using errcode = '23514';
  end if;

  -- Demote first so the one-active-admin index is never violated.
  update public.household_members m
  set role = 'contributor'
  where m.household_id = p_household_id and m.profile_id = v_me and m.left_at is null;

  update public.household_members m
  set role = 'admin'
  where m.household_id = p_household_id and m.profile_id = p_profile_id and m.left_at is null;
end;
$$;

-- Leave a group. A departing Admin hands the role to the longest-standing
-- remaining member; the last member out deletes the household, and must say so.
create function public.leave_household(
  p_household_id uuid,
  p_delete_if_last boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := private.require_profile();
  v_personal_owner uuid;
  v_my_role text;
  v_successor uuid;
begin
  select h.personal_owner_id into v_personal_owner
  from public.households h
  where h.id = p_household_id
  for update;

  select m.role into v_my_role
  from public.household_members m
  where m.household_id = p_household_id and m.profile_id = v_me and m.left_at is null;

  if v_my_role is null then
    raise exception 'You are not a member of this household' using errcode = '42501';
  end if;
  if v_personal_owner is not null then
    raise exception 'You cannot leave your personal household' using errcode = '23514';
  end if;

  select m.profile_id into v_successor
  from public.household_members m
  where m.household_id = p_household_id
    and m.profile_id <> v_me
    and m.left_at is null
  order by m.joined_at, m.id
  limit 1;

  if v_successor is null then
    if not p_delete_if_last then
      raise exception 'You are the last member; leaving deletes this household and its entries'
        using errcode = '23514';
    end if;
    delete from public.households h where h.id = p_household_id;
    return;
  end if;

  update public.household_members m
  set left_at = now()
  where m.household_id = p_household_id and m.profile_id = v_me and m.left_at is null;

  if v_my_role = 'admin' then
    update public.household_members m
    set role = 'admin'
    where m.household_id = p_household_id and m.profile_id = v_successor and m.left_at is null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: helpers and API functions are for signed-in users only.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

revoke execute on function
  public.create_household(text, text, int, text),
  public.household_people(uuid),
  public.create_household_invite(uuid),
  public.revoke_household_invite(uuid),
  public.preview_household_invite(text),
  public.accept_household_invite(text),
  public.remove_household_member(uuid, uuid),
  public.transfer_household_admin(uuid, uuid),
  public.leave_household(uuid, boolean)
from public, anon;

grant execute on function
  public.create_household(text, text, int, text),
  public.household_people(uuid),
  public.create_household_invite(uuid),
  public.revoke_household_invite(uuid),
  public.preview_household_invite(text),
  public.accept_household_invite(text),
  public.remove_household_member(uuid, uuid),
  public.transfer_household_admin(uuid, uuid),
  public.leave_household(uuid, boolean)
to authenticated, service_role;
