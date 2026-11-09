-- GM-28.1 bulk-read authorization, pagination and retry checks.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(18);

select extensions.ok(exists(
  select 1 from public.schema_versions
  where schema_version = '0.17.0' and contract_id = 'food-v1/roadmap-v2/GM-28.1'
), 'GM-28.1 is registered');
select extensions.ok((
  select prosecdef and proconfig = array['search_path=pg_catalog']
  from pg_proc where oid = 'public.mark_all_partner_inbox_read(text)'::regprocedure
), 'RPC uses security definer and a fixed search path');
select extensions.ok(
  has_function_privilege('authenticated', 'public.mark_all_partner_inbox_read(text)', 'execute')
  and not has_function_privilege('anon', 'public.mark_all_partner_inbox_read(text)', 'execute')
  and not has_function_privilege('service_role', 'public.mark_all_partner_inbox_read(text)', 'execute'),
  'only authenticated clients may execute the RPC'
);
select extensions.ok(not has_table_privilege('authenticated', 'public.inbox', 'UPDATE'),
  'inbox writes still go through the RPC');

create temp table gm28_accounts on commit drop as
select gen_random_uuid() as owner_id, gen_random_uuid() as other_id, gen_random_uuid() as sender_id;
insert into auth.users(id, is_anonymous)
select account_id, true
from gm28_accounts
cross join lateral (values (owner_id), (other_id), (sender_id)) as accounts(account_id);

select set_config('request.jwt.claims',
  (select jsonb_build_object('sub', sender_id, 'role', 'authenticated')::text from gm28_accounts), true);
select extensions.is(public.invite_partner('gm28-test-owner', null,
  (select owner_id::text from gm28_accounts))->>'ok', 'true', 'owner has an invitation');
select extensions.is(public.invite_partner('gm28-test-other', null,
  (select other_id::text from gm28_accounts))->>'ok', 'true', 'other account has an invitation');

-- Produce distinct inbox rows for the same fixture invitation without sending push.
create function pg_temp.gm28_seed_inbox(first_row integer, last_row integer) returns void
language sql as $$
  with fixture as (
    select a.owner_id, f.id as invitation_id
    from gm28_accounts a
    join public.friend_invitations f on f.recipient_user_id = a.owner_id and f.sender_user_id = a.sender_id
  ), events as (
    insert into public.events(id, kind, friend_invitation_id, recipient_user_ids, dedupe_key, created_at, expires_at, version)
    select gen_random_uuid(), 'FRIEND_INVITED', invitation_id, array[owner_id],
      'gm28-read-all:' || owner_id || ':' || row_number,
      case when row_number = 56 then statement_timestamp() - interval '2 days' else statement_timestamp() end,
      case when row_number = 56 then statement_timestamp() - interval '1 day' else statement_timestamp() + interval '1 day' end,
      1
    from fixture cross join generate_series(first_row, last_row) as batch(row_number)
    returning id, recipient_user_ids, dedupe_key, created_at, expires_at
  )
  insert into public.inbox(id, owner_user_id, event_id, read_at, created_at, expires_at, version)
  select gen_random_uuid(), recipient_user_ids[1], id,
    case when split_part(dedupe_key, ':', 3) = '57' then created_at end,
    created_at, expires_at, 1
  from events
$$;
select pg_temp.gm28_seed_inbox(1, 57);

select set_config('request.jwt.claims', '{}', true);
select extensions.is(public.mark_all_partner_inbox_read('gm28-no-auth')->>'messageKey',
  'AUTH_REQUIRED', 'RPC rejects missing authenticated caller');

select set_config('request.jwt.claims',
  (select jsonb_build_object('sub', owner_id, 'role', 'authenticated')::text from gm28_accounts), true);
select extensions.is(public.mark_all_partner_inbox_read('')->>'messageKey',
  'INVALID_INPUT', 'blank request ID is rejected');
select extensions.is(jsonb_array_length(public.list_partner_inbox()), 50, 'inbox reads a single page');

create temp table gm28_first_ack on commit drop as
select public.mark_all_partner_inbox_read('gm28-first') as wire;
select extensions.is((select wire from gm28_first_ack),
  '{"ok":true,"requestId":"gm28-first","data":null}'::jsonb, 'ACK echoes the request and has null data');
select extensions.is((
  select count(*)::integer from public.inbox i, gm28_accounts a
  where i.owner_user_id = a.owner_id and i.read_at is not null and i.version = 2
), 56, 'all 55 active fixture rows and the original invitation are read');
select extensions.is((
  select count(*)::integer from public.inbox i, gm28_accounts a
  where i.owner_user_id = a.owner_id and i.version = 1
    and ((i.expires_at <= statement_timestamp() and i.read_at is null) or i.read_at = i.created_at)
), 2, 'expired and already read items are unchanged');
select extensions.is((
  select count(*)::integer from public.inbox i, gm28_accounts a
  where i.owner_user_id = a.other_id and i.read_at is null and i.version = 1
), 1, 'owner cannot change another account inbox');

select pg_temp.gm28_seed_inbox(58, 58);
select extensions.is(public.mark_all_partner_inbox_read('gm28-first'),
  (select wire from gm28_first_ack), 'retry returns the exact first ACK');
select extensions.is((
  select count(*)::integer from public.inbox i join public.events e on e.id = i.event_id
  where e.dedupe_key = 'gm28-read-all:' || (select owner_id from gm28_accounts) || ':58' and i.read_at is null
), 1, 'retry leaves a later notification unread');
select extensions.is((
  select count(*)::integer from public.idempotency
  where user_id = (select owner_id from gm28_accounts) and operation = 'mark_all_partner_inbox_read'
), 1, 'retry stores no duplicate ACK');
select public.mark_all_partner_inbox_read('gm28-next');
select extensions.is((
  select count(*)::integer from public.inbox i, gm28_accounts a
  where i.owner_user_id = a.owner_id and i.read_at is null and i.expires_at > statement_timestamp()
), 0, 'a new request reads the later notification');

select set_config('request.jwt.claims',
  (select jsonb_build_object('sub', other_id, 'role', 'authenticated')::text from gm28_accounts), true);
select public.mark_all_partner_inbox_read('gm28-first');
select extensions.is((
  select count(*)::integer from public.inbox i, gm28_accounts a
  where i.owner_user_id = a.other_id and i.read_at is not null and i.version = 2
), 1, 'request ID is scoped to the authenticated account');

select * from extensions.finish();
rollback;
