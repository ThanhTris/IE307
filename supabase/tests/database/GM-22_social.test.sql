-- GM-22.1 SQL boundary suite. Run in a disposable database after all migrations.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select extensions.plan(19);
select extensions.ok(exists(select 1 from public.schema_versions where contract_id='food-v1/roadmap-v2/GM-22.1'),'GM-22 contract is registered'::text);
select extensions.is((select schema_version from public.schema_versions where contract_id='food-v1/roadmap-v2/GM-22.1'),'0.4.0'::text,'social schema is 0.4.0'::text);
select extensions.ok(has_function_privilege('authenticated','public.get_my_social_identity()','EXECUTE'),'authenticated can read own identity'::text);
select extensions.ok(has_function_privilege('authenticated','public.reject_room_invite(text,text)','EXECUTE'),'authenticated can reject room invites'::text);
select extensions.ok(not has_function_privilege('anon','public.invite_partner(text,text,text)','EXECUTE'),'anon cannot invite partners'::text);
select extensions.ok(not has_schema_privilege('authenticated','gm22_private','USAGE'),'social helper schema is private'::text);
select extensions.ok(not has_table_privilege('authenticated','public.profiles','INSERT'),'client cannot insert profiles'::text);
select extensions.ok((select convalidated from pg_constraint where conname='profiles_friend_code_shape'),'friend code shape is validated'::text);
select extensions.ok((select indisunique from pg_index where indexrelid='profiles_friend_code_uq'::regclass),'friend codes are unique'::text);
select extensions.ok((select not attnotnull from pg_attribute where attrelid='public.events'::regclass and attname='room_id' and not attisdropped),'friend event room is nullable'::text);
select extensions.ok(exists(select 1 from pg_attribute where attrelid='public.events'::regclass and attname='friend_invitation_id'),'friend event reference exists'::text);
select extensions.ok(exists(select 1 from pg_constraint where conname='events_social_shape'),'event shapes include friend invitations'::text);
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
select extensions.throws_ok($q$select public.list_friends()$q$,'PT401',null,'missing claims are rejected at the SQL boundary'::text);
select * from extensions.finish();
rollback;
