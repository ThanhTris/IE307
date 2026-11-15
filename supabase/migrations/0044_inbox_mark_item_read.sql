-- Mark ONE inbox entry (identified by its event id) as read for the caller. Idempotent by requestId;
-- an already-read or someone else's entry changes nothing and still answers ok (nothing to leak).
begin;

alter table public.idempotency
  drop constraint idempotency_operation_shape;
alter table public.idempotency
  add constraint idempotency_operation_shape check (
    operation is null
    or operation in ('mark_all_partner_inbox_read', 'remove_room_member', 'mark_partner_inbox_item_read')
    or gm06_private.json_matches(to_jsonb(operation),
      '{"type":"string","enum":["create_room","join_room","update_preferences","update_context","set_ready","start_room","submit_ballot","cancel_room","leave_room","create_friend_invite","accept_friend_invite","reject_friend_invite","unfriend","create_room_invite","accept_room_invite","reject_room_invite","register_push_device","unregister_push_device","delete_history","update_history_consent"]}'::jsonb)
  );

create function public.mark_partner_inbox_item_read("requestId" text, event_ref text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller uuid;
  request_key uuid;
  event_key uuid;
  payload_key text;
  ack jsonb;
  wire jsonb;
begin
  caller := gm19_private.require_auth();
  begin
    request_key := gm19_private.request_uuid("requestId");
    event_key := gm19_private.uuid_or_null(event_ref);
  exception when others then
    return gm19_private.error('INVALID_INPUT', 400);
  end;
  if event_key is null then
    return gm19_private.error('INVALID_INPUT', 400, null, request_key);
  end if;

  payload_key := gm19_private.hash_payload(jsonb_build_object('operation', 'mark_partner_inbox_item_read', 'eventId', event_key));
  ack := gm19_private.ack_lookup('mark_partner_inbox_item_read', request_key, payload_key);
  if ack->>'kind' <> 'missing' then
    return gm19_private.replay_or_reused(ack, null, request_key);
  end if;
  if not gm19_private.allow_call('mark_partner_inbox_item_read', 120) then
    return gm19_private.error('RATE_LIMITED', 429, null, request_key);
  end if;

  update public.inbox as inbox_row
     set read_at = clock_timestamp(), version = inbox_row.version + 1
   where inbox_row.owner_user_id = caller and inbox_row.event_id = event_key and inbox_row.read_at is null;

  wire := jsonb_build_object('ok', true, 'requestId', "requestId", 'data', null);
  perform gm19_private.save_ack('mark_partner_inbox_item_read', request_key, payload_key, null, null, null, 1, wire);
  return wire;
exception
  when sqlstate 'PT401' then
    return gm19_private.error('AUTH_REQUIRED', 401, null, request_key);
end
$$;

revoke all on function public.mark_partner_inbox_item_read(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_partner_inbox_item_read(text, text) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.20.0','food-v1/roadmap-v2/inbox-mark-item-read','1.1.0','1.1.0','0044_inbox_mark_item_read');

commit;
