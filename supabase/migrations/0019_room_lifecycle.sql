-- GM-19.1 room lifecycle, context, ready and start API.
-- This migration owns the business RPC boundary. It does not alter an applied
-- foundation migration and keeps all client writes behind SECURITY DEFINER RPCs.
begin;

-- Disposable HTTP databases do not inherit the platform's extensions schema.
-- Keep the hashing/randomness dependency database-local and deterministic in
-- placement; this adds no client package or runtime dependency.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema gm19_private;
revoke all on schema gm19_private from public, anon, authenticated, service_role;
alter default privileges in schema gm19_private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema gm19_private revoke execute on functions from public, anon, authenticated, service_role;

create table gm19_private.rate_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  started_at timestamptz not null,
  hits integer not null check (hits > 0),
  expires_at timestamptz not null,
  primary key (user_id, operation)
);

create table gm19_private.acks (
  id uuid primary key,
  idempotency_id uuid not null references public.idempotency(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  request_id uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  response jsonb not null,
  room_id uuid,
  server_version bigint not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  unique (user_id, operation, request_id)
);
create table gm19_private.pool_snapshots (
  round_dish_id uuid primary key references public.round_dishes(id) on delete cascade,
  projection jsonb not null
);
alter table public.rooms add column anchor_display_name text;
alter table gm19_private.rate_windows enable row level security;
alter table gm19_private.rate_windows force row level security;
alter table gm19_private.acks enable row level security;
alter table gm19_private.acks force row level security;
revoke all on all tables in schema gm19_private from public, anon, authenticated, service_role, gm06_publisher;

create function gm19_private.error(code text, status integer, room uuid default null, request_id uuid default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, gm19_private as $$
begin
  perform set_config('response.status', status::text, true);
  return jsonb_build_object(
    'ok', false,
    'messageKey', code,
    'requestId', request_id,
    'roomId', room,
    'error', jsonb_build_object('messageKey', code),
    'retryAfterSeconds', case when status=429 then 60 else null end
  );
end $$;

create function gm19_private.hash_payload(payload jsonb) returns text
language sql immutable security definer set search_path = pg_catalog, extensions as $$
  select encode(extensions.digest(convert_to(coalesce($1, 'null'::jsonb)::text, 'UTF8'), 'sha256'), 'hex')
$$;

create function gm19_private.uuid_or_null(value text) returns uuid
language plpgsql immutable set search_path = pg_catalog as $$
begin
  if value is null or value !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then return null; end if;
  return value::uuid;
end $$;

-- GM-07 request IDs are opaque strings (the default client uses req_*).
-- GM-06 persists UUID keys; derive a stable private key while echoing the wire ID.
create function gm19_private.request_uuid(value text) returns uuid
language plpgsql immutable set search_path = pg_catalog, extensions as $$
begin
  if value is null or length(value)<1 or length(value)>128 or value~'[[:cntrl:]]' then
    raise sqlstate '22023' using message='INVALID_INPUT';
  end if;
  if gm19_private.uuid_or_null(value) is not null then return value::uuid; end if;
  return substring(encode(extensions.digest(convert_to('GM-19.1/request/'||value,'UTF8'),'sha256'),'hex'),1,32)::uuid;
end $$;

create function gm19_private.require_auth() returns uuid
language plpgsql security definer set search_path = pg_catalog as $$
declare caller uuid := auth.uid();
begin
  if caller is null or not exists(select 1 from auth.users u where u.id = caller) then
    raise sqlstate 'PT401' using message = 'AUTH_REQUIRED';
  end if;
  return caller;
end $$;

create function gm19_private.allow_call(operation_name text, limit_value integer) returns boolean
language plpgsql security definer set search_path = pg_catalog, gm19_private as $$
declare caller uuid := auth.uid(); now_at timestamptz := statement_timestamp(); used integer;
begin
  if caller is null then return false; end if;
  delete from gm19_private.rate_windows where expires_at <= now_at;
  insert into gm19_private.rate_windows as w(user_id, operation, started_at, hits, expires_at)
    values (caller, operation_name, now_at, 1, now_at + interval '1 minute')
  on conflict (user_id, operation) do update
    set hits = w.hits + 1
  returning hits into used;
  return used <= limit_value;
end $$;

create function gm19_private.room_guard(room uuid, expected bigint, host_only boolean) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
begin
  perform gm17_private.require_room(room,expected,host_only);
  return null;
exception
  when sqlstate 'PT401' then return gm19_private.error('AUTH_REQUIRED',401,room);
  when sqlstate 'PT403' then return gm19_private.error(sqlerrm,403,room);
  when sqlstate 'PT409' then return gm19_private.error(sqlerrm,409,room);
  when sqlstate 'PT410' then return gm19_private.error('ROOM_EXPIRED',410,room);
end $$;

create function gm19_private.ack_lookup(operation_name text, request_key uuid, payload_key text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, gm19_private as $$
declare old gm19_private.acks%rowtype;
begin
  -- GM-06 reference lock precedes every room lock and serializes ACK lookup
  -- with its mutation, including concurrent retries of the same request.
  update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
  delete from gm19_private.acks where expires_at <= statement_timestamp();
  select * into old from gm19_private.acks
    where user_id = auth.uid() and operation = operation_name and request_id = request_key;
  if not found then return jsonb_build_object('kind', 'missing'); end if;
  if old.payload_hash <> payload_key then return jsonb_build_object('kind', 'reused'); end if;
  return jsonb_build_object('kind', 'replay', 'response', old.response);
end $$;

create function gm19_private.save_ack(operation_name text, request_key uuid, payload_key text,
  room_key uuid, result_key uuid, expected_version_key bigint, server_version_key bigint, response_value jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, gm19_private, public as $$
declare ack_id uuid:=gen_random_uuid();
begin
  -- The public row preserves the existing schema's reference/TTL contract. The
  -- private ACK holds the complete wire response used for safe replay.
  insert into public.idempotency(id,user_id,operation,request_id,payload_hash,expected_version,response,created_at,expires_at,version)
  values (ack_id,auth.uid(),operation_name,request_key,payload_key,expected_version_key,
    jsonb_build_object('roomId',room_key::text,'resultId',result_key::text,'serverVersion',server_version_key),
    statement_timestamp(),statement_timestamp()+interval '24 hours',server_version_key);
  insert into gm19_private.acks(id,idempotency_id,user_id,operation,request_id,payload_hash,response,room_id,server_version,created_at,expires_at)
  values (gen_random_uuid(),ack_id,auth.uid(),operation_name,request_key,payload_key,response_value,room_key,server_version_key,
    statement_timestamp(),statement_timestamp()+interval '24 hours');
end $$;

create function gm19_private.replay_or_reused(ack jsonb, room uuid, request_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, gm19_private as $$
begin
  if ack->>'kind' = 'reused' then return gm19_private.error('REQUEST_ID_REUSED', 409, room, request_id); end if;
  if ack->>'kind' = 'replay' then return ack->'response'; end if;
  return null;
end $$;

create function gm19_private.code() returns text
language plpgsql volatile set search_path = pg_catalog, extensions as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; value text := ''; i integer;
begin
  for i in 0..5 loop
    value := value || substr(alphabet, 1 + (get_byte(extensions.digest(gen_random_uuid()::text::bytea,'sha256'), i) % length(alphabet)), 1);
  end loop;
  return value;
end $$;

create function gm19_private.context_json(anchor text, radius jsonb, target text, mode text, meal text,
  hint text, budget_value jsonb, avoid boolean) returns jsonb
language plpgsql immutable set search_path = pg_catalog as $$
begin
  return jsonb_build_object('anchorId',anchor,'radiusM',(radius#>>'{}')::numeric,'desiredAt',target::timestamptz,
    'serviceMode',mode,'mealSlot',meal,'timeHint',hint,'budget',budget_value,'avoidRecent',avoid);
end $$;

create function gm19_private.persist_pool(room_key uuid, pool jsonb, pool_version_key bigint, dataset_version_key text default '0.0.0')
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare item jsonb; normalized jsonb := '[]'::jsonb; rd uuid; choice uuid; dish uuid; venue uuid; offering uuid;
  selected_variant text; schedule uuid; schedule_version bigint; profile jsonb; price_value jsonb; found boolean;
begin
  delete from public.round_dishes where room_id = room_key;
  for item in select value from jsonb_array_elements(coalesce(pool,'[]'::jsonb)) loop
    rd := coalesce(gm19_private.uuid_or_null(item->>'roundDishId'),gen_random_uuid());
    choice := coalesce(gm19_private.uuid_or_null(item->>'choiceId'),gen_random_uuid());
    dish := gm19_private.uuid_or_null(item->>'dishId');
    venue := gm19_private.uuid_or_null(item->>'venueId');
    offering := gm19_private.uuid_or_null(coalesce(item->'offeringIds'->>0,item->>'offeringId'));
    if dish is null or venue is null or offering is null then continue; end if;
    select vd.offering_id, vd.variant, vd.schedule_id, coalesce(sg.version,1) into offering,selected_variant,schedule,schedule_version
      from public.venue_dishes vd left join public.schedule_groups sg on sg.schedule_id=vd.schedule_id
      where vd.venue_id=venue and vd.dish_id=dish
        and (vd.offering_id::text in (select jsonb_array_elements_text(coalesce(item->'offeringIds','[]'::jsonb)))
          or vd.offering_id=offering)
      order by (vd.offering_id=offering) desc, vd.offering_id limit 1;
    if schedule is null then continue; end if;
    profile := jsonb_build_object('cuisineIds',coalesce(item->'cuisineIds','[]'::jsonb),
      'categoryIds',coalesce(item->'categoryIds','[]'::jsonb),'mealSlots','[]'::jsonb,
      'timeHints','[]'::jsonb,'temperature',item->'temperature','flavor',item->'flavor','origin',item->'origin');
    price_value := coalesce(item->'price',jsonb_build_object('priceMin',item->'priceMin','priceMax',item->'priceMax',
      'unit',item->'unit','currency',item->'currency','servingSize',item->'servingSize','sourceRef',null));
    insert into public.round_dishes(id,room_id,round,choice_id,dish_id,variant,offering_id,venue_id,ordinal,
      dataset_version,schedule_id,schedule_version,effective_profile,price,pool_version,version)
    values(rd,room_key,1,choice,dish,selected_variant,offering,venue,
      coalesce((item->>'ordinal')::bigint, jsonb_array_length(normalized)),
      dataset_version_key,schedule,schedule_version,profile,price_value,pool_version_key,1)
    on conflict (room_id,round,choice_id) do nothing;
    normalized := normalized || jsonb_build_array(jsonb_set(jsonb_set(item,'{roundDishId}',to_jsonb(rd::text),true),'{choiceId}',to_jsonb(choice::text),true));
    insert into gm19_private.pool_snapshots(round_dish_id,projection)
      values(rd,jsonb_set(jsonb_set(item,'{roundDishId}',to_jsonb(rd::text),true),'{choiceId}',to_jsonb(choice::text),true));
  end loop;
  return normalized;
end $$;

-- Trusted GM-18 kernel port. Client cannot supply participant IDs/history.
create function gm19_private.pool_for_room(room_key uuid, trusted_recent_dish_ids uuid[] default '{}', trusted_context jsonb default null) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare r public.rooms%rowtype; p gm18_api_private.policy%rowtype; ctx jsonb; bundle jsonb;
  prefs jsonb; evaluated jsonb; seed text; reasons jsonb:='[]'::jsonb;
begin
  select * into r from public.rooms where id=room_key;
  select * into p from gm18_api_private.policy where singleton;
  ctx:=coalesce(trusted_context,jsonb_build_object('anchorId',r.anchor_id::text,'radiusM',r.radius_m,'desiredAt',r.desired_at,
    'serviceMode',r.service_mode,'mealSlot',r.meal_slot,'timeHint',r.time_hint,
    'budget',case when r.budget is null then null else to_jsonb((r.budget->>'max')::numeric) end,'avoidRecent',r.avoid_recent));
  select coalesce(jsonb_object_agg(m.user_id::text,jsonb_strip_nulls(jsonb_build_object(
    'cuisineIds',coalesce(pr.cuisine_ids,'{}'::uuid[]),'categoryIds',coalesce(pr.category_ids,'{}'::uuid[]),
    'temperature',pr.temperature,'flavor',pr.flavor))),'{}'::jsonb) into prefs
    from public.members m left join public.preferences pr on pr.room_id=m.room_id and pr.user_id=m.user_id
    where m.room_id=room_key and m.left_at is null;
  bundle:=gm18_api_private.read_snapshot();
  seed:=md5((ctx-'budget'-'avoidRecent')::text||(bundle->>'datasetVersion')||p.policy_version);
  evaluated:=gm18_private.evaluate(bundle,jsonb_build_object('context',ctx,'poolSeed',seed,
    'preferencesByParticipant',prefs,'recentDishIds',to_jsonb(trusted_recent_dish_ids)),statement_timestamp(),
    jsonb_build_object('maxRadiusM',p.max_radius_m,'maxFutureSeconds',p.max_future_seconds,'fixtureMode',false));
  if jsonb_array_length(evaluated->'pool')=0 then
    reasons:=case when evaluated->'reasonCodes' ? 'OUT_OF_COVERAGE' then '["OUT_OF_COVERAGE"]'::jsonb
      when jsonb_array_length(evaluated->'needsConfirmationOfferings')>0 then '["AVAILABILITY_UNKNOWN"]'::jsonb
      else '["NO_ELIGIBLE_FOOD"]'::jsonb end;
  end if;
  return jsonb_build_object('pool',gm18_api_private.project_pool(evaluated->'pool',bundle,(ctx->>'desiredAt')::timestamptz),
    'datasetVersion',bundle->>'datasetVersion','eligibilityVersion',evaluated->>'eligibilityVersion',
    'poolSeed',seed,'evaluatedAt',evaluated->'evaluatedAt','reasonCodes',reasons);
end $$;

create function gm19_private.apply_lobby_pool(room_key uuid, data jsonb) returns boolean
language plpgsql security definer set search_path = pg_catalog as $$
declare r public.rooms%rowtype; stored jsonb; fresh jsonb;
begin
  select * into r from public.rooms where id=room_key for update;
  if r.state<>'LOBBY' then return false; end if;
  select coalesce(jsonb_agg(ps.projection-'roundDishId'-'choiceId' order by rd.ordinal),'[]'::jsonb) into stored
    from public.round_dishes rd join gm19_private.pool_snapshots ps on ps.round_dish_id=rd.id where rd.room_id=room_key and rd.round=1;
  select coalesce(jsonb_agg(value-'roundDishId'-'choiceId' order by ord),'[]'::jsonb) into fresh
    from jsonb_array_elements(data->'pool') with ordinality x(value,ord);
  if stored=fresh and data->>'datasetVersion'=r.dataset_version then return false; end if;
  perform gm19_private.persist_pool(room_key,data->'pool',r.pool_version+1,data->>'datasetVersion');
  update public.rooms set pool_version=pool_version+1,pool_seed=data->>'poolSeed',dataset_version=data->>'datasetVersion',
    eligibility_version=data->>'eligibilityVersion',version=version+1,updated_at=statement_timestamp() where id=room_key;
  update public.members set ready=false,version=version+1 where room_id=room_key and left_at is null;
  return true;
end $$;

create function gm19_private.refresh_lobby_pool(room_key uuid) returns boolean
language plpgsql security definer set search_path = pg_catalog as $$
begin
  return gm19_private.apply_lobby_pool(room_key,gm19_private.pool_for_room(room_key));
end $$;

create function public.create_room("requestId" text, display_name text, anchor_id text, radius_m jsonb,
  desired_at text, service_mode text, meal_slot text, time_hint text default null, budget jsonb default null,
  avoid_recent boolean default false) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid; request_key uuid; payload jsonb; payload_key text; ack jsonb; data jsonb; ctx jsonb;
  room_key uuid := gen_random_uuid(); room_code text; coverage uuid; target_at timestamptz; budget_value jsonb; anchor_value uuid; radius_value numeric;
  dataset text; eligibility text; seed text; version_key bigint := 1; pool jsonb; normalized jsonb; member_key uuid := gen_random_uuid();
  consent_key uuid := gen_random_uuid(); existing integer;
begin
  caller := gm19_private.require_auth();
  begin request_key := gm19_private.request_uuid("requestId"); target_at := desired_at::timestamptz; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload := jsonb_build_object('displayName',display_name,'anchorId',anchor_id,'radiusM',radius_m,'desiredAt',desired_at,
    'serviceMode',service_mode,'mealSlot',meal_slot,'timeHint',time_hint,'budget',budget,'avoidRecent',avoid_recent);
  payload_key := gm19_private.hash_payload(payload); ack := gm19_private.ack_lookup('create_room',request_key,payload_key);
  if ack->>'kind' <> 'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('create_room',10) then return gm19_private.error('RATE_LIMITED',429,null,request_key); end if;
  if display_name is null or length(display_name)<1 or length(display_name)>24 or display_name~'[[:cntrl:]]'
     or anchor_id is null or anchor_id !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
     or radius_m is null or jsonb_typeof(radius_m)<>'number' or (radius_m#>>'{}')::numeric<=0 or target_at is null
     or service_mode is null or service_mode not in ('dine_in','takeaway','delivery') or meal_slot is null or meal_slot not in ('breakfast','lunch','dinner','snack')
     or (time_hint is not null and time_hint<>'late_night') then return gm19_private.error('INVALID_INPUT',400,null,request_key); end if;
  if target_at<=statement_timestamp() then return gm19_private.error('DESIRED_TIME_PASSED',400,null,request_key); end if;
  if (radius_m#>>'{}')::numeric > 10000 or target_at>statement_timestamp()+interval '7 days' then return gm19_private.error('INVALID_INPUT',400,null,request_key); end if;
  anchor_value:=anchor_id::uuid; radius_value:=(radius_m#>>'{}')::numeric;
  select pa.coverage_id into coverage from public.public_anchors pa
    where pa.anchor_id=anchor_value and pa.is_public and pa.review_status='published' and not pa.fixture_only;
  if coverage is null then return gm19_private.error('OUT_OF_COVERAGE',400,null,request_key); end if;
  if budget is null or budget='null'::jsonb then budget_value:=null;
  elsif jsonb_typeof(budget)='number' and (budget#>>'{}')::numeric>=0 then
    budget_value:=jsonb_build_object('min',null,'max',(budget#>>'{}')::numeric,'currency','VND','unit','person');
  else return gm19_private.error('INVALID_INPUT',400,null,request_key); end if;
  ctx := gm19_private.context_json(anchor_id,radius_m,desired_at,service_mode,meal_slot,time_hint,budget_value,avoid_recent);
  data := gm19_private.pool_for_room(room_key,'{}',ctx||jsonb_build_object('budget',case when budget_value is null then null else budget_value->'max' end));
  pool := coalesce(data->'pool','[]'::jsonb); seed:=coalesce(data->>'poolSeed',md5(ctx::text));
  dataset:=case when coalesce(data->>'datasetVersion','')~'^[0-9]+\.[0-9]+\.[0-9]+$' then data->>'datasetVersion' else '0.0.0' end;
  eligibility:=coalesce(nullif(data->>'eligibilityVersion',''),'gm18-api-1.0.0');
  for existing in 1..20 loop
    room_code:=gm19_private.code();
    exit when not exists(select 1 from public.rooms where rooms.code=room_code);
  end loop;
  if exists(select 1 from public.rooms where rooms.code=room_code) then return gm19_private.error('ROOM_CODE_UNAVAILABLE',409,null,request_key); end if;
  insert into public.rooms(id,code,host_user_id,state,created_at,updated_at,expires_at,meal_slot,time_hint,budget,avoid_recent,
    anchor_id,coverage_id,radius_m,desired_at,timezone,service_mode,catalogue_version,dataset_version,eligibility_version,
    context_version,pool_version,policy_version,pool_seed,roster_user_ids,consent_snapshot,evaluated_at,locked_at,version,anchor_display_name)
  values(room_key,room_code,caller,'LOBBY',statement_timestamp(),statement_timestamp(),statement_timestamp()+interval '60 minutes',
    meal_slot,time_hint,budget_value,avoid_recent,anchor_value,coverage,radius_value,target_at,'UTC',service_mode,
    '0.0.0',dataset,eligibility,1,1,'decision-v2',seed,array[caller],jsonb_build_array(jsonb_build_object('userId',caller,'historyConsent',false)),
    null,null,version_key,(select pa.name from public.public_anchors pa where pa.anchor_id=anchor_value));
  insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
    values(member_key,room_key,caller,display_name,false,false,statement_timestamp(),null,1);
  insert into public.preferences(id,room_id,user_id,cuisine_ids,category_ids,temperature,flavor,updated_at,version)
    values(gen_random_uuid(),room_key,caller,'{}','{}',null,null,statement_timestamp(),1);
  insert into public.consents(id,user_id,room_id,scope,enabled,granted_at,revoked_at,expires_at,version)
    values(consent_key,caller,room_key,'personal_history',false,null,null,statement_timestamp()+interval '30 days',1);
  normalized:=gm19_private.persist_pool(room_key,pool,1,dataset);
  ctx:=jsonb_set(ctx,'{anchorName}',coalesce((select to_jsonb(pa.name) from public.public_anchors pa where pa.anchor_id=anchor_value),'""'::jsonb),true);
  data:=jsonb_build_object('roomId',room_key::text,'code',room_code,'version',1,'expiresAt',(statement_timestamp()+interval '60 minutes'));
  data:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',room_key,'version',1,'state','LOBBY','data',data);
  perform gm19_private.save_ack('create_room',request_key,payload_key,room_key,null,null,1,data);
  return data;
end $$;

create function public.join_room("requestId" text, code text, display_name text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid; request_key uuid; payload jsonb; payload_key text; ack jsonb; r public.rooms%rowtype; m public.members%rowtype;
  room_key uuid; version_key bigint; member_key uuid; active_count integer; member_found boolean;
begin
  caller:=gm19_private.require_auth();
  begin request_key:=gm19_private.request_uuid("requestId"); exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('code',code,'displayName',display_name); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('join_room',request_key,payload_key);
  if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('join_room',30) then return gm19_private.error('RATE_LIMITED',429,null,request_key); end if;
  if code is null or code !~ '^[A-HJ-NP-Z2-9]{6}$' or display_name is null or length(display_name)<1 or length(display_name)>24 then return gm19_private.error('INVALID_INPUT',400,null,request_key); end if;
  update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
  select * into r from public.rooms where rooms.code=join_room.code for update;
  if not found then return gm19_private.error('ROOM_NOT_FOUND',404,null,request_key); end if;
  if r.expires_at<=statement_timestamp() then return gm19_private.error('ROOM_EXPIRED',410,r.id,request_key); end if;
  if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,r.id,request_key); end if;
  select * into m from public.members where room_id=r.id and user_id=caller;
  member_found:=found;
  if member_found and m.left_at is null then
    room_key:=r.id; version_key:=r.version; member_key:=m.id;
  else
    select count(*) into active_count from public.members where room_id=r.id and left_at is null;
    if active_count>=8 then return gm19_private.error('ROOM_FULL',409,r.id,request_key); end if;
     if member_found then update public.members set nickname=display_name,ready=false,left_at=null,version=version+1 where id=m.id returning id into member_key;
    else member_key:=gen_random_uuid(); insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
      values(member_key,r.id,caller,display_name,false,false,statement_timestamp(),null,1); end if;
    update public.rooms set roster_user_ids=array_append(array_remove(roster_user_ids,caller),caller),version=version+1,updated_at=statement_timestamp() where id=r.id returning version into version_key;
    room_key:=r.id;
  end if;
  insert into public.preferences(id,room_id,user_id,cuisine_ids,category_ids,temperature,flavor,updated_at,version)
    values(gen_random_uuid(),r.id,caller,'{}','{}',null,null,statement_timestamp(),1)
    on conflict (room_id,user_id) do nothing;
  perform gm19_private.refresh_lobby_pool(room_key);
  select version into version_key from public.rooms where id=room_key;
  payload:=jsonb_build_object('roomId',room_key::text,'code',r.code,'version',version_key,'memberId',member_key::text);
  payload:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',room_key,'version',version_key,'state','LOBBY','data',payload);
  perform gm19_private.save_ack('join_room',request_key,payload_key,room_key,null,null,version_key,payload); return payload;
end $$;

create function public.get_room_snapshot(room_id text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); rid uuid; r public.rooms%rowtype; member_data jsonb; pool_data jsonb; pref_data jsonb; votes_data jsonb; submission_data jsonb; result_data jsonb;
begin
  begin rid:=room_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  if not exists(select 1 from public.members where public.members.room_id=rid and user_id=caller and left_at is null) then return gm19_private.error('NOT_MEMBER',403); end if;
  select * into r from public.rooms where id=rid; if not found then return gm19_private.error('NOT_MEMBER',403); end if;
  if r.expires_at<=statement_timestamp() then return gm19_private.error('ROOM_EXPIRED',410,rid); end if;
  if not gm19_private.allow_call('get_room_snapshot',60) then return gm19_private.error('RATE_LIMITED',429,rid); end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'displayName',m.nickname,'isHost',m.user_id=r.host_user_id,
      'ready',m.ready,'joinedAt',m.joined_at,'hasSubmitted',exists(select 1 from public.submissions s where s.member_id=m.id and s.round=case when r.state='ROUND_2' then 2 else 1 end))), '[]')
    into member_data from public.members m where m.room_id=rid and m.left_at is null;
  select coalesce(jsonb_agg(ps.projection order by rd.ordinal),'[]') into pool_data
    from public.round_dishes rd join gm19_private.pool_snapshots ps on ps.round_dish_id=rd.id
    where rd.room_id=rid and rd.round=case when r.state='ROUND_2' then 2 else 1 end;
  select jsonb_strip_nulls(jsonb_build_object('cuisineIds',p.cuisine_ids,'categoryIds',p.category_ids,'temperature',p.temperature,'flavor',p.flavor,'historyConsent',m.history_consent))
    into pref_data from public.preferences p join public.members m on m.room_id=p.room_id and m.user_id=p.user_id where p.room_id=rid and p.user_id=caller and m.left_at is null;
  select coalesce(jsonb_object_agg(v.round_dish_id::text,v.value),'{}') into votes_data from public.votes v join public.submissions s on s.id=v.submission_id join public.members m on m.id=s.member_id where s.room_id=rid and m.user_id=caller;
  select case when s.id is null then null else jsonb_build_object('round',s.round,'intentId',s.intent_id::text,'requestId',s.request_id::text,'submittedAt',s.accepted_at,'voteCount',(select count(*) from public.votes vv where vv.submission_id=s.id)) end into submission_data from public.submissions s join public.members m on m.id=s.member_id where s.room_id=rid and m.user_id=caller order by s.accepted_at desc limit 1;
  result_data:=null;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',r.id::text,'code',r.code,'state',r.state,'version',r.version,'hostUserId',r.host_user_id::text,
    'context',jsonb_strip_nulls(jsonb_build_object('anchorId',r.anchor_id::text,'anchorName',r.anchor_display_name,'radiusM',r.radius_m,'desiredAt',r.desired_at,
     'serviceMode',r.service_mode,'mealSlot',r.meal_slot,'timeHint',r.time_hint,'budget',case when r.budget is null then null else to_jsonb((r.budget->>'max')::numeric) end,'avoidRecent',r.avoid_recent)),
    'members',member_data,'ownPreferences',pref_data,'round',case when r.state='ROUND_2' then 2 else 1 end,'poolVersion',r.pool_version,'pool',pool_data,'ownVotes',votes_data,'ownSubmission',submission_data,
    'datasetVersion',r.dataset_version,'eligibilityVersion',r.eligibility_version,'evaluatedAt',r.evaluated_at,'result',result_data,'expiresAt',r.expires_at));
end $$;

create function public.update_preferences("requestId" text, room_id text, expected_version bigint, cuisine_ids uuid[], category_ids uuid[], temperature text default null, flavor jsonb default null, history_consent boolean default false) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; rid uuid; r public.rooms%rowtype; payload jsonb; payload_key text; ack jsonb; new_version bigint;
  cuisine_value uuid[]; category_value uuid[]; temperature_value text; flavor_value jsonb; history_value boolean;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); rid:=room_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('roomId',rid,'expectedVersion',expected_version,'cuisineIds',cuisine_ids,'categoryIds',category_ids,'temperature',temperature,'flavor',flavor,'historyConsent',history_consent); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('update_preferences',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,rid,request_key); end if;
  if not gm19_private.allow_call('update_preferences',60) then return gm19_private.error('RATE_LIMITED',429,rid,request_key); end if;
  ack:=gm19_private.room_guard(rid,expected_version,false); if ack is not null then return ack; end if; select * into r from public.rooms where id=rid for update; if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,rid,request_key); end if;
  cuisine_value:=cuisine_ids; category_value:=category_ids; temperature_value:=temperature; flavor_value:=flavor; history_value:=history_consent;
  if cuisine_value is null or category_value is null or history_value is null
    or not gm18_api_private.taxonomy_ids_valid(to_jsonb(cuisine_value),'cuisine')
    or not gm18_api_private.taxonomy_ids_valid(to_jsonb(category_value),'category')
    or (temperature_value is not null and temperature_value not in ('hot','warm','cold','ambient','unknown'))
    or not gm06_private.flavor_valid(flavor_value)
    or not exists(select 1 from public.members m where m.room_id=rid and m.user_id=caller and m.left_at is null) then return gm19_private.error('INVALID_INPUT',400,rid,request_key); end if;
  update public.preferences p set cuisine_ids=cuisine_value,category_ids=category_value,temperature=temperature_value,flavor=flavor_value,updated_at=statement_timestamp(),version=p.version+1 where p.room_id=rid and p.user_id=caller;
  update public.members m set ready=false,history_consent=history_value,version=m.version+1 where m.room_id=rid and m.user_id=caller and m.left_at is null;
  perform gm19_private.refresh_lobby_pool(rid);
  update public.rooms set version=version+1,updated_at=statement_timestamp() where id=rid returning version into new_version;
  payload:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',rid,'version',new_version,'state','LOBBY','data',null);
  perform gm19_private.save_ack('update_preferences',request_key,payload_key,rid,null,expected_version,new_version,payload); return payload;
end $$;

create function public.update_context("requestId" text, room_id text, expected_version bigint, anchor_id text, radius_m jsonb, desired_at text, service_mode text, meal_slot text, time_hint text default null, budget jsonb default null, avoid_recent boolean default false) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; rid uuid; r public.rooms%rowtype; payload jsonb; payload_key text; ack jsonb; data jsonb; target_at timestamptz; coverage uuid; budget_value jsonb; normalized jsonb; new_version bigint; dataset text; eligibility text; seed text;
  anchor_value uuid; radius_value numeric; desired_value text; mode_value text; meal_value text; hint_value text; budget_input jsonb; avoid_value boolean;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); rid:=room_id::uuid; target_at:=desired_at::timestamptz; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('roomId',rid,'expectedVersion',expected_version,'anchorId',anchor_id,'radiusM',radius_m,'desiredAt',desired_at,'serviceMode',service_mode,'mealSlot',meal_slot,'timeHint',time_hint,'budget',budget,'avoidRecent',avoid_recent); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('update_context',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,rid,request_key); end if;
  if not gm19_private.allow_call('update_context',60) then return gm19_private.error('RATE_LIMITED',429,rid,request_key); end if;
  ack:=gm19_private.room_guard(rid,expected_version,true); if ack is not null then return ack; end if; select * into r from public.rooms where id=rid for update; if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,rid,request_key); end if;
  if anchor_id is null or anchor_id !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
     or radius_m is null or jsonb_typeof(radius_m)<>'number' or target_at is null
     or service_mode is null or service_mode not in ('dine_in','takeaway','delivery')
     or meal_slot is null or meal_slot not in ('breakfast','lunch','dinner','snack')
     or (time_hint is not null and time_hint<>'late_night') then return gm19_private.error('INVALID_INPUT',400,rid,request_key); end if;
  anchor_value:=anchor_id::uuid; radius_value:=(radius_m#>>'{}')::numeric; desired_value:=desired_at; mode_value:=service_mode; meal_value:=meal_slot; hint_value:=time_hint; budget_input:=budget; avoid_value:=avoid_recent;
  select pa.coverage_id into coverage from public.public_anchors pa where pa.anchor_id=anchor_value and pa.is_public and pa.review_status='published' and not pa.fixture_only; if coverage is null then return gm19_private.error('OUT_OF_COVERAGE',400,rid,request_key); end if;
  if target_at<=statement_timestamp() then return gm19_private.error('DESIRED_TIME_PASSED',400,rid,request_key); end if;
  if radius_value<=0 or radius_value>10000 or target_at>statement_timestamp()+interval '7 days' then return gm19_private.error('INVALID_INPUT',400,rid,request_key); end if;
  if budget_input is null or budget_input='null'::jsonb then budget_value:=null; elsif jsonb_typeof(budget_input)='number' and (budget_input#>>'{}')::numeric>=0 then budget_value:=jsonb_build_object('min',null,'max',(budget_input#>>'{}')::numeric,'currency','VND','unit','person'); else return gm19_private.error('INVALID_INPUT',400,rid,request_key); end if;
  data:=gm19_private.pool_for_room(rid,'{}',gm19_private.context_json(anchor_value::text,to_jsonb(radius_value),desired_value,mode_value,meal_value,hint_value,budget_input,avoid_value)); seed:=coalesce(data->>'poolSeed',md5(payload::text)); dataset:=case when coalesce(data->>'datasetVersion','')~'^[0-9]+\.[0-9]+\.[0-9]+$' then data->>'datasetVersion' else '0.0.0' end; eligibility:=coalesce(nullif(data->>'eligibilityVersion',''),'gm18-api-1.0.0');
  normalized:=gm19_private.persist_pool(rid,coalesce(data->'pool','[]'::jsonb),r.pool_version+1,dataset);
  update public.rooms rm set anchor_id=anchor_value,anchor_display_name=(select pa.name from public.public_anchors pa where pa.anchor_id=anchor_value),coverage_id=coverage,radius_m=radius_value,desired_at=target_at,service_mode=mode_value,meal_slot=meal_value,time_hint=hint_value,budget=budget_value,avoid_recent=avoid_value,context_version=rm.context_version+1,pool_version=rm.pool_version+1,pool_seed=seed,dataset_version=dataset,eligibility_version=eligibility,evaluated_at=null,version=rm.version+1,updated_at=statement_timestamp() where rm.id=rid returning rm.version into new_version;
  update public.members m set ready=false,version=m.version+1 where m.room_id=rid and m.left_at is null;
  perform gm19_private.refresh_lobby_pool(rid);
  select version into new_version from public.rooms where id=rid;
  payload:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',rid,'version',new_version,'state','LOBBY','data',null); perform gm19_private.save_ack('update_context',request_key,payload_key,rid,null,expected_version,new_version,payload); return payload;
end $$;

create function public.set_ready("requestId" text, room_id text, expected_version bigint, ready boolean) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; rid uuid; payload jsonb; payload_key text; ack jsonb; new_version bigint; r public.rooms%rowtype; ready_value boolean;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); rid:=room_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('roomId',rid,'expectedVersion',expected_version,'ready',ready); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('set_ready',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,rid,request_key); end if;
  if not gm19_private.allow_call('set_ready',60) then return gm19_private.error('RATE_LIMITED',429,rid,request_key); end if;
  if ready is null then return gm19_private.error('INVALID_INPUT',400,rid,request_key); end if;
  ack:=gm19_private.room_guard(rid,expected_version,false); if ack is not null then return ack; end if; select * into r from public.rooms where id=rid for update; if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,rid,request_key); end if;
  ready_value:=ready; update public.members m set ready=ready_value,version=m.version+1 where m.room_id=rid and m.user_id=caller and m.left_at is null;
  update public.rooms set version=version+1,updated_at=statement_timestamp() where id=rid returning version into new_version;
  payload:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',rid,'version',new_version,'state','LOBBY','data',null); perform gm19_private.save_ack('set_ready',request_key,payload_key,rid,null,expected_version,new_version,payload); return payload;
end $$;

create function public.start_round("requestId" text, room_id text, expected_version bigint) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; rid uuid; payload jsonb; payload_key text; ack jsonb; r public.rooms%rowtype; data jsonb; active_count integer; not_ready integer; new_version bigint; roster uuid[]; consent jsonb; target_at text;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); rid:=room_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('roomId',rid,'expectedVersion',expected_version); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('start_room',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,rid,request_key); end if;
  if not gm19_private.allow_call('start_room',60) then return gm19_private.error('RATE_LIMITED',429,rid,request_key); end if;
  ack:=gm19_private.room_guard(rid,expected_version,true); if ack is not null then return ack; end if; select * into r from public.rooms where id=rid for update; if r.state<>'LOBBY' then return gm19_private.error('INVALID_ROOM_STATE',409,rid,request_key); end if;
  select count(*) into active_count from public.members m where m.room_id=rid and m.left_at is null; select count(*) into not_ready from public.members m where m.room_id=rid and m.left_at is null and not m.ready; if active_count<2 or not_ready>0 then return gm19_private.error('NOT_READY',409,rid,request_key); end if;
  if r.desired_at<=statement_timestamp() then
    update public.members set ready=false,version=version+1 where public.members.room_id=rid and left_at is null;
    update public.rooms set version=version+1,updated_at=statement_timestamp() where id=rid;
    return gm19_private.error('DESIRED_TIME_PASSED',400,rid,request_key);
  end if;
  target_at:=to_char(r.desired_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  data:=gm19_private.pool_for_room(rid);
  if gm19_private.apply_lobby_pool(rid,data) then
    if jsonb_array_length(coalesce(data->'pool','[]'::jsonb))=0 then
      return gm19_private.error('NO_ELIGIBLE_FOOD',409,rid,request_key);
    end if;
    return gm19_private.error('CONTEXT_CHANGED',409,rid,request_key);
  end if;
  if jsonb_array_length(coalesce(data->'pool','[]'::jsonb))=0 then
    return gm19_private.error('NO_ELIGIBLE_FOOD',409,rid,request_key);
  end if;
  select coalesce(array_agg(m.user_id order by m.joined_at),'{}') into roster from public.members m where m.room_id=rid and m.left_at is null;
  select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'historyConsent',m.history_consent) order by m.joined_at),'[]') into consent from public.members m where m.room_id=rid and m.left_at is null;
  update public.rooms set state='ROUND_1',locked_at=statement_timestamp(),evaluated_at=coalesce((data->>'evaluatedAt')::timestamptz,statement_timestamp()),dataset_version=case when data->>'datasetVersion'~'^[0-9]+\.[0-9]+\.[0-9]+$' then data->>'datasetVersion' else dataset_version end,eligibility_version=coalesce(data->>'eligibilityVersion',eligibility_version),roster_user_ids=roster,consent_snapshot=consent,version=version+1,updated_at=statement_timestamp() where id=rid returning version into new_version;
  payload:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',rid,'version',new_version,'state','ROUND_1','data',null); perform gm19_private.save_ack('start_room',request_key,payload_key,rid,null,expected_version,new_version,payload); return payload;
