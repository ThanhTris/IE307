-- GM-22.1 SQL boundary suite. Run in a disposable database after all migrations.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select extensions.plan(35);
select extensions.ok(exists(select 1 from public.schema_versions where contract_id='food-v1/roadmap-v2/GM-22.1'),'GM-22 contract is registered'::text);
select extensions.is((select schema_version from public.schema_versions where contract_id='food-v1/roadmap-v2/GM-22.1'),'0.4.0'::text,'social schema is 0.4.0'::text);
select extensions.ok(exists(select 1 from public.schema_versions where schema_version='0.14.0' and contract_id='food-v1/roadmap-v2/GM-22.2'),'GM-22.2 admission supplement is registered'::text);
select extensions.is((select count(*) from public.schema_versions where schema_version='0.14.0'),1::bigint,'GM-22.2 schema version is unique'::text);
select extensions.ok(has_function_privilege('authenticated','public.get_my_social_identity()','EXECUTE'),'authenticated can read own identity'::text);
select extensions.ok(has_function_privilege('authenticated','public.reject_room_invite(text,text)','EXECUTE'),'authenticated can reject room invites'::text);
select extensions.ok((select prosecdef from pg_proc where oid='public.accept_room_invite(text,text,text)'::regprocedure),'room acceptance remains security definer'::text);
select extensions.ok((select proconfig @> array['search_path=pg_catalog, public, gm19_private, gm22_private, dish_v4_private'] from pg_proc where oid='public.accept_room_invite(text,text,text)'::regprocedure),'room acceptance pins its search path'::text);
select extensions.ok(not has_function_privilege('authenticated','dish_v4_private.admit_member(uuid,uuid,text)','EXECUTE'),'client cannot call shared admission helper directly'::text);
select extensions.ok(not has_function_privilege('anon','public.invite_partner(text,text,text)','EXECUTE'),'anon cannot invite partners'::text);
select extensions.ok(has_function_privilege('anon','public.list_friends()','EXECUTE'),'anon can reach only the guarded auth-error boundary'::text);
select extensions.ok(not has_schema_privilege('authenticated','gm22_private','USAGE'),'social helper schema is private'::text);
select extensions.ok(not has_table_privilege('authenticated','public.profiles','INSERT'),'client cannot insert profiles'::text);
select extensions.ok((select convalidated from pg_constraint where conname='profiles_friend_code_shape'),'friend code shape is validated'::text);
select extensions.ok((select indisunique from pg_index where indexrelid='profiles_friend_code_uq'::regclass),'friend codes are unique'::text);
select extensions.ok((select not attnotnull from pg_attribute where attrelid='public.events'::regclass and attname='room_id' and not attisdropped),'friend event room is nullable'::text);
select extensions.ok(exists(select 1 from pg_attribute where attrelid='public.events'::regclass and attname='friend_invitation_id'),'friend event reference exists'::text);
-- Exercise the deployed CHECK rules without depending on a historical constraint
-- name. LIKE copies CHECK/NOT NULL rules but not foreign keys or event triggers;
-- the real invitation RPC below separately exercises persisted references.
create temp table gm22_event_shapes (like public.events including constraints) on commit drop;
create function pg_temp.gm22_insert_event_shape(
  event_kind text, room uuid, invitation uuid, friend_invitation uuid,
  legacy_result uuid, v4_result uuid
) returns void language sql as $$
  insert into pg_temp.gm22_event_shapes
    (id,kind,room_id,invitation_id,friend_invitation_id,result_id,dish_v4_result_id,
     recipient_user_ids,dedupe_key,created_at,expires_at,version)
  values(gen_random_uuid(),event_kind,room,invitation,friend_invitation,legacy_result,v4_result,
    array[gen_random_uuid()],gen_random_uuid()::text,statement_timestamp(),statement_timestamp()+interval '1 day',1)
