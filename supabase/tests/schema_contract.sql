-- GM-06 real pgTAP suite. Runner injects fixtureOnly=true templates at marker.
-- Transaction rolls back every synthetic row and temporary privilege change.
begin;
set local timezone='UTC';
set local search_path=public,extensions,pg_catalog;
-- GM06_FIXTURE_HERE

create function pg_temp.rejects(statement text, expected_state text) returns boolean
language plpgsql as $$
begin
  begin
    execute statement;
    set constraints all immediate;
    raise exception using errcode='P0004',message='unexpected acceptance';
  exception when others then
    return sqlstate=expected_state;
  end;
end $$;

create function pg_temp.clone_first(tbl text, patch jsonb) returns text
language plpgsql as $$
declare row_value jsonb; columns text;
begin
  execute format('select to_jsonb(t) from public.%I t limit 1',tbl) into row_value;
  select string_agg(quote_ident(attname),',' order by attnum) into columns
    from pg_attribute where attrelid=format('public.%I',tbl)::regclass
    and attnum>0 and not attisdropped and attgenerated='';
  return format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,%L::jsonb)',tbl,columns,columns,tbl,row_value||patch);
end $$;

create function pg_temp.client_count(role_name text, tbl text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute format('set local role %I',role_name);
  execute format('select count(*) from public.%I',tbl) into n;
  reset role;
  return n;
end $$;

select plan(62);
select is((select schema_version from public.schema_versions),'0.1.0','schema version is separate from dataset/contract');
select is((select count(*)::int from public.schema_versions),1,'one installed schema version');
select is((select count(*)::int from public.dishes),1,'synthetic catalogue query returns one dish');
select is((select count(*)::int from public.venue_dishes o join public.venues v on o.venue_id=v.id join public.dishes d on o.dish_id=d.id join public.schedule_groups s on s.schedule_id=o.schedule_id),1,'BE can join offering / dish / venue / schedule');
select is((select count(*)::int from public.rooms r join public.members m on m.room_id=r.id),2,'room roster query has two members');
select is((select count(*)::int from public.results r join public.round_dishes p on p.id=r.winner_round_dish_id),1,'result references a persisted choice');
select is((select count(*)::int from public.histories),2,'personal and group minimal history stored');
select is((select count(*)::int from public.events),2,'invitation and result event refs stored');

select ok(pg_temp.rejects($q$update public.dishes set name=null,version=version+1$q$,'23502'),'required SQL field rejects null');
select ok(pg_temp.rejects($q$update public.dishes set temperature='boiling',version=version+1$q$,'23514'),'enum rejects unknown label');
select ok(pg_temp.rejects($q$update public.venue_dishes set price_min=-1,version=version+1$q$,'23514'),'negative price rejected');
select ok(pg_temp.rejects($q$update public.venue_dishes set price_min=999999,price_max=1,version=version+1$q$,'23514'),'min price greater than max rejected');
select ok(pg_temp.rejects($q$update public.venue_dishes set unit=null,price_min=1,version=version+1$q$,'23514'),'known price requires unit/currency');
select ok(pg_temp.rejects($q$update public.venues set lat=91,version=version+1$q$,'23514'),'latitude WGS84 bound');
select ok(pg_temp.rejects($q$update public.venues set lng=null,version=version+1$q$,'23514'),'coordinate pair must be complete');
select ok(pg_temp.rejects($q$update public.venues set timezone='Mars/Olympus',version=version+1$q$,'23514'),'IANA timezone exists');
select ok(pg_temp.rejects($q$update public.public_anchors set is_public=false,version=version+1$q$,'23514'),'private GPS cannot become public anchor');
select ok(pg_temp.rejects($q$update public.dishes set version=0$q$,'23514'),'record version is positive and monotonic');
select ok(pg_temp.rejects($q$update public.dishes set name='changed without version'$q$,'23514'),'content update requires version increase');
select ok(pg_temp.rejects($q$update public.dishes set id='00000000-0000-0000-0000-000000000001',version=version+1$q$,'23514'),'stable ID immutable');
select ok(pg_temp.rejects($q$update public.rooms set host_user_id='00000000-0000-0000-0000-000000000001',version=version+1$q$,'23503'),'FK references real auth.users instead of profiles');
select ok(pg_temp.rejects($q$update public.dishes set cuisine_ids=array['00000000-0000-0000-0000-000000000001']::uuid[],version=version+1$q$,'23503'),'array UUID FK rejects missing taxonomy');
select ok(pg_temp.rejects($q$update public.dishes set cuisine_ids=category_ids,version=version+1$q$,'23514'),'cuisine cannot point to category taxonomy');
select ok(pg_temp.rejects($q$update public.dishes set cuisine_ids=cuisine_ids||cuisine_ids,version=version+1$q$,'23514'),'UUID array uniqueItems enforced');
select ok(pg_temp.rejects($q$update public.dishes set field_sources='{"name":"00000000-0000-0000-0000-000000000001"}',version=version+1$q$,'23503'),'JSON source UUID FK enforced');
select ok(pg_temp.rejects($q$update public.rooms set roster_user_ids=array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002']::uuid[],consent_snapshot='[{"userId":"00000000-0000-0000-0000-000000000001","historyConsent":true},{"userId":"00000000-0000-0000-0000-000000000002","historyConsent":true}]',version=version+1$q$,'23503'),'nested structured-array auth FK enforced');
select ok(pg_temp.rejects($q$update public.dishes set flavor='{"spicy":{"present":true,"intensity":"high"}}',version=version+1$q$,'23514'),'nested required flavor keys enforced');
select ok(pg_temp.rejects($q$update public.rooms set budget='{"min":null,"max":null,"currency":"VND","unit":"person","gps":1}',version=version+1$q$,'23514'),'JSON extra field rejects private GPS payload');
select ok(pg_temp.rejects($q$update public.rooms set radius_m=0,version=version+1$q$,'23514'),'radius strictly positive');
select ok(pg_temp.rejects($q$update public.rooms set roster_user_ids=roster_user_ids[1:1],version=version+1$q$,'23514'),'locked roster minimum two');
select ok(pg_temp.rejects($q$update public.weekly_schedules set end_day_offset=0,version=version+1 where start_time>end_time$q$,'23514'),'overnight interval needs explicit offset');
select ok(pg_temp.rejects($q$update public.weekly_schedules set last_order=end_time,last_order_day_offset=end_day_offset,version=version+1 where status='open'$q$,'23514'),'last order excludes end boundary');
select ok(pg_temp.rejects($q$update public.weekly_schedules set last_order_day_offset=null,version=version+1 where last_order is not null$q$,'23514'),'last-order time and offset known together');
select ok(pg_temp.rejects($q$update public.weekly_schedules set timezone='UTC',version=version+1$q$,'23503'),'schedule timezone consistent with group/venue');
select ok(pg_temp.rejects($q$update public.date_exceptions set intervals='[{"startTime":"10:00","endTime":"12:00","endDayOffset":0,"is24Hours":false}]',version=version+1$q$,'23514'),'closed exception cannot retain open intervals');
select ok(pg_temp.rejects($q$update public.coverage_areas set boundary=jsonb_set(boundary,'{coordinates,0,0}','[0,0]'),version=version+1$q$,'23514'),'polygon ring must close');
select ok(pg_temp.rejects($q$update public.data_sources set reviewed_by=entered_by,version=version+1$q$,'23514'),'reviewer must differ from data entrant');
select ok(pg_temp.rejects($q$update public.dishes set review_status='published',status='published',version=version+1$q$,'23514'),'fixtureOnly rows cannot publish');
select ok(pg_temp.rejects($q$update public.devices set active=true,version=version+1$q$,'23514'),'active push device requires permission and token');
select ok(pg_temp.rejects($q$update public.friend_invitations set recipient_user_id=sender_user_id,version=version+1$q$,'23514'),'self invite rejected');
select ok(pg_temp.rejects($q$update public.friends set low_user_id=high_user_id,version=version+1$q$,'23514'),'friend pair sorted and distinct');
select ok(pg_temp.rejects($q$update public.idempotency set payload_hash=repeat('0',64),version=version+1$q$,'23514'),'ACK payload hash immutable');
select ok(pg_temp.rejects($q$update public.results set finalized_at=finalized_at+interval '1 minute',version=version+1$q$,'23514'),'persisted result immutable');
select ok(not has_table_privilege('authenticated','public.votes','SELECT'),'authenticated cannot select raw votes');
select ok(not has_table_privilege('anon','public.rooms','SELECT'),'anonymous cannot select rooms');
select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in ('public.votes'::regclass,'public.preferences'::regclass,'public.histories'::regclass,'public.devices'::regclass)),'private tables enable and force RLS');
select ok(has_table_privilege('gm06_publisher','public.dishes','INSERT') and not has_table_privilege('gm06_publisher','public.votes','SELECT'),'internal publisher restricted to food');
select ok((select not rolcanlogin and not rolbypassrls from pg_roles where rolname='gm06_publisher'),'publisher cannot login or bypass RLS');
select is((select count(*)::int from information_schema.columns where table_schema='public' and table_name='votes' and column_name='value' and column_default is not null),0,'no implicit OK/KEEP default');
select ok(pg_temp.rejects('update public.venue_dishes set variant=null,version=version+1; '||pg_temp.clone_first('venue_dishes','{"offering_id":"00000000-0000-0000-0000-000000000011","variant":null}'),'23505'),'NULL variant tuple cannot duplicate offering');
select ok(pg_temp.rejects(pg_temp.clone_first('results','{"id":"00000000-0000-0000-0000-000000000012"}'),'23505'),'only one persisted result per room');
select ok(pg_temp.rejects(pg_temp.clone_first('round_dishes','{"id":"00000000-0000-0000-0000-000000000013","ordinal":8}'),'23514'),'maximum eight choices via ordinal bound and unique room/round/ordinal');
select ok(pg_temp.rejects(pg_temp.clone_first('weekly_schedules','{"id":"00000000-0000-0000-0000-000000000014"}'),'23514'),'overlapping and duplicate weekly intervals rejected');
select ok(pg_temp.rejects($q$update public.date_exceptions set local_date='2026-02-30',version=version+1$q$,'22008'),'real calendar date rejects February 30');
select ok(pg_temp.rejects($q$update public.dishes set cuisine_ids=array[null]::uuid[],version=version+1$q$,'23514'),'null array element is not an unknown UUID');
select ok(pg_temp.rejects(pg_temp.clone_first('data_sources','{"source_ref":"00000000-0000-0000-0000-000000000015"}')||$q$;update public.dishes set field_sources='{"name":"00000000-0000-0000-0000-000000000015"}',version=version+1;set constraints all immediate;delete from public.data_sources where source_ref='00000000-0000-0000-0000-000000000015'$q$,'23503'),'parent deletion rejects a source referenced only inside JSON');
select ok(pg_temp.rejects($q$set local role authenticated; select * from public.votes$q$,'42501'),'real authenticated SELECT denied');
select ok(pg_temp.rejects($q$set local role anon; select * from public.rooms$q$,'42501'),'real anonymous SELECT denied');
grant select on public.votes,public.histories to authenticated,anon;
select is(pg_temp.client_count('authenticated','votes'),0::bigint,'RLS returns no raw votes even if SELECT is granted');
select is(pg_temp.client_count('anon','histories'),0::bigint,'RLS returns no histories even if SELECT is granted');
-- Test-only membership, rolled back with the transaction. Deployment does not
-- automatically grant the publisher role to any login or client role.
grant gm06_publisher to postgres with inherit false, set true;
select lives_ok($q$set local role gm06_publisher; update public.dishes set name='fixture publisher update',version=version+1;reset role$q$,'internal publisher can write food with all constraints active');
select ok(pg_temp.rejects($q$update public.rooms set consent_snapshot=jsonb_build_array(consent_snapshot->0,consent_snapshot->0),version=version+1$q$,'23514'),'locked consent users must match roster exactly');

select * from finish();
rollback;
