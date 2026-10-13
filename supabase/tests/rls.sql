-- GM-17 synthetic fixture markers are injected ONLY by gm17_access_check.py.
-- SQL claim injection tests RLS; JWT verification is a separate HTTP suite.
begin;
set local search_path=public,extensions;
select no_plan();
select ok((select count(*)=2 from public.schema_versions),'upgrade installs schema0.2.0');
select ok((select terminal_at is not null from public.rooms where id='__ROOM__'),'terminal timestamp backfilled with data');
select ok(not has_table_privilege('authenticated','public.rooms','SELECT'),'no table-wide private SELECT');
select ok(not has_column_privilege('authenticated','public.rooms','consent_snapshot','SELECT'),'consent snapshot private');
select ok(not has_column_privilege('authenticated','public.results','tied_choice_ids','SELECT'),'ties private');
select ok(not has_column_privilege('authenticated','public.submissions','payload_hash','SELECT'),'payload hash private');
select ok(not has_column_privilege('authenticated','public.devices','push_token','SELECT'),'push tokens private');
select ok(not has_column_privilege('authenticated','public.dataset_versions','artifact_locator','SELECT'),'dataset artifacts private');
select ok(not has_function_privilege('authenticated','gm17_private.cleanup()','EXECUTE'),'cleanup not a client RPC');
select ok(not has_function_privilege('authenticated','gm17_private.require_room(uuid,bigint,boolean)','EXECUTE'),'mutation guard not a client RPC');
select ok(not has_function_privilege('authenticated','gm17_private.history_valid(uuid)','EXECUTE'),'history validity cannot be probed');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='gm17_private' and p.prosecdef and not ('search_path=pg_catalog'=any(p.proconfig))),'fixed search_path on definer functions');
select ok(not exists(select 1 from pg_publication_tables where schemaname='public' and tablename in ('votes','submissions','preferences','devices','events','deliveries','histories','rooms')),'no private realtime publication');
select ok(has_table_privilege('gm06_publisher','public.dishes','INSERT'),'publisher food write preserved');
select ok(not has_table_privilege('gm06_publisher','public.votes','SELECT'),'publisher cannot read ballots');

select set_config('request.jwt.claims','{"sub":"__USER_A__","role":"authenticated","user_metadata":{"userId":"__USER_B__"}}',true);
set local role authenticated;
select is(auth.uid(),'__USER_A__'::uuid,'metadata cannot spoof caller');
select is((select count(id) from public.rooms),1::bigint,'member sees own live room only');
select is((select count(id) from public.members),2::bigint,'roster visible');
select is((select count(id) from public.preferences),1::bigint,'only own preferences');
select is((select count(id) from public.submissions),1::bigint,'host sees only own submission');
select is((select count(id) from public.votes),1::bigint,'host sees only own vote');
select is((select count(id) from public.submissions where id='__SUB_B__'),0::bigint,'host cannot filter other submission');
select is((select count(id) from public.results),1::bigint,'member reads result projection');
select is((select count(id) from public.histories),2::bigint,'personal plus consented exact group');
select is((select count(id) from public.devices),0::bigint,'host cannot see another device');
select is((select count(id) from public.inbox where owner_user_id<>auth.uid()),0::bigint,'host cannot see another inbox');
select throws_ok('select consent_snapshot from public.rooms','42501',null,'explicit private column rejected');
select throws_ok('select tied_choice_ids from public.results','42501',null,'explicit ties rejected');
select throws_ok('select push_token from public.devices','42501',null,'explicit token rejected');
select throws_ok('select response from public.idempotency','42501',null,'ACK storage not directly readable');
select throws_ok('update public.rooms set state=''CANCELLED''','42501',null,'room direct write denied');
select throws_ok('delete from public.votes','42501',null,'vote direct write denied');
select throws_ok('insert into public.profiles(id) values(gen_random_uuid())','42501',null,'profile direct insert denied');
select throws_ok('select gm17_private.cleanup()','42501',null,'cleanup invocation denied');
select is((select count(id) from public.dishes),0::bigint,'draft fixture catalogue hidden');
reset role;

select set_config('request.jwt.claims','{"sub":"__USER_B__","role":"authenticated"}',true);
set local role authenticated;
select is((select count(id) from public.votes),1::bigint,'member B only own votes');
select is((select count(id) from public.submissions where id='__SUB_A__'),0::bigint,'B cannot read A submission');
select is((select count(id) from public.histories),1::bigint,'B sees group but not A personal history');
select is((select count(id) from public.devices),1::bigint,'B own safe device metadata');
select is((select count(id) from public.inbox),1::bigint,'B own inbox');
reset role;

