-- Host removes a member from a room that is still in the lobby.
-- Additive: previously applied migrations stay immutable. Mirrors `leave` of dish_session
-- (member row closed, roster shrinks, room version + 1) but is initiated by the host.
-- Rules: host only; room must be LOBBY; the host cannot remove themself (cancel the room instead);
-- the target must be an active member; expectedVersion must match; requestId is idempotent.
begin;

alter table public.idempotency
  drop constraint idempotency_operation_shape;
alter table public.idempotency
  add constraint idempotency_operation_shape check (
    operation is null
    or operation in ('mark_all_partner_inbox_read', 'remove_room_member')
    or gm06_private.json_matches(to_jsonb(operation),
      '{"type":"string","enum":["create_room","join_room","update_preferences","update_context","set_ready","start_room","submit_ballot","cancel_room","leave_room","create_friend_invite","accept_friend_invite","reject_friend_invite","unfriend","create_room_invite","accept_room_invite","reject_room_invite","register_push_device","unregister_push_device","delete_history","update_history_consent"]}'::jsonb)
  );

create function public.remove_room_member("requestId" text, room_ref text, member_ref text, expected_version bigint)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller uuid;
  request_key uuid;
  room_key uuid;
  target uuid;
  payload_key text;
  ack jsonb;
  guard jsonb;
  r public.rooms%rowtype;
  wire jsonb;
begin
  caller := gm19_private.require_auth();
  begin
    request_key := gm19_private.request_uuid("requestId");
    room_key := gm19_private.uuid_or_null(room_ref);
    target := gm19_private.uuid_or_null(member_ref);
  exception when others then
    return gm19_private.error('INVALID_INPUT', 400);
  end;
  if room_key is null or target is null or expected_version is null then
    return gm19_private.error('INVALID_INPUT', 400, null, request_key);
  end if;

  payload_key := gm19_private.hash_payload(
    jsonb_build_object('roomId', room_key, 'memberUserId', target, 'expectedVersion', expected_version)
  );
  ack := gm19_private.ack_lookup('remove_room_member', request_key, payload_key);
  if ack->>'kind' <> 'missing' then
    return gm19_private.replay_or_reused(ack, room_key, request_key);
  end if;
  if not gm19_private.allow_call('remove_room_member', 30) then
    return gm19_private.error('RATE_LIMITED', 429, room_key, request_key);
  end if;

  -- Membership, host, expiry, version and terminal-state checks (locks the room).
  guard := gm19_private.room_guard(room_key, expected_version, true);
  if guard is not null then return guard; end if;

  select * into r from public.rooms where id = room_key;
  if r.state <> 'LOBBY' then
    return gm19_private.error('INVALID_ROOM_STATE', 409, room_key, request_key);
  end if;
  if target = caller then
    return gm19_private.error('INVALID_INPUT', 400, room_key, request_key);
  end if;
  if not exists (select 1 from public.members m where m.room_id = room_key and m.user_id = target and m.left_at is null) then
    return gm19_private.error('NOT_MEMBER', 404, room_key, request_key);
  end if;

  perform set_config('dish_v4.writer', 'on', true);
  update public.members
     set left_at = clock_timestamp(), version = version + 1
   where room_id = room_key and user_id = target and left_at is null;
  update public.rooms
     set roster_user_ids = array_remove(roster_user_ids, target), version = version + 1, updated_at = clock_timestamp()
   where id = room_key
  returning * into r;

  wire := jsonb_build_object(
    'ok', true,
    'requestId', "requestId",
    'data', jsonb_build_object('accepted', true, 'roomId', room_key::text, 'version', r.version)
  );
  perform gm19_private.save_ack('remove_room_member', request_key, payload_key, room_key, null, expected_version, r.version, wire);
  return wire;
exception
  when sqlstate 'PT401' then
    return gm19_private.error('AUTH_REQUIRED', 401, null, request_key);
end
$$;

revoke all on function public.remove_room_member(text, text, text, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.remove_room_member(text, text, text, bigint)
  to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.18.0','dish-session-v4/roadmap-v2/remove-room-member','1.1.0','1.1.0','0042_remove_room_member');

commit;
