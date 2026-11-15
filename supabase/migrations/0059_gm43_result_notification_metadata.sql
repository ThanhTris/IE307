begin;

-- Both the inbox wrapper chain and the delivery claim already call this helper.
-- The baseline v4 writer has an immutable result projection linked to its event.
create or replace function gm23_private.notification_metadata(event_key uuid) returns jsonb
language sql stable security definer set search_path=pg_catalog as $$
 select coalesce(
  (select jsonb_build_object('status',n.status,'contractVersion',n.contract_version,'eventVersion',n.event_version)
   from gm23_private.canonical_notifications n where n.event_id=event_key),
  (select jsonb_build_object('status',r.projection->>'status',
    'contractVersion',r.projection->>'contractVersion','eventVersion',e.version)
   from public.events e join dish_v4_private.results r on r.id=e.dish_v4_result_id and r.room_id=e.room_id
   where e.id=event_key and e.kind='ROOM_RESULT_READY'
     and r.projection->>'status' in ('DECIDED','NO_CONSENSUS')
     and nullif(r.projection->>'contractVersion','') is not null)
 )
$$;
revoke all on function gm23_private.notification_metadata(uuid) from public,anon,authenticated,service_role,gm06_publisher;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values ('0.31.4','dish-session-v4/roadmap-v2/GM-43.1','1.1.0','1.1.0','GM23.2/0038; baseline v4/0047; ADR-026/0052');
commit;