end $$;

create function public.leave_room("requestId" text, room_id text, expected_version bigint) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; rid uuid; payload jsonb; payload_key text; ack jsonb; r public.rooms%rowtype; new_version bigint; state_value text;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); rid:=room_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('roomId',rid,'expectedVersion',expected_version); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('leave_room',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,rid,request_key); end if;
  if not gm19_private.allow_call('leave_room',60) then return gm19_private.error('RATE_LIMITED',429,rid,request_key); end if;
  ack:=gm19_private.room_guard(rid,expected_version,false); if ack is not null then return ack; end if; select * into r from public.rooms where id=rid for update; if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,rid,request_key); end if;
  if r.host_user_id=caller then update public.rooms set state='CANCELLED',version=version+1,updated_at=statement_timestamp() where id=rid returning version,state into new_version,state_value; else update public.members m set left_at=statement_timestamp(),ready=false,version=m.version+1 where m.room_id=rid and m.user_id=caller and m.left_at is null; update public.rooms set roster_user_ids=array_remove(roster_user_ids,caller),version=version+1,updated_at=statement_timestamp() where id=rid returning version,state into new_version,state_value; end if;
  perform gm19_private.refresh_lobby_pool(rid);
  select version into new_version from public.rooms where id=rid;
  payload:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',rid,'version',new_version,'state',state_value,'data',null); perform gm19_private.save_ack('leave_room',request_key,payload_key,rid,null,expected_version,new_version,payload); return payload;
