-- GM19.2 / schema0.11.1. Forward fix; GM-07.B wire and legacy routes stay pinned.
-- Dispatcher copied from0027 with changes limited to updateSettings host guard,
-- integer normalization and content-aware pool preservation. Other branches,
-- ACK replay, lock order and consent helpers are preserved verbatim.
begin;

create or replace function dish_v4_private.dispatch(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid; room_key uuid; r public.rooms%rowtype; s dish_v4_private.sessions%rowtype; c dish_v3_private.catalogues%rowtype;
 request_key text; signature text; old_ack dish_v4_private.request_acks%rowtype; answer jsonb; keys text[]; name_value text; room_code text; seed_value text;
 count_value integer; available integer; meal text; desired timestamptz; pref jsonb; consent_value boolean; pool_value jsonb; pool_changed boolean;
 ballot_value jsonb; active_pool jsonb; actual_round integer; pool_version_value bigint; expected bigint; current_revision bigint;
 accepted integer; roster_count integer; result_key uuid; history_key uuid; history_rows jsonb;
 mutating boolean; status_value integer:=400;
begin
 caller:=gm19_private.require_auth();
 if jsonb_typeof(payload) is distinct from 'object' or payload->>'contractVersion'<>'dish-session-v4/roadmap-v2/GM-07.B' then return dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION'); end if;
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
  select * into old_ack from dish_v4_private.request_acks a where a.user_id=caller and a.request_id=request_key;
  if found then
   if old_ack.payload_hash<>signature then return dish_v4_private.fail('REQUEST_ID_REUSED','{}',409); end if;
   return old_ack.response;
  end if;
 end if;

 if command='create' then
  if not exists(select 1 from dish_v4_private.runtime where last_tick>clock_timestamp()-interval '15 seconds') then return dish_v4_private.fail('WORKER_NOT_READY','{}',503); end if;
  if jsonb_typeof(payload->'settings') is distinct from 'object' or not(payload->'settings' ?& array['dishCount','mealSlot','desiredAt'])
    or jsonb_typeof(payload->'preferences') is distinct from 'object'
    or not dish_v4_private.valid_preferences(payload->'preferences') then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if jsonb_typeof(payload->'settings'->'dishCount') is distinct from 'number' or (payload->'settings'->>'dishCount')::numeric<>trunc((payload->'settings'->>'dishCount')::numeric) or (payload->'settings'->>'dishCount')::numeric not between 10 and 20 then return dish_v4_private.fail('INVALID_INPUT'); end if;
  count_value:=(payload->'settings'->>'dishCount')::integer; meal:=payload->'settings'->>'mealSlot'; name_value:=btrim(payload->>'displayName'); pref:=payload->'preferences';
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
  pool_value:=dish_v4_private.pool_for(c.cards,count_value,meal,seed_value);
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
  insert into dish_v4_private.room_preferences(room_id,user_id,preferences,revision) values(room_key,caller,pref,1);
  answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',room_key::text,'code',room_code,'version',1,'expiresAt',(select expires_at from public.rooms where id=room_key)));
 elsif command='previewJoin' then
  if jsonb_typeof(payload->'requestId') is distinct from 'string' or payload->>'requestId' !~ '^[A-Za-z0-9_-]{1,128}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if payload->>'code' is null or payload->>'code' !~ '^[A-HJ-NP-Z2-9]{6}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  select room_ref.id into room_key from public.rooms room_ref where room_ref.code=payload->>'code' and room_ref.policy_version='dish-decision-v4';
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
  select id into room_key from public.rooms where code=payload->>'code' and policy_version='dish-decision-v4';
  if room_key is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
  answer:=dish_v4_private.admit_member(room_key,caller,payload->>'displayName');
  elsif command='history' then
  select coalesce(jsonb_agg(jsonb_build_object('historyId',h.id::text,'roomId',h.room_id::text,'resultId',h.result_id::text,
   'scope',h.scope,'createdAt',h.created_at,'expiresAt',h.expires_at,'result',h.projection) order by h.created_at desc),'[]'::jsonb)
   into history_rows from dish_v4_private.history h where h.expires_at>clock_timestamp()
    and ((h.scope='personal' and h.owner_user_id=caller) or (h.scope='group' and caller=any(h.member_user_ids)));
   answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('items',history_rows));
 elsif command='deleteHistory' then
  begin history_key:=(payload->>'historyId')::uuid; exception when others then return dish_v4_private.fail('INVALID_INPUT'); end;
  delete from dish_v4_private.history h where h.id=history_key and ((h.scope='personal' and h.owner_user_id=caller) or (h.scope='group' and caller=any(h.member_user_ids)));
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
  if command='snapshot' or command='result' then
   if not exists(select 1 from public.rooms where id=room_key and policy_version='dish-decision-v4') then return dish_v4_private.fail('CONTRACT_MISMATCH','{}',409); end if;
   if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
    if exists(select 1 from public.rooms where id=room_key and state='EXPIRED')
      or exists(select 1 from public.rooms where id=room_key and expires_at<=clock_timestamp() and state in('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2')) then return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
   if command='snapshot' then answer:=jsonb_build_object('ok',true,'data',dish_v4_private.view(room_key,caller));
    else select projection into answer from dish_v4_private.results z where z.room_id=room_key;
    if answer is null then return dish_v4_private.fail('RESULT_NOT_READY','{}',409); end if; answer:=jsonb_build_object('ok',true,'data',answer); end if;
  else
   select * into r from public.rooms where id=room_key and policy_version='dish-decision-v4' for update;
   select * into s from dish_v4_private.sessions where room_id=room_key for update;
   if not found or r.id is null then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
   if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
   if r.expires_at<=clock_timestamp() and r.state in('LOBBY','ROUND_1','ROUND_2') then update public.rooms set state='EXPIRED',version=version+1,updated_at=clock_timestamp() where id=room_key; return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
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
       or jsonb_typeof(payload->'settings'->'dishCount') is distinct from 'number' or (payload->'settings'->>'dishCount')::numeric<>trunc((payload->'settings'->>'dishCount')::numeric) or (payload->'settings'->>'dishCount')::numeric not between 10 and 20 then return dish_v4_private.fail('INVALID_INPUT'); end if;
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
     pool_value:=dish_v4_private.pool_for(c.cards,count_value,meal,s.pool_seed);
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
    update public.rooms set state='ROUND_1',locked_at=clock_timestamp(),evaluated_at=clock_timestamp(),roster_user_ids=s.roster,consent_snapshot=s.consent_snapshot,
     version=version+1,updated_at=clock_timestamp() where id=room_key;
    answer:=jsonb_build_object('ok',true,'data',dish_v4_private.view(room_key,caller));
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
      if s.round=2 and (select count(*) from jsonb_each_text(ballot_value) where value='REMOVE')>greatest(1,floor(jsonb_array_length(active_pool)*0.30)::integer) then return dish_v4_private.fail('REMOVE_LIMIT','{}',409); end if;
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
    answer:=jsonb_build_object('ok',true,'data',dish_v4_private.view(room_key,caller));
   elsif command='finalize' then
    if r.state not in('WAITING_1','WAITING_2') then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
    if s.waiting_started_at is null then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    select count(*) into accepted from dish_v4_private.ballots where room_id=room_key and round=s.round;
    if accepted<=cardinality(s.roster)/2 then return dish_v4_private.fail('NOT_READY','{}',409); end if;
    perform dish_v4_private.finish(room_key,'HOST');
    answer:=jsonb_build_object('ok',true,'data',dish_v4_private.view(room_key,caller));
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
      answer:=jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'outcome','TERMINAL','state',r.state,'round',s.round,'resultId',s.result_id::text,'finalizedAt',s.finalized_at));
     end if;
    end if;
    answer:=answer||jsonb_build_object('roomId',room_key::text,'version',r.version,'state',r.state);
   end if;
   insert into dish_v4_private.request_acks(user_id,request_id,payload_hash,response,expires_at)
    values(caller,request_key,signature,answer,clock_timestamp()+interval '24 hours');
   answer:=answer||jsonb_build_object('requestId',request_key);
  end if;
 return answer;
exception
 when sqlstate 'PT401' then return dish_v4_private.fail('AUTH_REQUIRED','{}',401);
 when invalid_text_representation or numeric_value_out_of_range then return dish_v4_private.fail('INVALID_INPUT');
 when unique_violation then return dish_v4_private.fail('CONFLICT','{}',409);
end $$;

revoke all on function dish_v4_private.dispatch(text,jsonb) from public,anon,authenticated,service_role;
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.11.1','dish-session-v4/roadmap-v2/GM-19.2','1.1.0','1.1.0',
 'a6e89fcc00fad2ad2c3cef9c0599cdabf7c035f7; GM19 host-only settings and stable lobby pool');
commit;
