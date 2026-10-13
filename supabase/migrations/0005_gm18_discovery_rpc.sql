-- GM-18.1 API boundary after GM-17 schema 0.2.0. Kernel 0018 resolves at runtime.
begin;
create schema gm18_api_private;
revoke all on schema gm18_api_private from public,anon,authenticated,service_role;
alter default privileges in schema gm18_api_private revoke execute on functions from public;
create table gm18_api_private.policy (
 singleton boolean primary key default true check(singleton),
 max_radius_m numeric not null check(max_radius_m>0 and max_radius_m<=10000),
 max_future_seconds int not null check(max_future_seconds>0 and max_future_seconds<=604800),
 reads_per_minute int not null check(reads_per_minute between 1 and 120),
 policy_version text not null
);
-- Owner selected 10km/7days on 2026-10-13; bounded read budget is server configuration.
insert into gm18_api_private.policy values(true,10000,604800,60,'gm18-api-1.0.0');
create table gm18_api_private.read_windows (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation text not null check(operation in ('discovery','preview','result')),
 started_at timestamptz not null,hits int not null check(hits>0),
 expires_at timestamptz not null,primary key(user_id,operation)
);
create index gm18_read_window_expiry on gm18_api_private.read_windows(expires_at);
alter table gm18_api_private.policy enable row level security;
alter table gm18_api_private.policy force row level security;
alter table gm18_api_private.read_windows enable row level security;
alter table gm18_api_private.read_windows force row level security;
revoke all on all tables in schema gm18_api_private from public,anon,authenticated,service_role;

create function gm18_api_private.error(code text,status int) returns jsonb
language plpgsql volatile set search_path=pg_catalog as $$
begin
 perform set_config('response.status',status::text,true);
 -- Top-level messageKey supports GM-07 transport's non-2xx mapping; nested error
 -- supports normal ReadResult envelopes. No SQL details or private identifiers.
 return jsonb_build_object('ok',false,'messageKey',code,'error',jsonb_build_object('messageKey',code));
end$$;
create function gm18_api_private.authorize(operation text) returns text
language plpgsql volatile set search_path=pg_catalog as $$
declare caller uuid:=auth.uid();now_at timestamptz:=statement_timestamp();used int;limit_value int;
begin
 if caller is null or not exists(select 1 from auth.users where id=caller) then return 'AUTH_REQUIRED';end if;
 select reads_per_minute into limit_value from gm18_api_private.policy where singleton;
 delete from gm18_api_private.read_windows where expires_at<=now_at;
 insert into gm18_api_private.read_windows as w values(caller,operation,now_at,1,now_at+interval '1 minute')
 on conflict on constraint read_windows_pkey do update set hits=w.hits+1 returning hits into used;
 if used>limit_value then return 'RATE_LIMITED';end if;
 return null;
end$$;
create function gm18_api_private.read_snapshot() returns jsonb
language plpgsql stable set search_path=pg_catalog as $$
declare version_name text;bundle jsonb;entity record;published_rows jsonb;entity_map jsonb:='{}';
begin
 select dataset_version into version_name from public.dataset_versions
 where review_status='published' and not fixture_only and checked_at<=statement_timestamp()
   and valid_until>statement_timestamp()
 order by checked_at desc,dataset_version collate "C" desc,id limit 1;
 -- ADR-014: safe version metadata from real test data, never expose draft rows.
 if version_name is null then
   select dataset_version into version_name from public.dataset_versions where not fixture_only
     order by checked_at desc nulls last,dataset_version collate "C" desc,id limit 1;
 end if;
 version_name:=coalesce(version_name,'unavailable');
 bundle:=gm18_private.snapshot(version_name);
 for entity in select * from jsonb_each(bundle->'entities') loop
   select coalesce(jsonb_agg(value),'[]') into published_rows from jsonb_array_elements(entity.value)
   where value->>'reviewStatus'='published' and not coalesce((value->>'fixtureOnly')::boolean,true);
   entity_map:=jsonb_set(entity_map,array[entity.key],published_rows,true);
 end loop;
 return jsonb_build_object('contractVersion','1.1.0','datasetVersion',version_name,'fixtureOnly',false,'entities',entity_map);