end $$;

create function public.cancel_room("requestId" text, room_id text, expected_version bigint, confirm_cancel boolean) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; rid uuid; payload jsonb; payload_key text; ack jsonb; r public.rooms%rowtype; new_version bigint;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); rid:=room_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('roomId',rid,'expectedVersion',expected_version,'confirmCancel',confirm_cancel); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('cancel_room',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,rid,request_key); end if;
  if not gm19_private.allow_call('cancel_room',60) then return gm19_private.error('RATE_LIMITED',429,rid,request_key); end if;
  if confirm_cancel is null then return gm19_private.error('INVALID_INPUT',400,rid,request_key); end if;
  ack:=gm19_private.room_guard(rid,expected_version,false); if ack is not null then return ack; end if; select * into r from public.rooms where id=rid for update;
  if r.state='LOBBY' and r.host_user_id<>caller then return gm19_private.error('NOT_HOST',403,rid,request_key); end if;
  if r.state not in ('LOBBY','ROUND_1','ROUND_2') then return gm19_private.error('ROOM_TERMINAL',409,rid,request_key); end if;
  if r.state<>'LOBBY' and not confirm_cancel then return gm19_private.error('INVALID_INPUT',400,rid,request_key); end if;
  update public.rooms set state='CANCELLED',version=version+1,updated_at=statement_timestamp() where id=rid returning version into new_version;
  payload:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',rid,'version',new_version,'state','CANCELLED','data',null); perform gm19_private.save_ack('cancel_room',request_key,payload_key,rid,null,expected_version,new_version,payload); return payload;