$$;
select extensions.lives_ok($q$select pg_temp.gm22_insert_event_shape('FRIEND_INVITED',null,null,gen_random_uuid(),null,null)$q$,'friend event with its invitation is accepted'::text);
select extensions.lives_ok($q$select pg_temp.gm22_insert_event_shape('ROOM_INVITED',gen_random_uuid(),gen_random_uuid(),null,null,null)$q$,'room invitation event is accepted'::text);
select extensions.lives_ok($q$select pg_temp.gm22_insert_event_shape('ROOM_RESULT_READY',gen_random_uuid(),null,null,gen_random_uuid(),null)$q$,'legacy result event is accepted'::text);
select extensions.lives_ok($q$select pg_temp.gm22_insert_event_shape('ROOM_RESULT_READY',gen_random_uuid(),null,null,null,gen_random_uuid())$q$,'v4 result event is accepted'::text);
select extensions.throws_ok($q$select pg_temp.gm22_insert_event_shape('FRIEND_INVITED',null,null,null,null,null)$q$,'23514',null,'friend event without an invitation is rejected'::text);
select extensions.throws_ok($q$select pg_temp.gm22_insert_event_shape('FRIEND_INVITED',gen_random_uuid(),null,gen_random_uuid(),null,null)$q$,'23514',null,'friend event with a room is rejected'::text);
select extensions.throws_ok($q$select pg_temp.gm22_insert_event_shape('ROOM_RESULT_READY',gen_random_uuid(),null,null,null,null)$q$,'23514',null,'result event without a result is rejected'::text);
select extensions.throws_ok($q$select pg_temp.gm22_insert_event_shape('ROOM_RESULT_READY',gen_random_uuid(),null,null,gen_random_uuid(),gen_random_uuid())$q$,'23514',null,'result event cannot reference legacy and v4 results together'::text);
select extensions.throws_ok($q$select pg_temp.gm22_insert_event_shape('ROOM_INVITED',gen_random_uuid(),gen_random_uuid(),null,gen_random_uuid(),null)$q$,'23514',null,'invitation event with a result is rejected'::text);
select extensions.throws_ok($q$select pg_temp.gm22_insert_event_shape('ROOM_INVITED',gen_random_uuid(),null,null,null,null)$q$,'23514',null,'room invitation event without an invitation is rejected'::text);
select extensions.throws_ok($q$select pg_temp.gm22_insert_event_shape('UNKNOWN_EVENT',gen_random_uuid(),null,null,null,null)$q$,'23514',null,'unknown event kind is rejected'::text);
select extensions.ok(exists(select 1 from pg_indexes where indexname='friend_invitations_pending_pair_uq'),'pending canonical pair is unique'::text);
select extensions.ok(exists(select 1 from pg_indexes where indexname='room_invitations_pending_room_recipient_uq'),'pending room invitation is unique'::text);

create temp table gm22_identity(user_id uuid primary key, friend_code text) on commit drop;
do $fixture$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); begin
  insert into auth.users(id,is_anonymous) values(a,true),(b,true);
  insert into gm22_identity select a,friend_code from public.profiles where user_id=a;
  insert into gm22_identity select b,friend_code from public.profiles where user_id=b;
end $fixture$;
select extensions.ok((select count(*)=2 from gm22_identity),'synthetic identities receive stable codes'::text);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id::text from gm22_identity limit 1),'role','authenticated')::text,true);
select extensions.ok((public.get_my_social_identity()->>'friendCode') ~ '^[A-HJ-NP-Z2-9]{10}$','self identity exposes unambiguous ten character code'::text);
select extensions.is((public.invite_partner('gm22-sql-1',null,(select user_id::text from gm22_identity offset 1 limit 1))->'data'->>'status'),'pending'::text,'friend invite is pending'::text);
select extensions.is((public.invite_partner('gm22-sql-2',null,(select user_id::text from gm22_identity offset 1 limit 1))->'data'->>'status'),'pending'::text,'duplicate pending invite replays the existing invitation'::text);
select set_config('request.jwt.claims','{}',true);
select extensions.is((public.list_friends()->>'messageKey'),'AUTH_REQUIRED'::text,'missing claims return the stable auth error'::text);
select * from extensions.finish();
rollback;
