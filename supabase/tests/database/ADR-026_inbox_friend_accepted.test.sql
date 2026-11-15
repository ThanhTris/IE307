-- ADR-026 / 0052: the sender of a friend invite gets a server notification when it is accepted.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(11);

select extensions.ok(exists(
  select 1 from public.schema_versions where schema_version = '0.28.0' and upstream_revision = 'ADR-026/0052_inbox_friend_accepted'
), '0052 is registered');

create temp table adr26 on commit drop as select gen_random_uuid() as sender_id, gen_random_uuid() as receiver_id;
insert into auth.users(id, is_anonymous) select sender_id, true from adr26;
insert into auth.users(id, is_anonymous) select receiver_id, true from adr26;
update public.profiles set display_name = 'Linh', version = version + 1 where user_id = (select receiver_id from adr26);

select set_config('request.jwt.claims', (select jsonb_build_object('sub', sender_id, 'role', 'authenticated')::text from adr26), true);
select extensions.is(public.invite_partner('adr26-invite', null, (select receiver_id::text from adr26))->>'ok', 'true', 'sender invites receiver');
select extensions.is((select count(*)::int from jsonb_array_elements(public.list_partner_inbox()) v where v->>'type' = 'friend_accepted'), 0, 'nothing to announce before the answer');

create temp table adr26_inv on commit drop as
select id from public.friend_invitations where sender_user_id = (select sender_id from adr26) and recipient_user_id = (select receiver_id from adr26);

select set_config('request.jwt.claims', (select jsonb_build_object('sub', receiver_id, 'role', 'authenticated')::text from adr26), true);
select extensions.is(public.accept_partner('adr26-accept', (select id::text from adr26_inv))->>'ok', 'true', 'receiver accepts');
select extensions.is((select count(*)::int from jsonb_array_elements(public.list_partner_inbox()) v where v->>'type' = 'friend_accepted'), 0, 'the one who accepted is not told about their own answer');

select set_config('request.jwt.claims', (select jsonb_build_object('sub', sender_id, 'role', 'authenticated')::text from adr26), true);
create temp table adr26_rows on commit drop as
select v from jsonb_array_elements(public.list_partner_inbox()) v where v->>'type' = 'friend_accepted';
select extensions.is((select count(*)::int from adr26_rows), 1, 'the sender gets one friend_accepted notification');
select extensions.is((select v->>'title' from adr26_rows), 'Kết bạn thành công', 'it has its own title');
select extensions.is((select v->>'body' from adr26_rows), 'Linh đã chấp nhận lời mời kết bạn của bạn', 'it names who accepted');
select extensions.is((select v->'metadata'->>'invitationId' from adr26_rows), (select id::text from adr26_inv), 'it points at the invitation');
select extensions.is((select (v->>'read')::boolean from adr26_rows), false, 'it starts unread');

-- the accepted invite is not offered as an answerable invitation to the receiver or the sender
select extensions.is((select count(*)::int from jsonb_array_elements(public.list_partner_inbox()) v where v->>'type' = 'friend_invite'), 0, 'no pending invitation row is left for the sender');

select * from extensions.finish();
rollback;
