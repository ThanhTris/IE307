-- GM-23.1 pgTAP boundary checks. Positive sender cases run through the
-- disposable HTTP fixture; this file never reads or prints a push token.
begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions,pg_catalog;
select plan(20);
select ok(to_regprocedure('public.list_partner_inbox(text)') is not null,'inbox RPC registered');
select ok(to_regprocedure('public.register_push_device(text,text,text,text)') is not null,'register RPC registered');
select ok(to_regprocedure('public.unregister_push_device(text,text)') is not null,'unregister RPC registered');
select ok(to_regprocedure('public.claim_push_deliveries(integer)') is not null,'trusted claim registered');
select ok(to_regprocedure('public.complete_push_delivery(uuid,uuid,text)') is not null,'trusted completion registered');
select ok(to_regprocedure('public.fail_push_delivery(uuid,uuid,text,integer)') is not null,'trusted failure registered');
select ok(to_regprocedure('public.record_push_receipt(uuid,text,text,text)') is not null,'trusted receipt registered');
select ok(to_regprocedure('public.claim_push_receipts(integer)') is not null,'trusted receipt claim registered');
select ok((select prosecdef from pg_proc where oid='public.register_push_device(text,text,text,text)'::regprocedure),'register is definer');
select ok((select prosecdef from pg_proc where oid='public.claim_push_deliveries(integer)'::regprocedure),'claim is definer');
select ok(not has_function_privilege('anon','public.register_push_device(text,text,text,text)','execute'),'anon cannot register');
select ok(has_function_privilege('authenticated','public.register_push_device(text,text,text,text)','execute'),'authenticated can register');
select ok(not has_function_privilege('authenticated','public.claim_push_deliveries(integer)','execute'),'client cannot claim');
select ok(has_function_privilege('service_role','public.claim_push_deliveries(integer)','execute'),'service role can claim');
select ok(not has_table_privilege('authenticated','gm23_private.delivery_meta','select'),'private lease metadata denied');
select ok(not has_table_privilege('authenticated','public.deliveries','select'),'delivery rows denied');
select ok(not has_column_privilege('authenticated','public.devices','push_token','select'),'push token column denied');
select ok((select lower(prosrc) like '%for update%' from pg_proc where oid='public.claim_push_deliveries(integer)'::regprocedure),'claim locks rows');
select ok((select prosrc like '%120 seconds%' from pg_proc where oid='public.claim_push_deliveries(integer)'::regprocedure),'claim lease is 120 seconds');
select ok((select prosrc like '%batch_size>100%' from pg_proc where oid='public.claim_push_deliveries(integer)'::regprocedure),'claim caps batch at 100');
select * from finish();
rollback;
