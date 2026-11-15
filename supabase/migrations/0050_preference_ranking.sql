-- Preference filters (ADR-024), canonical B-supplement runtime only.
-- 1. dishCount accepts 5..20: a shortage can shrink the vote ("Dùng N món"); the client stepper still offers 10..20.
-- 2. Soft preference ranking: when the host starts, round 1 is drawn again from the pinned catalogue, ranking dishes
--    by how many members' preferences they match (dish groups, region, flavours). Equal weight per member, no host
--    priority, separate from WANT/OK/NO; ties and unmatched dishes keep the seeded order. Missing dish data matches
--    nothing, it is never guessed.
-- 3. Canonical pool cards carry `origin` (north/central/south/west or null); the baseline B card is unchanged.
--    The canonical create/updateSettings draw uses ranked_pool with no preferences (same dishes and order as pool_for).
-- Additive: earlier migrations stay immutable. gm20 dispatch, evaluate_v4, canonical_card and gm06 valid_terminal are
-- copies of their latest definitions with only the changes above; card_v4s, region_origin, preference_match and
-- ranked_pool are new. Tests: supabase/tests/database/ADR-024_preference_ranking.test.sql.
begin;

alter table dish_v4_private.sessions drop constraint sessions_requested_count_check;
alter table dish_v4_private.sessions add constraint sessions_requested_count_check check (requested_count between 5 and 20);
alter table dish_v4_private.sessions drop constraint sessions_initial_pool_check;
alter table dish_v4_private.sessions add constraint sessions_initial_pool_check check (jsonb_typeof(initial_pool)='array' and jsonb_array_length(initial_pool) between 5 and 20);

-- Canonical B-supplement card: the shared card() plus `origin`. The baseline B runtime keeps card() as it was.
create or replace function dish_v4_private.card_v4s(source jsonb) returns jsonb
language sql immutable set search_path=pg_catalog as $$
 select dish_v4_private.card(source)||jsonb_build_object('origin',
  case when source->>'origin' in('north','central','south','west') then source->'origin' else 'null'::jsonb end)
$$;

-- Region choices of the preferences screen (stable UUIDs) -> catalogue `origin`.
create or replace function dish_v4_private.region_origin(region text) returns text
language sql immutable set search_path=pg_catalog as $$
 select case region
  when 'f3e57f22-1cc1-51c8-ad0d-5448436e2f85' then 'north'
  when '4591467d-959b-5115-b259-1af70b3f3e4b' then 'central'
  when '1b39960d-75f8-593d-bf40-7eb541d2f313' then 'south'
  when 'a739129b-1f51-5ba8-a53f-4c5d66455f68' then 'west' end
$$;

-- How many preference dimensions of one member a card matches (0..7). Unknown dish data matches nothing.
create or replace function dish_v4_private.preference_match(card jsonb, pref jsonb) returns integer
language sql immutable set search_path=pg_catalog as $$
 select
  -- dish group: any shared category id (group ids include their linked families); Béo/Ngậy is a flavour, see below
  (case when exists(select 1 from jsonb_array_elements_text(coalesce(card->'categoryIds','[]')) c
     join jsonb_array_elements_text(coalesce(pref->'categoryIds','[]')) p on p=c
     where c<>'86089932-3503-5934-a401-60374d76a61d') then 1 else 0 end)
  -- region: a chosen region equals the dish origin
  + (case when card->>'origin' in('north','central','south','west') and exists(select 1 from jsonb_array_elements_text(coalesce(pref->'cuisineIds','[]')) p
     where dish_v4_private.region_origin(p)=card->>'origin') then 1 else 0 end)
  -- Cay, Chua / Chua cay, Ngọt: wanted and present
  + (select count(*)::integer from unnest(array['spicy','sour','sweet']) k
     where pref->'flavor'->k->>'present'='true' and card->'flavor'->k->>'present'='true')
  -- Mặn / Đậm đà (salty high) and Thanh đạm (salty low)
  + (case when pref->'flavor'->'salty'->>'present'='true' and card->'flavor'->'salty'->>'present'='true'
      and ((pref->'flavor'->'salty'->>'intensity'='high' and card->'flavor'->'salty'->>'intensity' in('medium','high'))
        or (pref->'flavor'->'salty'->>'intensity'='low' and card->'flavor'->'salty'->>'intensity'='low')) then 1 else 0 end)
  -- Béo / Ngậy: tag id in both
  + (case when coalesce(pref->'categoryIds','[]') ? '86089932-3503-5934-a401-60374d76a61d'
      and coalesce(card->'categoryIds','[]') ? '86089932-3503-5934-a401-60374d76a61d' then 1 else 0 end)
$$;

-- Same draw as pool_for (meal filter, seeded order, count), but the dishes matching more preferences are the ones
-- drawn. The pool itself keeps the seeded order, so favourites are not all at the front of the deck.
create or replace function dish_v4_private.ranked_pool(catalogue jsonb, requested integer, meal text, seed text, prefs jsonb) returns jsonb
language sql set search_path=pg_catalog,extensions as $$
 select coalesce(jsonb_agg(jsonb_set(dish_v4_private.card_v4s(x.card),'{roundDishId}',to_jsonb(gen_random_uuid()::text),true) order by x.order_key),'[]'::jsonb)
 from (select d.value card,
         (select coalesce(sum(dish_v4_private.preference_match(d.value,p.value)),0) from jsonb_array_elements(coalesce(prefs,'[]')) p) score,
         encode(extensions.digest(convert_to(seed||':'||(d.value->>'dishId'),'UTF8'),'sha256'),'hex') order_key
       from jsonb_array_elements(catalogue) d where d.value->'mealSlots' ? meal
       order by score desc,order_key,d.value->>'dishId' collate "C" limit requested) x
