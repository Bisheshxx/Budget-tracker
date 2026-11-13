-- Household authorization tests (pgTAP). Run with `supabase test db`.
--
-- The rule under test, from docs/adr/0012: a member of household A can never
-- read or write household B, and inside a household the Admin's permission
-- toggles decide what a Contributor may do. Everything runs in one transaction
-- that is rolled back, so it leaves no data behind.
--
-- Actors are switched the way PostgREST does it: the `authenticated` role plus
-- a `request.jwt.claims` setting carrying the auth user id.

begin;

create extension if not exists pgtap with schema extensions;

select plan(67);

-- Three accounts. The signup trigger gives each a profile, a Personal
-- household and its Admin membership.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'cal@example.com');

update public.user_profiles set display_name = initcap(split_part(email, '@', 1))
where email in ('ana@example.com', 'ben@example.com', 'cal@example.com');

-- Ids the later statements need, kept in transaction-local settings so every
-- role can read them.
select set_config('t.ana', (select id::text from public.user_profiles where email = 'ana@example.com'), true);
select set_config('t.ben', (select id::text from public.user_profiles where email = 'ben@example.com'), true);
select set_config('t.cal', (select id::text from public.user_profiles where email = 'cal@example.com'), true);
select set_config('t.ana_home', (select id::text from public.households where personal_owner_id = current_setting('t.ana')::uuid), true);
select set_config('t.ben_home', (select id::text from public.households where personal_owner_id = current_setting('t.ben')::uuid), true);

select is(
  (select count(*) from public.household_members m
   where m.profile_id = current_setting('t.ana')::uuid and m.role = 'admin' and m.left_at is null),
  1::bigint,
  'signup creates a Personal household with the user as Admin'
);

-- ---------------------------------------------------------------------------
-- Personal households stay private
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);

insert into public.transactions (user_id, type, amount_cents, note)
values (current_setting('t.ben')::uuid, 'expense', 500, 'ben private');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

insert into public.transactions (user_id, type, amount_cents, note)
values (current_setting('t.ana')::uuid, 'expense', 1200, 'ana private');

select is(
  (select household_id from public.transactions where note = 'ana private'),
  current_setting('t.ana_home')::uuid,
  'a row written by user_id alone lands in that user''s Personal household'
);
select is(
  (select created_by from public.transactions where note = 'ana private'),
  current_setting('t.ana')::uuid,
  'the author is taken from the token'
);
select is(
  (select count(*) from public.transactions where note = 'ben private'),
  0::bigint,
  'another user''s Personal entries are invisible'
);
select is(
  (select count(*) from public.households),
  1::bigint,
  'a user sees only households they belong to'
);
select throws_ok(
  $$insert into public.transactions (user_id, type, amount_cents)
    values (current_setting('t.ben')::uuid, 'expense', 100)$$,
  '42501', null,
  'cannot add an entry under another user''s id'
);
select throws_ok(
  $$insert into public.transactions (user_id, household_id, type, amount_cents)
    values (current_setting('t.ana')::uuid, current_setting('t.ben_home')::uuid, 'expense', 100)$$,
  '42501', null,
  'cannot add an entry to a household you are not in'
);

update public.transactions set note = 'hacked' where note = 'ben private';
delete from public.transactions where household_id = current_setting('t.ben_home')::uuid;

reset role;
select is(
  (select count(*) from public.transactions where note = 'ben private'),
  1::bigint,
  'another user''s Personal entries cannot be edited or deleted'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);

select throws_ok(
  $$select public.leave_household(current_setting('t.ana_home')::uuid, true)$$,
  '23514', null,
  'a Personal household cannot be left'
);
select throws_ok(
  $$select * from public.create_household_invite(current_setting('t.ana_home')::uuid)$$,
  '23514', null,
  'a Personal household cannot invite'
);
delete from public.households where id = current_setting('t.ana_home')::uuid;
select is(
  (select count(*) from public.households where id = current_setting('t.ana_home')::uuid),
  1::bigint,
  'a Personal household cannot be deleted'
);

-- ---------------------------------------------------------------------------
-- Creating a group and inviting into it
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select public.create_household('Flat', 'NZD', 25, 'Mars/Olympus')$$,
  '23514', null,
  'a household needs a real IANA time zone'
);

select set_config('t.flat', public.create_household('Flat', 'NZD', 25, 'Pacific/Auckland')::text, true);