select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
set local role authenticated;
select is((select count(id) from public.rooms),0::bigint,'outsider sees no rooms');
select is((select count(id) from public.members),0::bigint,'outsider sees no roster');
select is((select count(id) from public.results),0::bigint,'outsider sees no results');
select is((select count(id) from public.votes),0::bigint,'outsider sees no votes');
select is((select count(id) from public.histories),0::bigint,'outsider sees no history');
select is((select count(id) from public.friends),0::bigint,'outsider sees no pairs');
select is((select count(id) from public.friend_invitations),0::bigint,'outsider sees no invites');
select is((select count(id) from public.devices),0::bigint,'outsider sees no devices');
select is(gm17_private.history_visible('__HISTORY__'),false,'helper leaks no history existence');
reset role;
select throws_ok($$select gm17_private.require_room('__ROOM__',1)$$,'PT403','NOT_MEMBER','outsider guard');
select throws_ok($$select gm17_private.require_room('17000000-0000-4000-8000-000000000099',1)$$,'PT403','NOT_MEMBER','missing and outsider same error');
select set_config('request.jwt.claims','{}',true);
select throws_ok($$select gm17_private.require_room('__ROOM__',1)$$,'PT401','AUTH_REQUIRED','guard requires authentication');
set local role anon;
select is((select count(id) from public.dishes),0::bigint,'anon draft read hidden');
select throws_ok('select id from public.rooms','42501',null,'anon private read denied');
select throws_ok('update public.dishes set name=''forged''','42501',null,'anon dataset write denied');
reset role;

select set_config('request.jwt.claims','{"sub":"__USER_A__","role":"authenticated"}',true);
select throws_ok($$select gm17_private.require_room('__ROOM__',null)$$,'PT409','VERSION_CONFLICT','version mandatory');
select throws_ok($$select gm17_private.require_room('__ROOM__',999)$$,'PT409','VERSION_CONFLICT','stale version rejected');
select throws_ok($$select gm17_private.require_room('__ROOM__',(select version from public.rooms where id='__ROOM__'))$$,'PT409','ROOM_TERMINAL','terminal mutation rejected');
select set_config('request.jwt.claims','{"sub":"__USER_B__","role":"authenticated"}',true);
select throws_ok($$select gm17_private.require_room('__ROOM__',(select version from public.rooms where id='__ROOM__'),true)$$,'PT403','NOT_HOST','host permission checked');
select set_config('request.jwt.claims','{"sub":"__USER_A__","role":"authenticated"}',true);
create temp table saved_expiry as select expires_at from public.rooms where id='__ROOM__';
update public.rooms set expires_at=statement_timestamp()-interval '1 second',version=version+1 where id='__ROOM__';
select throws_ok($$select gm17_private.require_room('__ROOM__',999)$$,'PT410','ROOM_EXPIRED','expired even before cleanup');
set local role authenticated;
select is((select count(id) from public.rooms),0::bigint,'expiry immediately hides room');
select is((select count(id) from public.votes),0::bigint,'expiry immediately hides own ballot');
reset role;
update public.rooms set expires_at=(select expires_at from saved_expiry),version=version+1 where id='__ROOM__';
select throws_ok($$update public.rooms set terminal_at=terminal_at+interval '1 hour',version=version+1 where id='__ROOM__'$$,'23514','GM17_TERMINAL_IMMUTABLE','terminal cutoff cannot slide');
insert into public.rooms select (jsonb_populate_record(null::public.rooms,to_jsonb(r)||jsonb_build_object(
  'id','17000000-0000-4000-8000-000000000055','code','QWERTY','state','LOBBY','locked_at',null,'terminal_at',null,
  'roster_user_ids','[]'::jsonb,'consent_snapshot','[]'::jsonb,'created_at',statement_timestamp(),
  'updated_at',statement_timestamp(),'expires_at',statement_timestamp()+interval '1 hour','version',1))).*
  from public.rooms r where id='__ROOM__';
insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
values('17000000-0000-4000-8000-000000000056','17000000-0000-4000-8000-000000000055','__USER_A__','synthetic host',false,false,statement_timestamp(),null,1);
select lives_ok($$select gm17_private.require_room('17000000-0000-4000-8000-000000000055',1,true)$$,'valid host guard succeeds in transaction');



-- Old terminal room has reached cutoff; live room has not. Retained history and
-- live ACKs do not depend on operational rows. Force one old ACK to stay valid.
update public.idempotency set -- immutable row cannot be extended: synthetic ACK inserted instead
  version=version where false;
insert into public.idempotency(id,user_id,operation,request_id,payload_hash,expected_version,response,created_at,expires_at,version)
select gen_random_uuid(),host_user_id,'cancel_room',gen_random_uuid(),repeat('1',64),version,
 jsonb_build_object('roomId',id,'resultId','__OLD_RESULT__','serverVersion',version),statement_timestamp(),statement_timestamp()+interval '1 hour',1