end $$;

revoke all on function public.create_room(text,text,text,jsonb,text,text,text,text,jsonb,boolean),public.join_room(text,text,text),public.get_room_snapshot(text),
  public.update_preferences(text,text,bigint,uuid[],uuid[],text,jsonb,boolean),public.update_context(text,text,bigint,text,jsonb,text,text,text,text,jsonb,boolean),
  public.set_ready(text,text,bigint,boolean),public.start_round(text,text,bigint),public.leave_room(text,text,bigint),public.cancel_room(text,text,bigint,boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.create_room(text,text,text,jsonb,text,text,text,text,jsonb,boolean),public.join_room(text,text,text),public.get_room_snapshot(text),
  public.update_preferences(text,text,bigint,uuid[],uuid[],text,jsonb,boolean),public.update_context(text,text,bigint,text,jsonb,text,text,text,text,jsonb,boolean),
  public.set_ready(text,text,bigint,boolean),public.start_round(text,text,bigint),public.leave_room(text,text,bigint),public.cancel_room(text,text,bigint,boolean) to authenticated;
revoke execute on all functions in schema gm19_private from public, anon, authenticated, service_role;
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.3.0','food-v1/roadmap-v2/GM-19.1','1.1.0','1.1.0','GM-17 4a38588f + GM-18 a33d5e8')
on conflict (schema_version) do nothing;
commit;