select is(
  (select role from public.household_members
   where household_id = current_setting('t.flat')::uuid and profile_id = current_setting('t.ana')::uuid),
  'admin',
  'the creator of a group is its Admin'
);

select set_config('t.token_ben', (select token from public.create_household_invite(current_setting('t.flat')::uuid)), true);
select set_config('t.token_cal', (select token from public.create_household_invite(current_setting('t.flat')::uuid)), true);
select set_config('t.token_revoked', (select token from public.create_household_invite(current_setting('t.flat')::uuid)), true);
select set_config('t.token_expired', (select token from public.create_household_invite(current_setting('t.flat')::uuid)), true);

select is(
  (select count(*) from public.household_invites where token_hash = current_setting('t.token_ben')),
  0::bigint,
  'the raw invite token is never stored'
);

insert into public.transactions (user_id, household_id, type, amount_cents, note)
values (current_setting('t.ana')::uuid, current_setting('t.flat')::uuid, 'expense', 9000, 'ana rent');

insert into public.categories (user_id, household_id, name)
values (current_setting('t.ana')::uuid, current_setting('t.flat')::uuid, 'Flat supplies');

insert into public.recurring_transactions
  (user_id, household_id, category_id, name, amount_cents, frequency, first_due_date)
values (
  current_setting('t.ana')::uuid, current_setting('t.flat')::uuid,
  (select id from public.categories where name = 'Housing' and is_system),
  'Power', 8000, 'weekly', '2026-01-05'
);

select lives_ok(
  $$select public.revoke_household_invite(
      (select id from public.household_invites
       where token_hash = encode(sha256(convert_to(current_setting('t.token_revoked'), 'UTF8')), 'hex')))$$,
  'the Admin can revoke an invite'
);

reset role;
update public.household_invites
set expires_at = now() - interval '1 minute'
where token_hash = encode(sha256(convert_to(current_setting('t.token_expired'), 'UTF8')), 'hex');

-- The scheduled job posts recurring entries by user id alone; the entry must
-- still land in the template's household, not the poster's Personal one.
insert into public.transactions (user_id, type, amount_cents, note, transaction_date, recurring_transaction_id)
select rt.user_id, 'expense', rt.amount_cents, 'power auto', '2026-01-05', rt.id
from public.recurring_transactions rt
where rt.name = 'Power';

select is(
  (select array[household_id::text, coalesce(created_by::text, 'none')]
   from public.transactions where note = 'power auto'),
  array[current_setting('t.flat'), 'none'],
  'an auto-posted entry lands in its template''s household and has no author'
);
delete from public.transactions where note = 'power auto';

-- ---------------------------------------------------------------------------
-- An outsider (Cal, before joining) gets nothing from the group
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);

select is((select count(*) from public.households where id = current_setting('t.flat')::uuid), 0::bigint,
  'an outsider cannot see the household');
select is((select count(*) from public.household_members where household_id = current_setting('t.flat')::uuid), 0::bigint,
  'an outsider cannot see the member list');
select is((select count(*) from public.household_invites), 0::bigint,
  'an outsider cannot see invites');
select is((select count(*) from public.transactions where household_id = current_setting('t.flat')::uuid), 0::bigint,
  'an outsider cannot read the household''s entries');
select is((select count(*) from public.categories where household_id = current_setting('t.flat')::uuid), 0::bigint,
  'an outsider cannot read the household''s categories');
select is((select count(*) from public.recurring_transactions where household_id = current_setting('t.flat')::uuid), 0::bigint,
  'an outsider cannot read the household''s recurring templates');
select ok((select count(*) from public.categories where is_system) > 0,
  'system categories are visible to everyone');
select throws_ok(
  $$select * from public.household_people(current_setting('t.flat')::uuid)$$,
  '42501', null, 'an outsider cannot list the people in a household');
select throws_ok(
  $$insert into public.transactions (user_id, household_id, type, amount_cents)
    values (current_setting('t.cal')::uuid, current_setting('t.flat')::uuid, 'expense', 100)$$,
  '42501', null, 'an outsider cannot add an entry');
select throws_ok(
  $$insert into public.categories (user_id, household_id, name)
    values (current_setting('t.cal')::uuid, current_setting('t.flat')::uuid, 'Sneaky')$$,
  '42501', null, 'an outsider cannot add a category');