end$$;
create function gm18_api_private.project_pool(pool jsonb,bundle jsonb,target_at timestamptz) returns jsonb
language plpgsql stable set search_path=pg_catalog as $$
declare item jsonb;art jsonb;source_value jsonb;cards jsonb:='[]';safe_art jsonb;
begin
 for item in select value from jsonb_array_elements(pool) loop
   art:=item->'artwork';safe_art:='null';
   select value into source_value from jsonb_array_elements(bundle#>'{entities,dataSources}') where value->>'sourceRef'=art->>'sourceRef';
   if art->>'usageRights' in ('granted','licensed','public_domain')
     and source_value->>'usageRights' in ('granted','licensed','public_domain')
     and gm18_private.fresh(source_value,statement_timestamp(),greatest(target_at,statement_timestamp()))
     and (art->>'usageRights'<>'licensed' or nullif(art->>'license','') is not null) then
     safe_art:=jsonb_build_object('url',art->>'url','usageRights',art->>'usageRights','license',art->'license','attribution',art->'attribution');
   end if;
   cards:=cards||jsonb_build_array(jsonb_build_object(
     'roundDishId',item->>'roundDishId','choiceId',item->>'choiceId','dishId',item->>'dishId','name',item->>'name',
     'description',item->'description','cuisineIds',item->'cuisineIds','categoryIds',item->'categoryIds',
     'origin',coalesce(item->>'origin','unknown'),'temperature',item->'temperature','flavor',item->'flavor','artwork',safe_art,
     'priceMin',item->'priceMin','priceMax',item->'priceMax','currency',item->'currency','unit',item->'unit',
     'servingSize',item->'servingSize','price',item->'price','venueId',item->>'venueId','venueName',item->>'venueName',
     'venueAddress',coalesce(item->>'venueAddress',''),'distanceM',item->'distanceM',
     'offeringIds',item->'offeringIds','availability',item->>'availability'));
 end loop;
 return cards;
end$$;
create function gm18_api_private.taxonomy_ids_valid(values_array jsonb,kind text) returns boolean
language plpgsql stable set search_path=pg_catalog as $$
declare value jsonb;id_value text;
begin
 if values_array is null or values_array='null'::jsonb then return true;end if;
 if jsonb_typeof(values_array)<>'array' then return false;end if;
 if jsonb_array_length(values_array)>32 then return false;end if;
 if (select count(*) from jsonb_array_elements(values_array))<>
    (select count(distinct v) from jsonb_array_elements(values_array) v) then return false;end if;
 for value in select v from jsonb_array_elements(values_array) v loop
   if jsonb_typeof(value)<>'string' then return false;end if;
   id_value:=value#>>'{}';
   if id_value!~'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then return false;end if;
   if not exists(select 1 from public.taxonomy t where t.id::text=id_value and t.type=kind
     and t.review_status='published' and not t.fixture_only) then return false;end if;
 end loop;
 return true;
end$$;

create function public.get_discovery_context(area_id text default null,anchor_id text default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare denial text;bundle jsonb;data jsonb;wanted uuid;
begin
 denial:=gm18_api_private.authorize('discovery');
 if denial is not null then return gm18_api_private.error(denial,case when denial='RATE_LIMITED' then 429 else 401 end);end if;
 if (area_id is not null and area_id!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') or
    (anchor_id is not null and anchor_id!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') then return gm18_api_private.error('INVALID_INPUT',400);end if;
 bundle:=gm18_api_private.read_snapshot();
 data:=gm18_private.discovery(bundle,statement_timestamp());
 -- GM-04 coverage has no administrative linkage; preserve that unknown rather
 -- than inventing a venue's district. GM-07 requires a nonempty string sentinel.
 data:=jsonb_set(data,'{coverageAreas}',(select coalesce(jsonb_agg(
   jsonb_set(value,'{adminAreaId}',to_jsonb(coalesce(nullif(value->>'adminAreaId',''),'unknown')))),'[]')
   from jsonb_array_elements(data->'coverageAreas')));
 if area_id is not null then
   wanted:=area_id::uuid;
   data:=jsonb_set(data,'{coverageAreas}',(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(data->'coverageAreas') where value->>'id'=wanted::text));
   data:=jsonb_set(data,'{anchors}',(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(data->'anchors') where value->>'coverageId'=wanted::text));
 end if;
 if anchor_id is not null then
   wanted:=anchor_id::uuid;
   data:=jsonb_set(data,'{anchors}',(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(data->'anchors') where value->>'id'=wanted::text));
   data:=jsonb_set(data,'{coverageAreas}',(select coalesce(jsonb_agg(c.value),'[]')
     from jsonb_array_elements(data->'coverageAreas') c where exists(
       select 1 from jsonb_array_elements(data->'anchors') a where a.value->>'coverageId'=c.value->>'id')));
 end if;
 -- Bounded lookup; no raw GPS/cursor/groupKey input and no private source fields.
 data:=jsonb_set(data,'{coverageAreas}',(select coalesce(jsonb_agg(value),'[]') from (select value from jsonb_array_elements(data->'coverageAreas') limit 100) q));
 data:=jsonb_set(data,'{anchors}',(select coalesce(jsonb_agg(value),'[]') from (
   select a.value from jsonb_array_elements(data->'anchors') a where exists(
     select 1 from jsonb_array_elements(data->'coverageAreas') c where c.value->>'id'=a.value->>'coverageId') limit 100) q));
 return jsonb_build_object('ok',true,'data',data);
end$$;

create function public.preview_food_pool(anchor_id text default null,radius_m jsonb default null,
 desired_at text default null,service_mode text default null,meal_slot text default null,time_hint text default null,
 cuisine_ids jsonb default null,category_ids jsonb default null,budget jsonb default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare denial text;target_at timestamptz;radius_value numeric;budget_value numeric;
 p gm18_api_private.policy%rowtype;bundle jsonb;ctx jsonb;input_value jsonb;result_value jsonb;seed text;reasons jsonb;
begin
 denial:=gm18_api_private.authorize('preview');
 if denial is not null then return gm18_api_private.error(denial,case when denial='RATE_LIMITED' then 429 else 401 end);end if;
 select * into p from gm18_api_private.policy where singleton;
 if anchor_id is null or anchor_id!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
   or desired_at is null or desired_at!~'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{1,6})?(Z|[+-]\d\d:\d\d)$'
   or radius_m is null or jsonb_typeof(radius_m)<>'number'
   or coalesce(service_mode,'') not in ('dine_in','takeaway','delivery')
   or coalesce(meal_slot,'') not in ('breakfast','lunch','dinner','snack')
   or (time_hint is not null and time_hint<>'late_night') then return gm18_api_private.error('INVALID_INPUT',400);end if;
 begin target_at:=desired_at::timestamptz;radius_value:=radius_m::numeric;
 exception when datetime_field_overflow or invalid_datetime_format or invalid_text_representation then return gm18_api_private.error('INVALID_INPUT',400);end;
 if not isfinite(target_at) or radius_value<=0 or radius_value>p.max_radius_m
   or target_at>statement_timestamp()+make_interval(secs=>p.max_future_seconds)
   then return gm18_api_private.error('INVALID_INPUT',400);end if;
 if target_at<statement_timestamp() then return gm18_api_private.error('DESIRED_TIME_PASSED',400);end if;
 if budget is not null and budget<>'null'::jsonb then
   if jsonb_typeof(budget)<>'number' then return gm18_api_private.error('INVALID_INPUT',400);end if;
   budget_value:=budget::numeric;
   if budget_value<0 then return gm18_api_private.error('INVALID_INPUT',400);end if;
 end if;
 -- Validate array shape before expanding, because SQL does not short-circuit all expressions.
 if cuisine_ids is not null and cuisine_ids<>'null'::jsonb and jsonb_typeof(cuisine_ids)<>'array' then return gm18_api_private.error('INVALID_INPUT',400);end if;
 if category_ids is not null and category_ids<>'null'::jsonb and jsonb_typeof(category_ids)<>'array' then return gm18_api_private.error('INVALID_INPUT',400);end if;
 if not gm18_api_private.taxonomy_ids_valid(cuisine_ids,'cuisine') or not gm18_api_private.taxonomy_ids_valid(category_ids,'category') then return gm18_api_private.error('INVALID_INPUT',400);end if;
 ctx:=jsonb_build_object('anchorId',anchor_id::uuid::text,'radiusM',radius_value,'desiredAt',target_at,
   'serviceMode',service_mode,'mealSlot',meal_slot,'timeHint',time_hint,'budget',budget_value);
 bundle:=gm18_api_private.read_snapshot();
 seed:=md5((ctx-'budget')::text||(bundle->>'datasetVersion')||p.policy_version);
 input_value:=jsonb_build_object('context',ctx,'poolSeed',seed,'preferencesByParticipant',jsonb_build_object('caller',
   jsonb_build_object('cuisineIds',coalesce(nullif(cuisine_ids,'null'),'[]'),'categoryIds',coalesce(nullif(category_ids,'null'),'[]'))));
 result_value:=gm18_private.evaluate(bundle,input_value,statement_timestamp(),jsonb_build_object(
   'maxRadiusM',p.max_radius_m,'maxFutureSeconds',p.max_future_seconds,'fixtureMode',false));
 reasons:='[]';
 if jsonb_array_length(result_value->'pool')=0 then
   if result_value->'reasonCodes' ? 'OUT_OF_COVERAGE' or
      not exists(select 1 from jsonb_array_elements(bundle#>'{entities,publicAnchors}') a where a.value->>'anchorId'=ctx->>'anchorId')
     then reasons:='["OUT_OF_COVERAGE"]';
   elsif jsonb_array_length(result_value->'needsConfirmationOfferings')>0 then reasons:='["AVAILABILITY_UNKNOWN"]';
   else reasons:='["NO_ELIGIBLE_FOOD"]';end if;
 end if;
 return jsonb_build_object('ok',true,'data',jsonb_build_object(
   'pool',gm18_api_private.project_pool(result_value->'pool',bundle,target_at),
   'datasetVersion',bundle->>'datasetVersion','eligibilityVersion',result_value->>'eligibilityVersion',
   'evaluatedAt',result_value->'evaluatedAt','totalCandidateCount',result_value->'totalCandidateCount',
   'poolSeed',seed,'reasonCodes',reasons,'policyVersion',p.policy_version));
end$$;

create function public.get_result_offerings(room_id text default null,result_id text default null) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare denial text;rid uuid;result_uuid uuid;r public.rooms%rowtype;
 winner public.round_dishes%rowtype;winner_id uuid;bundle jsonb;offer jsonb;one_bundle jsonb;answer jsonb;
 result_value jsonb;cards jsonb:='[]';ctx jsonb;input_value jsonb;p gm18_api_private.policy%rowtype;
begin
 denial:=gm18_api_private.authorize('result');
 if denial is not null then return gm18_api_private.error(denial,case when denial='RATE_LIMITED' then 429 else 401 end);end if;
 if room_id is null or result_id is null or room_id!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
   or result_id!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then return gm18_api_private.error('INVALID_INPUT',400);end if;
 rid:=room_id::uuid;result_uuid:=result_id::uuid;
 if not exists(select 1 from public.members m where m.room_id=rid and m.user_id=auth.uid() and m.left_at is null)
   then return gm18_api_private.error('NOT_MEMBER',403);end if;
 select * into r from public.rooms where id=rid for share;
 if not found then return gm18_api_private.error('NOT_MEMBER',403);end if;
 if not gm17_private.is_member(rid) then
   if r.expires_at<=statement_timestamp() then return gm18_api_private.error('ROOM_EXPIRED',410);end if;
   return gm18_api_private.error('NOT_MEMBER',403);
 end if;
 select winner_round_dish_id into winner_id from public.results where id=result_uuid and results.room_id=rid;
 if not found then return gm18_api_private.error('INVALID_INPUT',400);end if;
 if winner_id is null then return jsonb_build_object('ok',true,'data','[]'::jsonb);end if;
 select * into winner from public.round_dishes where id=winner_id and round_dishes.room_id=rid;
 if not found then return gm18_api_private.error('INVALID_INPUT',400);end if;
 if r.desired_at<statement_timestamp() then return jsonb_build_object('ok',true,'data','[]'::jsonb);end if;
 select * into p from gm18_api_private.policy where singleton;
 if r.radius_m>p.max_radius_m or r.desired_at>statement_timestamp()+make_interval(secs=>p.max_future_seconds)
   then return gm18_api_private.error('INVALID_INPUT',400);end if;
 ctx:=jsonb_build_object('anchorId',r.anchor_id,'coverageId',r.coverage_id,'radiusM',r.radius_m,'desiredAt',r.desired_at,
   'serviceMode',r.service_mode,'mealSlot',r.meal_slot,'timeHint',r.time_hint,'budget',r.budget);
 input_value:=jsonb_build_object('context',ctx,'poolSeed',r.pool_seed);
 bundle:=gm18_api_private.read_snapshot();
 bundle:=jsonb_set(bundle,'{entities,venueDishes}',(select coalesce(jsonb_agg(value),'[]')
   from jsonb_array_elements(bundle#>'{entities,venueDishes}')
   where value->>'dishId'=winner.dish_id::text and value->>'variant' is not distinct from winner.variant));
 result_value:=gm18_private.evaluate(bundle,input_value,statement_timestamp(),jsonb_build_object(
   'maxRadiusM',p.max_radius_m,'maxFutureSeconds',p.max_future_seconds,'fixtureMode',false));
 for offer in select value from jsonb_array_elements(bundle#>'{entities,venueDishes}')
   where result_value->'eligibleOfferingIds' ? (value->>'offeringId')
   order by value->>'offeringId' collate "C" limit 100 loop
   one_bundle:=jsonb_set(bundle,'{entities,venueDishes}',jsonb_build_array(offer));
   result_value:=gm18_private.evaluate(one_bundle,input_value,statement_timestamp(),jsonb_build_object(
     'maxRadiusM',p.max_radius_m,'maxFutureSeconds',p.max_future_seconds,'fixtureMode',false));
   for answer in select value from jsonb_array_elements(result_value->'pool') loop
     answer:=jsonb_set(jsonb_set(answer,'{roundDishId}',to_jsonb(winner.id::text)),'{choiceId}',to_jsonb(winner.choice_id::text));
     cards:=cards||gm18_api_private.project_pool(jsonb_build_array(answer),bundle,r.desired_at);
   end loop;
 end loop;
 return jsonb_build_object('ok',true,'data',cards);
end$$;
revoke execute on all functions in schema gm18_api_private from public,anon,authenticated,service_role;
revoke all on function public.get_discovery_context(text,text),public.preview_food_pool(text,jsonb,text,text,text,text,jsonb,jsonb,jsonb),public.get_result_offerings(text,text)
 from public,anon,authenticated,service_role;
grant execute on function public.get_discovery_context(text,text),public.preview_food_pool(text,jsonb,text,text,text,text,jsonb,jsonb,jsonb),public.get_result_offerings(text,text) to authenticated;
comment on schema gm18_api_private is 'GM-18.1 auth/limits/read-window/explicit projection boundary; no draft or fixture publication';
commit;
