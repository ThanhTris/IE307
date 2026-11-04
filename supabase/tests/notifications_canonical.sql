-- GM23.2 ACL/transactional hook checks. Behavioral assertions use real producer HTTP.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions,pg_catalog;
select plan(12);
select ok(not has_table_privilege('authenticated','gm23_private.canonical_notifications','select'),'canonical metadata is private');
select ok(not has_function_privilege('authenticated','gm23_private.materialize_terminal(uuid)','execute'),'client cannot materialize events');
select ok(not has_function_privilege('service_role','gm23_private.materialize_terminal(uuid)','execute'),'sender cannot create terminal events');
select ok(not has_function_privilege('authenticated','public.list_partner_inbox_before_gm23_canonical(text)','execute'),'old inbox alias is not a second public entrypoint');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='gm23_private.canonical_notifications'::regclass),'canonical metadata forces RLS');
select ok((select tgdeferrable and tginitdeferred from pg_trigger where tgname='gm23_terminal_notification'),'outbox materialization waits for complete transaction audience');
select ok((select prosecdef and proconfig=array['search_path=pg_catalog'] from pg_proc where oid='gm23_private.materialize_terminal(uuid)'::regprocedure),'materializer uses fixed qualified search path');
select ok((select prosecdef and proconfig=array['search_path=pg_catalog'] from pg_proc where oid='public.list_partner_inbox(text)'::regprocedure),'inbox wrapper uses fixed qualified search path');
select is((select count(*)::integer from public.schema_versions where schema_version='0.15.0' and contract_id='food-v1/roadmap-v2/GM-23.2'),1,'schema supplement registered once');
select ok(has_function_privilege('authenticated','public.list_partner_inbox(text)','execute') and not has_function_privilege('anon','public.list_partner_inbox(text)','execute'),'inbox remains authenticated only');
select ok(position('e.kind in (''ROOM_INVITED'',''ROOM_RESULT_READY'')' in pg_get_functiondef('gm23_private.device_deliveries()'::regprocedure))>0,'device registration backfill excludes inbox-only event kinds');
select ok(position('new.kind not in (''ROOM_INVITED'',''ROOM_RESULT_READY'')' in pg_get_functiondef('gm23_private.event_deliveries()'::regprocedure))>0,'event delivery hook excludes inbox-only event kinds');
select * from finish();
rollback;