select throws_ok(
  $$select * from public.create_household_invite(current_setting('t.flat')::uuid)$$,
  '42501', null, 'an outsider cannot invite');
select throws_ok(
  $$select public.remove_household_member(current_setting('t.flat')::uuid, current_setting('t.ana')::uuid)$$,
  '42501', null, 'an outsider cannot remove members');
select throws_ok(
  $$select public.accept_household_invite(current_setting('t.token_revoked'))$$,
  '23514', null, 'a revoked invite cannot be accepted');
select throws_ok(
  $$select public.accept_household_invite(current_setting('t.token_expired'))$$,
  '23514', null, 'an expired invite cannot be accepted');
select throws_ok(
  $$select public.accept_household_invite('not-a-token')$$,
  '23514', null, 'an unknown invite cannot be accepted');

-- ---------------------------------------------------------------------------
-- Ben accepts and becomes a Contributor
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);

select is(
  (select household_name from public.preview_household_invite(current_setting('t.token_ben'))),
  'Flat',
  'an invite can be previewed before accepting'
);
select is(
  public.accept_household_invite(current_setting('t.token_ben')),
  current_setting('t.flat')::uuid,
  'accepting an invite joins the household'
);
select is(
  (select role from public.household_members
   where household_id = current_setting('t.flat')::uuid and profile_id = current_setting('t.ben')::uuid),
  'contributor',
  'an invited member joins as a Contributor'
);
select throws_ok(
  $$select public.accept_household_invite(current_setting('t.token_ben'))$$,
  '23514', null, 'an invite is single-use');
select throws_ok(
  $$select public.accept_household_invite(current_setting('t.token_cal'))$$,
  '23505', null, 'an existing member cannot join twice');
select is(
  (select count(*) from public.transactions where note = 'ben private' and household_id = current_setting('t.ben_home')::uuid),
  1::bigint,
  'joining a group leaves the member''s own data where it was'
);
select is((select count(*) from public.transactions where note = 'ana rent'), 1::bigint,
  'a member sees other members'' entries');
select is((select count(*) from public.transactions where note = 'ana private'), 0::bigint,
  'sharing a group does not expose a member''s Personal household');
select is(
  (select count(*) from public.household_people(current_setting('t.flat')::uuid)),
  2::bigint,
  'a member can list the people in the household'
);

-- Contributor limits (defaults: edit others on, delete others off, manage
-- categories on, invite off).
select throws_ok(
  $$select * from public.create_household_invite(current_setting('t.flat')::uuid)$$,
  '42501', null, 'a Contributor cannot invite by default');
select throws_ok(
  $$select public.remove_household_member(current_setting('t.flat')::uuid, current_setting('t.ana')::uuid)$$,
  '42501', null, 'a Contributor cannot remove members');
select throws_ok(
  $$select public.transfer_household_admin(current_setting('t.flat')::uuid, current_setting('t.ben')::uuid)$$,
  '42501', null, 'a Contributor cannot take the Admin role');

update public.households set name = 'Ben''s flat', contributors_can_invite = true
where id = current_setting('t.flat')::uuid;
select is(
  (select name from public.households where id = current_setting('t.flat')::uuid),
  'Flat',
  'a Contributor cannot change household settings or toggles'
);

insert into public.transactions (user_id, household_id, type, amount_cents, note, created_by)
values (current_setting('t.ben')::uuid, current_setting('t.flat')::uuid, 'expense', 300, 'ben milk', current_setting('t.ana')::uuid);
select is(
  (select created_by from public.transactions where note = 'ben milk'),
  current_setting('t.ben')::uuid,
  'a client cannot forge the author of an entry'
);

update public.transactions set amount_cents = 9500 where note = 'ana rent';
select is(
  (select array[amount_cents, version] from public.transactions where note = 'ana rent'),
  array[9500, 2],
  'a Contributor can edit others'' entries by default, and the version is bumped'
);
select is(
  (select array[created_by, updated_by] from public.transactions where note = 'ana rent'),
  array[current_setting('t.ana')::uuid, current_setting('t.ben')::uuid],
  'an edit records the editor and keeps the author'
);

delete from public.transactions where note = 'ana rent';
select is((select count(*) from public.transactions where note = 'ana rent'), 1::bigint,
  'a Contributor cannot delete others'' entries by default');