from public.rooms where id='__OLD_ROOM__';
select lives_ok('select gm17_private.cleanup()','atomic retention with ACK/history and invitation-event edges');
select is((select count(*) from public.rooms where id='__OLD_ROOM__'),0::bigint,'old room/context removed');
select is((select count(*) from public.results where id='__OLD_RESULT__'),0::bigint,'old operational result removed');
select is((select count(*) from public.histories where id='__OLD_HISTORY__'),1::bigint,'opt-in history retained after room cleanup');
select is((select count(*) from public.consents where retention_detached),3::bigint,'only referenced consent metadata detached');
select is((select count(*) from public.idempotency where room_ref_id='__OLD_ROOM__'),1::bigint,'unexpired ACK preserved');
select is((select count(*) from public.rooms where id='__ROOM__'),1::bigint,'before-cutoff room remains');
select is((select count(*) from public.votes),2::bigint,'expired-room ballots physically removed');
select lives_ok('select gm17_private.cleanup()','cleanup repeat is safe');

update public.histories set expires_at=statement_timestamp()-interval '1 second',version=version+1 where result_id='__OLD_RESULT__';
select lives_ok('select gm17_private.cleanup()','history expiry cleanup');
select is((select count(*) from public.histories where result_id='__OLD_RESULT__'),0::bigint,'expired history removed');
select is((select count(*) from public.consents where retention_detached),0::bigint,'unreferenced retired consent removed');
select is((select count(*) from gm17_private.result_refs where id='__OLD_RESULT__'),1::bigint,'result ID retained only for live ACK');

update public.consents set enabled=false,revoked_at=statement_timestamp(),version=version+1 where id='__CONSENT__';
set local role authenticated;
select is((select count(id) from public.histories where id='__HISTORY__'),0::bigint,'revoked personal consent denies immediately');
reset role;
select lives_ok('select gm17_private.cleanup()','cleanup revoked consent is executable');
select is((select count(*) from public.histories where id='__HISTORY__'),0::bigint,'revoked history physically removed');
select is((select count(*) from public.histories where id='__GROUP_HISTORY__'),1::bigint,'unrelated scope preserved');
update public.consents set enabled=false,revoked_at=statement_timestamp(),version=version+1 where scope='group_history' and user_id='__USER_B__';
set local role authenticated;
select is((select count(id) from public.histories),0::bigint,'one group consent revoked denies group immediately');
reset role;
update public.consents set enabled=true,revoked_at=null,version=version+1 where scope='group_history' and user_id='__USER_B__';

-- Only disposable synthetic rows model publication; no production approval.
update public.taxonomy set fixture_only=false,review_status='published',status='published',reviewed_by='synthetic-reviewer',valid_until=statement_timestamp()+interval '1 day',version=version+1;
set local role anon;
select is((select count(id) from public.taxonomy),4::bigint,'published synthetic rows readable');
select throws_ok('select entered_by from public.taxonomy','42501',null,'internal author metadata hidden');
reset role;
update public.taxonomy set fixture_only=true,review_status='verified',status='verified',version=version+1;
set local role anon;
select is((select count(id) from public.taxonomy),0::bigint,'verified but unpublished hidden');
reset role;
select ok(statement_timestamp()-interval '24 hours'+interval '24 hours'<=statement_timestamp(),'exact 24h cutoff is inclusive');
select ok(statement_timestamp()-interval '24 hours'+interval '1 microsecond'+interval '24 hours'>statement_timestamp(),'one microsecond before cutoff remains');
update public.devices set created_at=statement_timestamp()-interval '32 days',last_seen_at=statement_timestamp()-interval '31 days',active=true,permission='granted',push_token='synthetic-not-a-real-token',version=version+1;
select lives_ok('select gm17_private.cleanup()','inactive stale tokens cleanup');
select is((select count(*) from public.devices),0::bigint,'30 day stale device/token removed');
select is((select count(*) from public.deliveries),0::bigint,'dependent delivery removed safely');
update public.histories set finalized_at=statement_timestamp()-interval '31 days',expires_at=statement_timestamp()+interval '1 day',version=version+1 where id='__GROUP_HISTORY__';
select lives_ok('select gm17_private.cleanup()','30day max ignores overly long supplied expiry');
select is((select count(*) from public.histories),0::bigint,'history maximum30days enforced');
select is((select count(*) from public.idempotency where room_ref_id='__OLD_ROOM__'),1::bigint,'ACK survives all unrelated retention');
select * from finish();
rollback;
