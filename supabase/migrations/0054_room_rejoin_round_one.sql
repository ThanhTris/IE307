-- ADR-027: a member who dropped out (lost connection) can come back to the room while round 1 is still open.
-- Additive. Joining with the room code (join / previewJoin, also used by invitations) used to answer ROOM_LOCKED for
-- every state except LOBBY, even for someone who is already an active member. Now an active member of a room in
-- ROUND_1 / WAITING_1 gets the usual receipt back (nothing is added or changed: roster, preferences and ballots stay).
-- From ROUND_2 on, and for people who are not members, the answer is unchanged (ROOM_LOCKED).
begin;

alter function dish_v4_private.admit_member(uuid,uuid,text) rename to admit_member_lobby_only;
revoke all on function dish_v4_private.admit_member_lobby_only(uuid,uuid,text) from public,anon,authenticated,service_role;

create function dish_v4_private.admit_member(room_key uuid,caller uuid,display_name text) returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; m public.members%rowtype;
begin
 select * into r from public.rooms where id=room_key;
 if found and r.policy_version='dish-decision-v4' and r.state in('ROUND_1','WAITING_1') and r.expires_at>clock_timestamp() then
  select * into m from public.members where room_id=room_key and user_id=caller and left_at is null;
  if found then
   return jsonb_build_object('ok',true,'data',jsonb_build_object('roomId',room_key::text,'code',r.code,'version',r.version,'memberId',m.id::text));
  end if;
 end if;
 return dish_v4_private.admit_member_lobby_only(room_key,caller,display_name);
end $$;
revoke all on function dish_v4_private.admit_member(uuid,uuid,text) from public,anon,authenticated,service_role;

alter function public.dish_session(text,jsonb) rename to dish_session_before_rejoin;
revoke all on function public.dish_session_before_rejoin(text,jsonb) from public,anon,authenticated,service_role;
create function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare answer jsonb; r public.rooms%rowtype;
begin
 answer:=public.dish_session_before_rejoin(command,payload);
 if command is distinct from 'previewJoin' or jsonb_typeof(payload) is distinct from 'object'
   or answer->>'ok' is distinct from 'true' or answer#>>'{data,reasonCode}' is distinct from 'ROOM_LOCKED' then return answer; end if;
 select * into r from public.rooms where code=payload->>'code' and policy_version='dish-decision-v4';
 if found and r.state in('ROUND_1','WAITING_1') and r.expires_at>clock_timestamp()
   and exists(select 1 from public.members where room_id=r.id and user_id=auth.uid() and left_at is null) then
  return jsonb_set(answer,'{data}',(answer->'data')-'reasonCode'||jsonb_build_object('joinable',true));
 end if;
 return answer;
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role;
grant execute on function public.dish_session(text,jsonb) to authenticated;

insert into public.schema_versions(schema_version, contract_id, food_contract_version, core_contract_version, upstream_revision)
values ('0.30.0', 'dish-session-v4/roadmap-v2/GM-07.B-supplement', '1.1.0', '1.1.0', 'ADR-027/0054_room_rejoin_round_one');

commit;