select throws_ok(
  $$update public.transactions set household_id = current_setting('t.ben_home')::uuid where note = 'ben milk'$$,
  '42501', null, 'an entry cannot be moved to another household');

select lives_ok(
  $$insert into public.categories (user_id, household_id, name)
    values (current_setting('t.ben')::uuid, current_setting('t.flat')::uuid, 'Takeaways')$$,
  'a Contributor can add categories by default');

update public.categories set name = 'Shelter' where name = 'Housing' and is_system;
select is((select count(*) from public.categories where name = 'Housing' and is_system), 1::bigint,
  'system categories cannot be edited');

-- The Admin flips the toggles.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
update public.households
set contributors_can_edit_others = false,
    contributors_can_delete_others = true,
    contributors_can_manage_categories = false,
    contributors_can_invite = true
where id = current_setting('t.flat')::uuid;

select throws_ok(
  $$update public.households set time_zone = 'Nowhere/Land' where id = current_setting('t.flat')::uuid$$,
  '23514', null, 'the Admin cannot set an unknown time zone');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);

update public.transactions set amount_cents = 1 where note = 'ana rent';
select is((select amount_cents from public.transactions where note = 'ana rent'), 9500,
  'with "edit others" off a Contributor cannot edit others'' entries');
update public.transactions set amount_cents = 350 where note = 'ben milk';
select is((select amount_cents from public.transactions where note = 'ben milk'), 350,
  'a Contributor can always edit their own entries');
select throws_ok(
  $$insert into public.categories (user_id, household_id, name)
    values (current_setting('t.ben')::uuid, current_setting('t.flat')::uuid, 'Blocked')$$,
  '42501', null, 'with "manage categories" off a Contributor cannot add categories');
select lives_ok(
  $$select * from public.create_household_invite(current_setting('t.flat')::uuid)$$,
  'with "invite" on a Contributor can invite');
delete from public.transactions where note = 'ana rent';
select is((select count(*) from public.transactions where note = 'ana rent'), 0::bigint,
  'with "delete others" on a Contributor can delete others'' entries');

-- ---------------------------------------------------------------------------
-- Removal keeps entries; leaving hands the Admin role on
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select public.accept_household_invite(current_setting('t.token_cal'));
insert into public.transactions (user_id, household_id, type, amount_cents, note)
values (current_setting('t.cal')::uuid, current_setting('t.flat')::uuid, 'expense', 700, 'cal bread');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select public.remove_household_member(current_setting('t.flat')::uuid, current_setting('t.cal')::uuid);

select is(
  (select created_by from public.transactions where note = 'cal bread'),
  current_setting('t.cal')::uuid,
  'a removed member''s entries stay, with their author'
);
select ok(
  (select left_at is not null and display_name = 'Cal'
   from public.household_people(current_setting('t.flat')::uuid)
   where profile_id = current_setting('t.cal')::uuid),
  'a former member is still listed by name'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', true);
select is((select count(*) from public.transactions where household_id = current_setting('t.flat')::uuid), 0::bigint,
  'a removed member loses access immediately');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', true);
select public.leave_household(current_setting('t.flat')::uuid);
select is((select count(*) from public.households where id = current_setting('t.flat')::uuid), 0::bigint,
  'a member who leaves loses access');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', true);
select is(
  (select role from public.household_members
   where household_id = current_setting('t.flat')::uuid and profile_id = current_setting('t.ben')::uuid and left_at is null),
  'admin',
  'when the Admin leaves, the longest-standing member becomes Admin'
);
select throws_ok(
  $$select public.leave_household(current_setting('t.flat')::uuid)$$,
  '23514', null, 'the last member must confirm before leaving deletes the household');
select public.leave_household(current_setting('t.flat')::uuid, true);

reset role;
select is((select count(*) from public.households where id = current_setting('t.flat')::uuid), 0::bigint,
  'the last member leaving deletes the household');
select is((select count(*) from public.transactions where note in ('ben milk', 'cal bread')), 0::bigint,
  'deleting a household deletes its entries');
select is((select count(*) from public.transactions where note in ('ana private', 'ben private')), 2::bigint,
  'deleting a group never touches Personal households');

-- Signed-out callers cannot reach the household functions at all.
set local role anon;
select throws_ok(
  $$select public.create_household('Anon', 'USD', 1, 'UTC')$$,
  '42501', null, 'a signed-out caller cannot create a household');
reset role;

select * from finish();
rollback;