$$;

create or replace function gm20_canonical_private.dispatch(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid; room_key uuid; r public.rooms%rowtype; s dish_v4_private.sessions%rowtype; c dish_v3_private.catalogues%rowtype;
 request_key text; signature text; old_ack gm20_canonical_private.request_acks%rowtype; answer jsonb; keys text[]; name_value text; room_code text; seed_value text;
 count_value integer; available integer; meal text; desired timestamptz; pref jsonb; consent_value boolean; pool_value jsonb; pool_changed boolean;
 ballot_value jsonb; active_pool jsonb; actual_round integer; pool_version_value bigint; expected bigint; current_revision bigint;
 accepted integer; roster_count integer; result_key uuid; history_key uuid; history_rows jsonb;
 mutating boolean; status_value integer:=400;
begin
 caller:=gm19_private.require_auth();
 if jsonb_typeof(payload) is distinct from 'object' or payload->>'contractVersion'<>'dish-session-v4/roadmap-v2/GM-07.B-supplement' then return dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION'); end if;
 if command not in('create','previewJoin','join','snapshot','updateSettings','updatePreferences','getDefaultPreferences','updateDefaultPreferences','start','submit','waiting','finalize','cancel','leave','result','history','deleteHistory') then return dish_v4_private.fail('INVALID_INPUT'); end if;
 keys:=case command
  when 'create' then array['contractVersion','requestId','displayName','settings','preferences']
  when 'previewJoin' then array['contractVersion','requestId','code']
  when 'join' then array['contractVersion','requestId','code','displayName']
  when 'snapshot' then array['contractVersion','roomId']
  when 'updateSettings' then array['contractVersion','requestId','roomId','expectedVersion','settings']
  when 'updatePreferences' then array['contractVersion','requestId','roomId','expectedVersion','preferences']
  when 'getDefaultPreferences' then array['contractVersion']
  when 'updateDefaultPreferences' then array['contractVersion','requestId','expectedRevision','preferences']
  when 'start' then array['contractVersion','requestId','roomId','expectedVersion']
  when 'submit' then array['contractVersion','requestId','roomId','expectedVersion','round','poolVersion','votes']
  when 'waiting' then array['contractVersion','requestId','roomId','expectedVersion','round','poolVersion']
  when 'finalize' then array['contractVersion','requestId','roomId','expectedVersion']
  when 'cancel' then array['contractVersion','requestId','roomId','expectedVersion']
  when 'leave' then array['contractVersion','requestId','roomId','expectedVersion']
  when 'result' then array['contractVersion','roomId']
  when 'history' then array['contractVersion']
  else array['contractVersion','requestId','historyId'] end;
 if exists(select 1 from jsonb_object_keys(payload) k where not k=any(keys)) then return dish_v4_private.fail('UNSUPPORTED_FIELD'); end if;
 if not gm19_private.allow_call('dish_v4_'||command,case when command in('snapshot','history','result','previewJoin') then 120 else 60 end) then return dish_v4_private.fail('RATE_LIMITED','{}',429); end if;
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 perform set_config('dish_v4.writer','on',true);
 mutating:=command not in('snapshot','result','history','previewJoin','getDefaultPreferences');
 if mutating then
  request_key:=payload->>'requestId';
  if jsonb_typeof(payload->'requestId') is distinct from 'string' or request_key is null or request_key !~ '^[A-Za-z0-9_-]{1,128}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  signature:=gm19_private.hash_payload(payload);
  select * into old_ack from gm20_canonical_private.request_acks a where a.user_id=caller and a.request_id=request_key;
  if found then
   if old_ack.payload_hash<>signature then return dish_v4_private.fail('REQUEST_ID_REUSED','{}',409); end if;
   return old_ack.response;
  end if;
 end if;

 if command='create' then
  if not(select allow_new_sessions from gm20_canonical_private.configuration where singleton) then return dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION'); end if;
  if not exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds') then return dish_v4_private.fail('WORKER_NOT_READY','{}',503); end if;
  if jsonb_typeof(payload->'settings') is distinct from 'object' or not(payload->'settings' ?& array['dishCount','mealSlot','desiredAt'])
    or jsonb_typeof(payload->'preferences') is distinct from 'object'
    or not dish_v4_private.valid_preferences(payload->'preferences') then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if jsonb_typeof(payload->'settings'->'dishCount') is distinct from 'number' or (payload->'settings'->>'dishCount')::numeric<>trunc((payload->'settings'->>'dishCount')::numeric) or (payload->'settings'->>'dishCount')::numeric not between 5 and 20 then return dish_v4_private.fail('INVALID_INPUT'); end if;
  count_value:=(payload->'settings'->>'dishCount')::numeric::integer; meal:=payload->'settings'->>'mealSlot'; name_value:=btrim(payload->>'displayName'); pref:=payload->'preferences';
  if exists(select 1 from jsonb_object_keys(payload->'settings') k where k not in('dishCount','mealSlot','desiredAt'))
    or meal is null or meal not in('breakfast','lunch','dinner','snack') or name_value is null or length(name_value) not between 1 and 24 or name_value~'[[:cntrl:]]' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  desired:=null;
  if payload->'settings' ? 'desiredAt' and jsonb_typeof(payload->'settings'->'desiredAt') not in('string','null') then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if payload->'settings'->>'desiredAt' is not null then begin desired:=(payload->'settings'->>'desiredAt')::timestamptz; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end; end if;
  select * into c from dish_v3_private.catalogues where active;
  if not found then return dish_v4_private.fail('CATALOGUE_NOT_READY','{}',503); end if;
  select count(*) into available from jsonb_array_elements(c.cards) d where d.value->'mealSlots' ? meal;
  if available<count_value then return dish_v4_private.fail('INSUFFICIENT_DISHES',jsonb_build_object('available',available,'requested',count_value),409); end if;
  room_key:=gen_random_uuid(); seed_value:=encode(extensions.gen_random_bytes(4),'hex');
  pool_value:=dish_v4_private.ranked_pool(c.cards,count_value,meal,seed_value,'[]'::jsonb);
  loop room_code:=gm19_private.code(); exit when not exists(select 1 from public.rooms where code=room_code); end loop;
  insert into public.rooms(id,code,host_user_id,state,created_at,updated_at,expires_at,meal_slot,time_hint,budget,avoid_recent,
   anchor_id,coverage_id,radius_m,desired_at,timezone,service_mode,catalogue_version,dataset_version,eligibility_version,context_version,pool_version,
   policy_version,pool_seed,roster_user_ids,consent_snapshot,version)
  values(room_key,room_code,caller,'LOBBY',clock_timestamp(),clock_timestamp(),clock_timestamp()+interval '60 minutes',meal,null,null,false,
   null,null,null,desired,'UTC',null,'1.0.0',null,'dish-only-v4',1,1,'dish-decision-v4',encode(extensions.gen_random_bytes(16),'hex'),array[caller],
   jsonb_build_array(jsonb_build_object('userId',caller,'historyConsent',false)),1);
  insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
   values(gen_random_uuid(),room_key,caller,name_value,false,false,clock_timestamp(),null,1);
  insert into dish_v4_private.sessions(room_id,contract_version,policy_version,catalogue_id,catalogue_sha,requested_count,meal_slot,desired_at,settings,initial_pool,pool_seed)
   values(room_key,'dish-session-v4/roadmap-v2/GM-07.B','dish-decision-v4/ADR-019-30PCT-MIN1',c.id,c.source_sha,count_value,meal,desired,payload->'settings',pool_value,seed_value);
  insert into gm20_canonical_private.sessions(room_id) values(room_key);
  insert into dish_v4_private.room_preferences(room_id,user_id,preferences,revision) values(room_key,caller,pref,1);
  answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',room_key::text,'code',room_code,'version',1,'expiresAt',(select expires_at from public.rooms where id=room_key)));
 elsif command='previewJoin' then
  if jsonb_typeof(payload->'requestId') is distinct from 'string' or payload->>'requestId' !~ '^[A-Za-z0-9_-]{1,128}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if payload->>'code' is null or payload->>'code' !~ '^[A-HJ-NP-Z2-9]{6}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  select room_ref.id into room_key from public.rooms room_ref where room_ref.code=payload->>'code' and room_ref.policy_version='dish-decision-v4' and exists(select 1 from gm20_canonical_private.sessions capability where capability.room_id=room_ref.id);
  if room_key is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
  select * into r from public.rooms where id=room_key;
  answer:=jsonb_build_object('ok',true,'data',jsonb_strip_nulls(jsonb_build_object('joinable',r.state='LOBBY' and r.expires_at>clock_timestamp() and (select count(*) from public.members where room_id=r.id and left_at is null)<20,
   'roomState',r.state,'memberCount',(select count(*) from public.members where room_id=r.id and left_at is null),'memberLimit',20,
   'mealSlot',r.meal_slot,'dishCount',(select requested_count from dish_v4_private.sessions where room_id=r.id),
   'reasonCode',case when r.expires_at<=clock_timestamp() or r.state='EXPIRED' then 'ROOM_EXPIRED'
     when r.state in('DECIDED','NO_CONSENSUS','CANCELLED') then 'ROOM_TERMINAL'
     when r.state<>'LOBBY' then 'ROOM_LOCKED'
     when (select count(*) from public.members where room_id=r.id and left_at is null)>=20 then 'ROOM_FULL' else null end)));
 elsif command='join' then
  if payload->>'code' is null or payload->>'code' !~ '^[A-HJ-NP-Z2-9]{6}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  select id into room_key from public.rooms where code=payload->>'code' and policy_version='dish-decision-v4' and exists(select 1 from gm20_canonical_private.sessions capability where capability.room_id=public.rooms.id);
  if room_key is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
  answer:=dish_v4_private.admit_member(room_key,caller,payload->>'displayName');
  elsif command='history' then
   select coalesce(jsonb_agg(jsonb_build_object('historyId',h.history_id::text,'roomId',z.room_ref_id::text,'resultId',z.result_id::text,
    'scope',h.scope,'createdAt',z.finalized_at,'expiresAt',h.expires_at,'finalizedAt',z.finalized_at,'desiredAt',z.planned_meal_at,
    'memberCount',z.member_count,'round1BallotCount',z.scored_r1_count,'result',gm20_canonical_private.result_projection(z.result_id)) order by z.finalized_at desc,h.history_id),'[]'::jsonb)
    into history_rows from gm06_canonical.histories h join gm06_canonical.results z using(result_id)
    where exists(select 1 from gm20_canonical_private.result_round_rows m where m.result_id=z.result_id)
     and gm06_canonical.history_visible(h.history_id,caller,clock_timestamp());
   answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('items',history_rows));
 elsif command='deleteHistory' then
  begin history_key:=(payload->>'historyId')::uuid; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end;
  delete from gm06_canonical.histories h where h.history_id=history_key and gm06_canonical.history_visible(h.history_id,caller,clock_timestamp())
   and exists(select 1 from gm20_canonical_private.result_round_rows m where m.result_id=h.result_id);
  answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true));
  elsif command='getDefaultPreferences' then
   select jsonb_build_object('revision',coalesce(p.revision,0),'preferences',coalesce(p.preferences,dish_v4_private.empty_preferences()))
    into answer from (select caller user_id) u left join dish_v4_private.default_preferences p on p.user_id=u.user_id;
   answer:=jsonb_build_object('ok',true,'data',answer);
 elsif command='updateDefaultPreferences' then
  if jsonb_typeof(payload->'expectedRevision') is distinct from 'number' or (payload->>'expectedRevision')::numeric<0 or trunc((payload->>'expectedRevision')::numeric)<>(payload->>'expectedRevision')::numeric or not dish_v4_private.valid_preferences(payload->'preferences') then return dish_v4_private.fail('INVALID_INPUT'); end if;
  expected:=(payload->>'expectedRevision')::bigint;
  select revision into current_revision from dish_v4_private.default_preferences where user_id=caller for update;
  if coalesce(current_revision,0)<>expected then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
  insert into dish_v4_private.default_preferences(user_id,preferences,revision) values(caller,payload->'preferences',expected+1)
   on conflict(user_id) do update set preferences=excluded.preferences,revision=excluded.revision,updated_at=clock_timestamp();
   answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'revision',expected+1,'preferences',payload->'preferences'));
 else
  begin room_key:=(payload->>'roomId')::uuid; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end;
  if not exists(select 1 from gm20_canonical_private.sessions capability where capability.room_id=room_key) then return dish_v4_private.fail('CONTRACT_MISMATCH','{}',409); end if;
  if command='snapshot' or command='result' then
   if not exists(select 1 from public.rooms where id=room_key and policy_version='dish-decision-v4') then return dish_v4_private.fail('CONTRACT_MISMATCH','{}',409); end if;
   if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
    if exists(select 1 from public.rooms where id=room_key and state='EXPIRED')
      or exists(select 1 from public.rooms where id=room_key and expires_at<=clock_timestamp() and state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2')) then return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if command='snapshot' then answer:=jsonb_build_object('ok',true,'data',gm20_canonical_private.view(room_key,caller));
    else select gm20_canonical_private.result_projection(capability.result_id) into answer from gm20_canonical_private.sessions capability where capability.room_id=room_key;
    if answer is null then return dish_v4_private.fail('RESULT_NOT_READY','{}',409); end if; answer:=jsonb_build_object('ok',true,'data',answer); end if;
  else
   select * into r from public.rooms where id=room_key and policy_version='dish-decision-v4' for update;
   select * into s from dish_v4_private.sessions where room_id=room_key for update;
   if not found or r.id is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
   if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
   if r.state='EXPIRED' then return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if r.expires_at<=clock_timestamp() and r.state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2') then update public.rooms set state='EXPIRED',version=version+1,updated_at=clock_timestamp() where id=room_key; return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if command in('updateSettings','start','cancel','finalize') and r.host_user_id<>caller then return dish_v4_private.fail('NOT_HOST','{}',403); end if;
   if command in('updateSettings','updatePreferences','start','cancel','leave','finalize') then
   if jsonb_typeof(payload->'expectedVersion') is distinct from 'number' or (payload->>'expectedVersion')::numeric<>r.version then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
   end if;
   if command in('submit','waiting') then
    if jsonb_typeof(payload->'expectedVersion') is distinct from 'number'
      or (payload->>'expectedVersion')::numeric<>trunc((payload->>'expectedVersion')::numeric)
      or (payload->>'expectedVersion')::bigint<1 or (payload->>'expectedVersion')::bigint>r.version then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
   end if;
   if command='updateSettings' then
    if r.state<>'LOBBY' then return dish_v4_private.fail('ROOM_LOCKED','{}',409); end if;
     if jsonb_typeof(payload->'settings') is distinct from 'object' or not(payload->'settings' ?& array['dishCount','mealSlot','desiredAt'])
       or exists(select 1 from jsonb_object_keys(payload->'settings') k where k not in('dishCount','mealSlot','desiredAt'))
       or jsonb_typeof(payload->'settings'->'dishCount') is distinct from 'number' or (payload->'settings'->>'dishCount')::numeric<>trunc((payload->'settings'->>'dishCount')::numeric) or (payload->'settings'->>'dishCount')::numeric not between 5 and 20 then return dish_v4_private.fail('INVALID_INPUT'); end if;
     count_value:=(payload->'settings'->>'dishCount')::numeric::integer; meal:=payload->'settings'->>'mealSlot';
     if meal is null or meal not in('breakfast','lunch','dinner','snack') then return dish_v4_private.fail('INVALID_INPUT'); end if;
     desired:=null;
     if payload->'settings' ? 'desiredAt' and jsonb_typeof(payload->'settings'->'desiredAt') not in('string','null') then return dish_v4_private.fail('INVALID_INPUT'); end if;
     if payload->'settings'->>'desiredAt' is not null then begin desired:=(payload->'settings'->>'desiredAt')::timestamptz; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end; end if;
    select * into c from dish_v3_private.catalogues where id=s.catalogue_id;
    select count(*) into available from jsonb_array_elements(c.cards) d where d.value->'mealSlots' ? meal;
    if available<count_value then return dish_v4_private.fail('INSUFFICIENT_DISHES',jsonb_build_object('available',available,'requested',count_value),409); end if;
    -- Time-only/equivalent settings do not request a new draw. The pinned seed
    -- is independent of room-version/time edits. Catalogue is
    -- pinned at create; preference ranking remains UNSUPPORTED in this wire.
    pool_value:=s.initial_pool;
    if s.requested_count is distinct from count_value or s.meal_slot is distinct from meal then
     pool_value:=dish_v4_private.ranked_pool(c.cards,count_value,meal,s.pool_seed,'[]'::jsonb);
    end if;
    -- Generated row IDs and ordering are not a content change. If all cards
    -- are the same, retain the original IDs AND order rather than re-keying.
    pool_changed:=(select jsonb_agg(value-'roundDishId' order by value->>'dishId' collate "C") from jsonb_array_elements(pool_value))
     is distinct from (select jsonb_agg(value-'roundDishId' order by value->>'dishId' collate "C") from jsonb_array_elements(s.initial_pool));
    if not pool_changed then pool_value:=s.initial_pool; end if;
     update dish_v4_private.sessions set requested_count=count_value,meal_slot=meal,desired_at=desired,settings=payload->'settings',initial_pool=pool_value where room_id=room_key;
    update public.rooms set meal_slot=meal,desired_at=desired,version=version+1,
     pool_version=pool_version+case when pool_changed then 1 else 0 end,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'version',r.version+1,
      'poolVersion',r.pool_version+case when pool_changed then 1 else 0 end,'settings',payload->'settings'));
   elsif command='updatePreferences' then
    if r.state<>'LOBBY' then return dish_v4_private.fail('ROOM_LOCKED','{}',409); end if;
     pref:=payload->'preferences'; if not dish_v4_private.valid_preferences(pref) then return dish_v4_private.fail('INVALID_INPUT'); end if;
    insert into dish_v4_private.room_preferences(room_id,user_id,preferences,revision) values(room_key,caller,pref,1)
     on conflict(room_id,user_id) do update set preferences=excluded.preferences,revision=dish_v4_private.room_preferences.revision+1,updated_at=clock_timestamp();
    update public.rooms set version=version+1,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'version',r.version+1,'poolVersion',r.pool_version));
   elsif command='start' then
    if r.state<>'LOBBY' then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    if not exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds') then return dish_v4_private.fail('WORKER_NOT_READY','{}',503); end if;
     perform gm21_private.prepare_consents(room_key,r.version);
     select count(*) into roster_count from public.members where room_id=room_key and left_at is null;
    if roster_count<2 then return dish_v4_private.fail('NOT_ENOUGH_MEMBERS','{}',409); end if;
    select array_agg(user_id order by joined_at,user_id),jsonb_agg(jsonb_build_object('userId',user_id::text,'historyConsent',history_consent) order by joined_at,user_id)
     into s.roster,s.consent_snapshot from public.members where room_id=room_key and left_at is null;
    update dish_v4_private.sessions set roster=s.roster,consent_snapshot=s.consent_snapshot where room_id=room_key;
    -- ADR-024: soft preference ranking over the locked roster, equal weight per member, same seed and count.
    select * into c from dish_v3_private.catalogues where id=s.catalogue_id;
    pool_value:=dish_v4_private.ranked_pool(c.cards,s.requested_count,s.meal_slot,s.pool_seed,
     (select coalesce(jsonb_agg(p.preferences order by p.user_id),'[]'::jsonb) from dish_v4_private.room_preferences p where p.room_id=room_key and p.user_id=any(s.roster)));
    pool_changed:=(select jsonb_agg(value-'roundDishId' order by value->>'dishId' collate "C") from jsonb_array_elements(pool_value))
     is distinct from (select jsonb_agg(value-'roundDishId' order by value->>'dishId' collate "C") from jsonb_array_elements(s.initial_pool));
    if pool_changed then update dish_v4_private.sessions set initial_pool=pool_value where room_id=room_key; end if;
    update public.rooms set state='ROUND_1',pool_version=pool_version+case when pool_changed then 1 else 0 end,locked_at=clock_timestamp(),evaluated_at=clock_timestamp(),roster_user_ids=s.roster,consent_snapshot=s.consent_snapshot,
     version=version+1,updated_at=clock_timestamp() where id=room_key;
    answer:=jsonb_build_object('ok',true,'data',gm20_canonical_private.view(room_key,caller));
   elsif command in('submit','waiting') then
    if r.state not in('ROUND_1','WAITING_1','ROUND_2','WAITING_2') then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    if jsonb_typeof(payload->'round') is distinct from 'number' or (payload->>'round')::integer<>s.round
      or jsonb_typeof(payload->'poolVersion') is distinct from 'number' or (payload->>'poolVersion')::bigint<>r.pool_version then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
    if s.waiting_started_at is not null and s.waiting_started_at+interval '60 seconds'<=clock_timestamp() then
     perform dish_v4_private.finish(room_key,'TIMEOUT');
     select * into r from public.rooms where id=room_key; select * into s from dish_v4_private.sessions where room_id=room_key;
      if r.state not in('ROUND_1','WAITING_1','ROUND_2','WAITING_2') or s.round<>(payload->>'round')::integer then return dish_v4_private.fail('VERSION_CONFLICT','{}',409); end if;
    end if;
    active_pool:=dish_v4_private.current_pool(s);
    if command='submit' then
     ballot_value:=payload->'votes';
      ballot_value:=dish_v4_private.normalize_votes(ballot_value,active_pool,s.round);
      if ballot_value is null then return dish_v4_private.fail('INCOMPLETE_BALLOT'); end if;
      if s.round=2 and (select count(*) from jsonb_each_text(ballot_value) where value='REMOVE')>greatest(1,(3*jsonb_array_length(active_pool)+9)/10) then return dish_v4_private.fail('REMOVE_LIMIT','{}',409); end if;
     select votes into pref from dish_v4_private.ballots where room_id=room_key and user_id=caller and round=s.round;
     if found and pref is distinct from ballot_value then return dish_v4_private.fail('ALREADY_SUBMITTED','{}',409); end if;
     if not found then
      insert into dish_v4_private.ballots(room_id,user_id,round,votes) values(room_key,caller,s.round,ballot_value);
      update public.rooms set version=version+1,updated_at=clock_timestamp() where id=room_key;
     end if;
     select count(*) into accepted from dish_v4_private.ballots where room_id=room_key and round=s.round;
     if accepted=cardinality(s.roster) then perform dish_v4_private.finish(room_key,'ALL'); end if;
    else
     if not exists(select 1 from dish_v4_private.ballots where room_id=room_key and user_id=caller and round=s.round) then return dish_v4_private.fail('INCOMPLETE_BALLOT'); end if;
      update dish_v4_private.ballots set entered_waiting_at=clock_timestamp() where room_id=room_key and user_id=caller and round=s.round and entered_waiting_at is null;
      update dish_v4_private.sessions set waiting_started_at=coalesce(waiting_started_at,clock_timestamp()) where room_id=room_key;
      update public.rooms set state=case when s.round=1 then 'WAITING_1' else 'WAITING_2' end,version=version+1,updated_at=clock_timestamp()
       where id=room_key and state in('ROUND_1','ROUND_2');
     select count(*) into accepted from dish_v4_private.ballots where room_id=room_key and round=s.round;
     if accepted=cardinality(s.roster) then perform dish_v4_private.finish(room_key,'ALL'); end if;
    end if;
    answer:=jsonb_build_object('ok',true,'data',gm20_canonical_private.view(room_key,caller));
   elsif command='finalize' then
    if r.state in('ROUND_1','ROUND_2') then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    if r.state not in('WAITING_1','WAITING_2') then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    if s.waiting_started_at is null then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    select count(*) into accepted from dish_v4_private.ballots where room_id=room_key and round=s.round;
    if accepted<=cardinality(s.roster)/2 then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    perform dish_v4_private.finish(room_key,'HOST');
    answer:=jsonb_build_object('ok',true,'data',gm20_canonical_private.view(room_key,caller));
    elsif command='cancel' then
    if r.state<>'LOBBY' then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    update public.rooms set state='CANCELLED',version=version+1,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true));
   elsif command='leave' then
    if r.state<>'LOBBY' or r.host_user_id=caller then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    update public.members set left_at=clock_timestamp(),version=version+1 where room_id=room_key and user_id=caller and left_at is null;
    update public.rooms set roster_user_ids=array_remove(roster_user_ids,caller),version=version+1,updated_at=clock_timestamp() where id=room_key;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true));
   else return dish_v4_private.fail('INVALID_INPUT');
   end if;
  end if;
 end if;
 if answer is null then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if mutating and answer->>'ok'='true' then
   if room_key is not null then
    select * into r from public.rooms where id=room_key;
    if command='submit' then
     select * into s from dish_v4_private.sessions where room_id=room_key;
     select accepted_at into desired from dish_v4_private.ballots where room_id=room_key and user_id=caller and round=(payload->>'round')::integer;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'round',(payload->>'round')::integer,'poolVersion',(payload->>'poolVersion')::bigint,'submittedAt',desired));
    elsif command='waiting' then
     select min(entered_waiting_at) into desired from dish_v4_private.ballots where room_id=room_key and round=(payload->>'round')::integer and entered_waiting_at is not null;
     answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'round',(payload->>'round')::integer,'poolVersion',(payload->>'poolVersion')::bigint,'waitingStartedAt',desired,'deadline',desired+interval '60 seconds'));
    elsif command='finalize' then
     select * into s from dish_v4_private.sessions where room_id=room_key;
     if r.state='ROUND_2' then
      answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'outcome','ROUND_ADVANCED','state','ROUND_2','round',2));
     else
      answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'outcome','TERMINAL','state',r.state,'round',s.round,'resultId',(select capability.result_id::text from gm20_canonical_private.sessions capability where capability.room_id=room_key),'finalizedAt',s.finalized_at));
     end if;
    end if;
    answer:=answer||jsonb_build_object('roomId',room_key::text,'version',r.version,'state',r.state);
   end if;
   insert into gm20_canonical_private.request_acks(user_id,request_id,payload_hash,response,expires_at)
    values(caller,request_key,signature,answer,clock_timestamp()+interval '24 hours');
   answer:=answer||jsonb_build_object('requestId',request_key);
  end if;
 return answer;
