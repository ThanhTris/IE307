-- Account defaults belong to v4. Preserve the explicit room opt-in semantics
-- of already pinned legacy sessions; do not rewrite their consent snapshots.
begin;

create or replace function gm21_private.prepare_consents(room uuid,expected_version bigint) returns void
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; m public.members%rowtype; s record; enabled_value boolean;
begin
 perform gm17_private.require_room(room,expected_version,false);
 select * into r from public.rooms where id=room;
 if r.state<>'LOBBY' then raise sqlstate 'PT409' using message='ROOM_LOCKED'; end if;
 for m in select * from public.members where room_id=room and left_at is null order by user_id for update loop
  if r.policy_version='dish-decision-v4' then
   enabled_value:=dish_v4_private.account_history_consent(m.user_id);
   if m.history_consent is distinct from enabled_value then
    update public.members set history_consent=enabled_value,version=version+1 where id=m.id;
   end if;
  else
   enabled_value:=m.history_consent;
  end if;
  if not enabled_value then continue; end if;
  for s in select * from gm21_private.settings where user_id=m.user_id and enabled order by scope loop
   insert into public.consents as existing(id,user_id,room_id,scope,enabled,granted_at,revoked_at,expires_at,version)
   values(gen_random_uuid(),m.user_id,room,s.scope||'_history',true,statement_timestamp(),null,statement_timestamp()+interval '30 days',1)
   on conflict on constraint consents_unique_1 do update
    set enabled=true,granted_at=excluded.granted_at,revoked_at=null,expires_at=excluded.expires_at,version=existing.version+1
    where not existing.enabled or existing.revoked_at is not null or existing.expires_at<=statement_timestamp();
  end loop;
 end loop;
end $$;
revoke all on function gm21_private.prepare_consents(uuid,bigint) from public,anon,authenticated,service_role;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.9.2','dish-session-v4/roadmap-v2/GM-07.B','1.1.0','1.1.0','0031 consent policy isolation; legacy room flags preserved')
on conflict(schema_version) do nothing;

commit;
