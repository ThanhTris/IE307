-- ADR-028 hardening (additive; replaces the dish_session wrapper of 0055 in place, same signature):
--  * avoid-recent only uses people whose account currently keeps personal history (consent on), so a person who turned
--    history off is not affected by old entries or by a default avoidRecent flag they never saw;
--  * setReady checks contractVersion and requestId like the other write commands. It is idempotent by nature: a retry
--    finds the value already set and does not bump the room version again.
begin;

create or replace function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare caller uuid:=auth.uid(); room_key uuid; r public.rooms%rowtype; want boolean; answer jsonb; avoid text; new_version bigint;
begin
 if jsonb_typeof(payload) is distinct from 'object' or command not in('setReady','start','updatePreferences') then
  return public.dish_session_before_ready(command,payload);
 end if;
 room_key:=gm19_private.uuid_or_null(payload->>'roomId');
 if command='setReady' then
  if caller is null then return dish_v4_private.fail('AUTH_REQUIRED','{}',401); end if;
  if payload->>'contractVersion' is distinct from 'dish-session-v4/roadmap-v2/GM-07.B-supplement' then return dish_v4_private.fail('CONTRACT_MISMATCH','{}',409); end if;
  if jsonb_typeof(payload->'requestId') is distinct from 'string' or payload->>'requestId' !~ '^[A-Za-z0-9_-]{1,128}$' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if room_key is null or jsonb_typeof(payload->'ready') is distinct from 'boolean'
    or exists(select 1 from jsonb_object_keys(payload) k where k not in('contractVersion','requestId','roomId','ready')) then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if not gm19_private.allow_call('dish_v4_setReady',60) then return dish_v4_private.fail('RATE_LIMITED','{}',429); end if;
  want:=(payload->>'ready')::boolean;
  select * into r from public.rooms where id=room_key and policy_version='dish-decision-v4' for update;
  if not found then return dish_v4_private.fail('ROOM_NOT_FOUND','{}',404); end if;
  if not exists(select 1 from public.members where room_id=room_key and user_id=caller and left_at is null) then return dish_v4_private.fail('NOT_MEMBER','{}',403); end if;
  if r.expires_at<=clock_timestamp() then return dish_v4_private.fail('ROOM_EXPIRED','{}',410); end if;
  if r.state<>'LOBBY' then return dish_v4_private.fail('INVALID_ROOM_STATE','{}',409); end if;
  perform set_config('dish_v4.writer','on',true);
  update public.members set ready=want,version=version+1 where room_id=room_key and user_id=caller and left_at is null and ready is distinct from want;
  if found then update public.rooms set version=version+1,updated_at=clock_timestamp() where id=room_key; end if;
  select version into new_version from public.rooms where id=room_key;
  return jsonb_build_object('ok',true,'data',jsonb_build_object('accepted',true,'version',new_version,'ready',want));
 end if;
 if command='start' then
  if room_key is not null and caller is not null then
   select * into r from public.rooms where id=room_key;
   if found and r.state='LOBBY' and r.host_user_id=caller and exists(
     select 1 from public.members m where m.room_id=room_key and m.left_at is null and m.user_id<>r.host_user_id and not m.ready) then
    return dish_v4_private.fail('MEMBERS_NOT_READY','{}',409);
   end if;
   select coalesce(string_agg(distinct w.dish_id,','),'') into avoid from public.members m
    join dish_v4_private.room_preferences p on p.room_id=m.room_id and p.user_id=m.user_id and p.preferences->>'avoidRecent'='true'
    join gm21_private.settings gs on gs.user_id=m.user_id and gs.scope='personal' and gs.enabled
    cross join lateral (select z.winner_dish_id::text dish_id from gm06_canonical.histories h join gm06_canonical.results z on z.result_id=h.result_id
      where h.scope='personal' and h.owner_user_id=m.user_id and h.expires_at>clock_timestamp() and z.winner_dish_id is not null
      order by z.finalized_at desc limit 3) w
    where m.room_id=room_key and m.left_at is null;
   perform set_config('dish_v4.avoid_dishes',avoid,true);
  end if;
  answer:=public.dish_session_before_ready(command,payload);
  perform set_config('dish_v4.avoid_dishes','',true);
  return answer;
 end if;
 answer:=public.dish_session_before_ready(command,payload);
 if answer->>'ok'='true' and room_key is not null and caller is not null then
  perform set_config('dish_v4.writer','on',true);
  update public.members set ready=true,version=version+1
   where room_id=room_key and user_id=caller and left_at is null and not ready
     and exists(select 1 from public.rooms where id=room_key and state='LOBBY');
 end if;
 return answer;
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role;
grant execute on function public.dish_session(text,jsonb) to authenticated;

insert into public.schema_versions(schema_version, contract_id, food_contract_version, core_contract_version, upstream_revision)
values ('0.31.1', 'dish-session-v4/roadmap-v2/GM-07.B-supplement', '1.1.0', '1.1.0', 'ADR-028/0056_ready_hardening');

commit;