exception
 when sqlstate 'PT401' then return dish_v4_private.fail('AUTH_REQUIRED','{}',401);
 when invalid_text_representation or numeric_value_out_of_range then return dish_v4_private.fail('INVALID_INPUT');
 when unique_violation then return dish_v4_private.fail('CONFLICT','{}',409);
end $$;

-- A shortage pool of 5..9 dishes must also pass the decision model and the stored-result check.
create or replace function gm20_canonical_private.evaluate_v4(input jsonb) returns jsonb
language plpgsql immutable set search_path=pg_catalog as $$
declare roster jsonb; pool jsonb; r1 jsonb; r2 jsonb; eligible jsonb; unanimous jsonb; remaining jsonb; scored jsonb; selected jsonb; candidates jsonb;
 person record; ballot jsonb; scope jsonb; allowed text[]; n int; round_no int; cap int; phase int; best int; wants int; winner text; base jsonb;
begin
 if jsonb_typeof(input) is distinct from 'object' then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
 if (select array_agg(key order by key) from jsonb_object_keys(input) key) is distinct from array['policyVersion','pool','roster','round','round1','round2','seed']
 or input->>'policyVersion' is distinct from 'dish-decision-v4/ADR-019-30PCT-MIN1'
 or input->'round' is null or input->'round' not in('1'::jsonb,'2'::jsonb)
 or jsonb_typeof(input->'seed') is distinct from 'string' or input->>'seed' !~ '^[0-9a-f]{8}$'
 then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
 roster:=input->'roster';pool:=input->'pool';r1:=input->'round1';r2:=input->'round2';round_no:=(input->>'round')::numeric::int;
 if gm20_private.valid_ids(roster) is not true or gm20_private.valid_ids(pool) is not true
 or jsonb_typeof(r1) is distinct from 'object' or jsonb_typeof(r2) is distinct from 'object'
 then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
 if jsonb_array_length(roster) not between 2 and 20 or jsonb_array_length(pool) not between 5 and 20
 then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
 select jsonb_agg(value order by value collate "C") into pool from jsonb_array_elements_text(pool);
 for phase in 1..2 loop
  if phase=1 then ballot:=r1;scope:=pool;allowed:=array['WANT','OK','NO'];
  else
   select count(*) into n from jsonb_each(r1);
   select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]'::jsonb) into eligible from jsonb_array_elements_text(pool) p
    where not exists(select 1 from jsonb_each(r1) b where b.value->>p.value='NO');
   select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]'::jsonb) into unanimous from jsonb_array_elements_text(eligible) p
    where not exists(select 1 from jsonb_each(r1) b where b.value->>p.value<>'WANT');
   cap:=case when round_no=2 then case when jsonb_array_length(eligible)=0 then 0 else greatest(1,(3*jsonb_array_length(eligible)+9)/10) end else null end;
   if round_no=2 and (n=0 or jsonb_array_length(eligible)=0 or jsonb_array_length(unanimous)>0)
   then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
   ballot:=r2;scope:=case when round_no=2 then eligible else '[]'::jsonb end;allowed:=array['KEEP','REMOVE'];
   if round_no=1 and r2<>'{}'::jsonb then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
  end if;
  for person in select * from jsonb_each(ballot) loop
   if not roster ? person.key or jsonb_typeof(person.value)<>'object' then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
   if (select count(*) from jsonb_each(person.value))<>jsonb_array_length(scope)
   or exists(select 1 from jsonb_each(person.value) v where not scope ? v.key or jsonb_typeof(v.value)<>'string' or not(v.value#>>'{}'=any(allowed)))
   or (phase=2 and (select count(*) from jsonb_each(person.value) v where v.value='"REMOVE"'::jsonb)>cap)
   then raise sqlstate '22023' using message='GM20_INVALID_INPUT'; end if;
  end loop;
 end loop;
 base:=jsonb_build_object('policyVersion','dish-decision-v4/ADR-019-30PCT-MIN1','evaluatorVersion','1.0.0','round1BallotCount',n,
  'removalCap',cap,'winnerId',null,'reasonCode',null,'matchTier',null,'scoreVersion',null,'rankingVersion',null,'topDishes','[]'::jsonb);
 if n=0 then return base||jsonb_build_object('status','WAITING','eligibleIds','[]'::jsonb,'candidateIds','[]'::jsonb); end if;
 if jsonb_array_length(eligible)=0 then return base||jsonb_build_object('status','NO_CONSENSUS','eligibleIds','[]'::jsonb,'candidateIds','[]'::jsonb,'reasonCode','EMPTY_INTERSECTION','matchTier','NO_CONSENSUS'); end if;
 if round_no=1 and jsonb_array_length(unanimous)=0 then return base||jsonb_build_object('status','ROUND_2','eligibleIds',eligible,'candidateIds',eligible); end if;
 if round_no=2 and r2='{}'::jsonb then return base||jsonb_build_object('status','WAITING','eligibleIds',eligible,'candidateIds','[]'::jsonb); end if;
 select coalesce(jsonb_agg(p.value order by p.value collate "C"),'[]'::jsonb) into remaining from jsonb_array_elements_text(eligible) p
  where round_no=1 or not exists(select 1 from jsonb_each(r2) b where b.value->>p.value='REMOVE');
 if jsonb_array_length(remaining)=0 then return base||jsonb_build_object('status','NO_CONSENSUS','eligibleIds','[]'::jsonb,'candidateIds','[]'::jsonb,'reasonCode','ALL_REMOVED','matchTier','NO_CONSENSUS'); end if;
 select jsonb_agg(jsonb_build_object('dishId',id,'score',score) order by score desc,id collate "C"),max(score) into scored,best from (
  select p.value id,(select sum(case b.value->>p.value when 'WANT' then 2 when 'OK' then 1 else 0 end)::int from jsonb_each(r1) b) score from jsonb_array_elements_text(remaining) p) q;
 select jsonb_agg(value->>'dishId' order by value->>'dishId' collate "C") into candidates from jsonb_array_elements(scored) where (value->>'score')::int=best;
 winner:=gm20_private.select_winner(candidates,input->>'seed');
 select jsonb_agg(value order by ord) into selected from jsonb_array_elements(scored) with ordinality t(value,ord) where ord<=3;
 if not exists(select 1 from jsonb_array_elements(selected) where value->>'dishId'=winner) then
  select jsonb_agg(value order by ord) into selected from jsonb_array_elements(scored) with ordinality t(value,ord) where ord<=2 or value->>'dishId'=winner;
 end if;
 select jsonb_agg(value||jsonb_build_object('rank',rank,'isWinner',value->>'dishId'=winner) order by (value->>'score')::int desc,value->>'dishId' collate "C") into selected from (
  select value,dense_rank() over(order by (value->>'score')::int desc) rank from jsonb_array_elements(selected)) q;
 select count(*) into wants from jsonb_each(r1) b where b.value->>winner='WANT';
 return base||jsonb_build_object('status','DECIDED','eligibleIds',remaining,'candidateIds',candidates,'winnerId',winner,'topDishes',selected,
  'reasonCode',case when round_no=1 then 'UNANIMOUS_WANT' else 'ACCEPTABLE_FINAL' end,'matchTier',case when wants=n then 'PERFECT' when wants*2>n then 'CONSENSUS' else 'COMPROMISE' end,
  'scoreVersion','want2-ok1-round1-v1','rankingVersion','score-desc-dense-rank-v1');
end $$;

create or replace function gm06_canonical.valid_terminal(pool jsonb,podium jsonb,winner uuid,status text,reason text,round_no int,scored int) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare c jsonb; p jsonb; previous_score int; dense int:=0; score int; winners int:=0;
begin
 if status is null or status not in('DECIDED','NO_CONSENSUS') or reason is null or round_no is null or round_no not in(1,2) or scored is null or scored not between 1 and 20 then return false; end if;
 if jsonb_typeof(pool) is distinct from 'array' or jsonb_array_length(pool) not between 5 and 20 or
    jsonb_typeof(podium) is distinct from 'array' then return false; end if;
 for c in select * from jsonb_array_elements(pool) loop
  if gm06_canonical.valid_card(c) is not true then return false; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'dishId') or count(*)<>count(distinct value->>'roundDishId') from jsonb_array_elements(pool)) then return false; end if;
 if status='NO_CONSENSUS' then
  return winner is null and jsonb_array_length(podium)=0 and
   ((reason='EMPTY_INTERSECTION' and round_no=1) or (reason='ALL_REMOVED' and round_no=2));
 end if;
 if status<>'DECIDED' or winner is null or jsonb_array_length(podium) not between 1 and 3 or
 not ((reason='UNANIMOUS_WANT' and round_no=1) or (reason='ACCEPTABLE_FINAL' and round_no=2)) then return false; end if;
 if (select count(*)<>count(distinct value->>'dishId') from jsonb_array_elements(podium)) then return false; end if;
 for p in select * from jsonb_array_elements(podium) loop
  if jsonb_typeof(p)<>'object' or (select array_agg(k order by k) from jsonb_object_keys(p) k) is distinct from array['dishId','isWinner','rank','score'] or
    jsonb_typeof(p->'dishId')<>'string' or gm19_private.uuid_or_null(p->>'dishId') is null or
    jsonb_typeof(p->'isWinner')<>'boolean' or jsonb_typeof(p->'score')<>'number' or
    p->>'score'!~'^(0|[1-9][0-9]*)$' or length(p->>'score')>2 or
    jsonb_typeof(p->'rank')<>'number' or p->>'rank'!~'^[1-3]$' then return false; end if;
  score:=(p->>'score')::int;
  if score>2*scored or (previous_score is not null and score>previous_score) then return false; end if;
  if previous_score is null or score<previous_score then dense:=dense+1; end if;
  if (p->>'rank')::int<>dense or not exists(select 1 from jsonb_array_elements(pool) d where d->>'dishId'=p->>'dishId') then return false; end if;
  if (p->>'isWinner')::boolean then
   if (p->>'dishId')::uuid<>winner or dense<>1 then return false; end if;
   winners:=winners+1;
  elsif (p->>'dishId')::uuid=winner then return false;
  end if;
  previous_score:=score;
 end loop;
 return winners=1;
end $$;

-- Stored results keep the GM-06 card shape: the new optional `origin` is a pool-only field.
create or replace function gm20_canonical_private.canonical_card(card jsonb) returns jsonb
language plpgsql immutable set search_path=pg_catalog as $$
declare result jsonb:=card-'origin'; price jsonb:=card->'priceReference'; art jsonb:=card->'artwork';
begin
 if price<>'null'::jsonb then result:=jsonb_set(result,'{priceReference}',(price-'checkedAt')||jsonb_build_object('observedAt',price->'checkedAt')); end if;
 if art<>'null'::jsonb then result:=jsonb_set(result,'{artwork}',art||jsonb_build_object('attribution',coalesce(art->'attribution','null'::jsonb))); end if;
 if gm06_canonical.valid_card(result) is not true then raise sqlstate '23514' using message='GM20_CARD_ADAPTER'; end if;
 return result;
end $$;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.26.0','dish-session-v4/roadmap-v2/GM-07.B-supplement','1.1.0','1.1.0','ADR-024/0050_preference_ranking');

commit;
