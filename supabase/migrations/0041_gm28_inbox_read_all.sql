-- GM-28.1: idempotent mark-all-read operation for the caller's live inbox.
-- This is additive; previously applied migrations remain immutable.
begin;

alter table public.idempotency
  drop constraint idempotency_operation_shape;
alter table public.idempotency
  add constraint idempotency_operation_shape check (
    operation is null
    or operation = 'mark_all_partner_inbox_read'
    or gm06_private.json_matches(to_jsonb(operation),
      '{"type":"string","enum":["create_room","join_room","update_preferences","update_context","set_ready","start_room","submit_ballot","cancel_room","leave_room","create_friend_invite","accept_friend_invite","reject_friend_invite","unfriend","create_room_invite","accept_room_invite","reject_room_invite","register_push_device","unregister_push_device","delete_history","update_history_consent"]}'::jsonb)
  );

create function public.mark_all_partner_inbox_read("requestId" text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  caller uuid;
  request_key uuid;
  payload_key text;
  ack jsonb;
  wire jsonb;
  cutoff timestamptz;
begin
  caller := gm19_private.require_auth();
  begin
    request_key := gm19_private.request_uuid("requestId");
  exception when sqlstate '22023' then
    return gm19_private.error('INVALID_INPUT', 400);
  end;

  -- The command has no mutable body fields. Hash the operation discriminator;
  -- requestId is the idempotency key and is intentionally not part of the body.
  payload_key := gm19_private.hash_payload(
    jsonb_build_object('operation', 'mark_all_partner_inbox_read')
  );
  ack := gm19_private.ack_lookup('mark_all_partner_inbox_read', request_key, payload_key);
  if ack->>'kind' <> 'missing' then
    return gm19_private.replay_or_reused(ack, null, request_key);
  end if;
  if not gm19_private.allow_call('mark_all_partner_inbox_read', 30) then
    return gm19_private.error('RATE_LIMITED', 429, null, request_key);
  end if;

  -- One database timestamp defines the set. Later inbox entries cannot be
  -- swept into a retry because retries return the stored ACK above.
  cutoff := clock_timestamp();
  update public.inbox as inbox_row
     set read_at = cutoff,
         version = inbox_row.version + 1
   where inbox_row.owner_user_id = caller
     and inbox_row.read_at is null
     and inbox_row.created_at <= cutoff
     and inbox_row.expires_at > cutoff;

  wire := jsonb_build_object(
    'ok', true,
    'requestId', "requestId",
    'data', null
  );
  perform gm19_private.save_ack(
    'mark_all_partner_inbox_read', request_key, payload_key,
    null, null, null, 1, wire
  );
  return wire;
exception
  when sqlstate 'PT401' then
    return gm19_private.error('AUTH_REQUIRED', 401, null, request_key);
end
$$;

revoke all on function public.mark_all_partner_inbox_read(text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_all_partner_inbox_read(text)
  to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.17.0','food-v1/roadmap-v2/GM-28.1','1.1.0','1.1.0','GM28.1/0041_gm28_inbox_read_all');

commit;
