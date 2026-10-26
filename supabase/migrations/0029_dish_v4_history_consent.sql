-- Inherit account-level history choices into v4 room membership and freeze each
-- scope at start. Existing v2/v3 sessions and already-started v4 sessions stay pinned.
begin;

create function dish_v4_private.account_history_consent(user_key uuid) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from gm21_private.settings st where st.user_id=user_key and st.enabled)
$$;
revoke all on function dish_v4_private.account_history_consent(uuid) from public,anon,authenticated,service_role;

create function dish_v4_private.member_history_default() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare policy_value text;
begin
 select r.policy_version into policy_value from public.rooms r where r.id=new.room_id;
 if policy_value='dish-decision-v4' and new.left_at is null then
  new.history_consent:=dish_v4_private.account_history_consent(new.user_id);
 end if;
 return new;
end $$;
revoke all on function dish_v4_private.member_history_default() from public,anon,authenticated,service_role;
create trigger dish_v4_member_history_default
 before insert or update of user_id,left_at,history_consent on public.members
 for each row execute function dish_v4_private.member_history_default();

create or replace function gm21_private.prepare_consents(room uuid,expected_version bigint) returns void
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare r public.rooms%rowtype; m public.members%rowtype; s record; enabled_value boolean;
begin
 perform gm17_private.require_room(room,expected_version,false);
 select * into r from public.rooms where id=room;
 if r.state<>'LOBBY' then raise sqlstate 'PT409' using message='ROOM_LOCKED'; end if;
 for m in select * from public.members where room_id=room and left_at is null order by user_id for update loop
  enabled_value:=dish_v4_private.account_history_consent(m.user_id);
  if m.history_consent is distinct from enabled_value then
   update public.members set history_consent=enabled_value,version=version+1 where id=m.id;
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

create function dish_v4_private.has_locked_history_consent(room_key uuid,user_key uuid,scope_value text,locked_at_value timestamptz) returns boolean
language sql stable security definer set search_path=pg_catalog as $$
 select exists(
  select 1 from public.consents c
  join gm21_private.settings st on st.user_id=c.user_id and st.enabled and st.scope=scope_value
  where c.user_id=user_key and c.room_id=room_key and c.scope=scope_value||'_history'
   and c.enabled and c.revoked_at is null and c.granted_at<=locked_at_value
   and (c.expires_at is null or c.expires_at>locked_at_value)
 )
$$;
revoke all on function dish_v4_private.has_locked_history_consent(uuid,uuid,text,timestamptz) from public,anon,authenticated,service_role;

create function dish_v4_private.pin_history_consent_scopes() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if old.policy_version<>'dish-decision-v4' or old.state<>'LOBBY' or new.state<>'ROUND_1' then return new; end if;
 update dish_v4_private.sessions s
 set consent_snapshot=coalesce((
  select jsonb_agg(jsonb_build_object(
   'userId',m.user_id::text,
   'historyConsent',dish_v4_private.has_locked_history_consent(new.id,m.user_id,'personal',new.locked_at)
    or dish_v4_private.has_locked_history_consent(new.id,m.user_id,'group',new.locked_at),
   'personalHistoryConsent',dish_v4_private.has_locked_history_consent(new.id,m.user_id,'personal',new.locked_at),
   'groupHistoryConsent',dish_v4_private.has_locked_history_consent(new.id,m.user_id,'group',new.locked_at)
  ) order by m.joined_at,m.user_id)
  from public.members m where m.room_id=new.id and m.left_at is null
 ),'[]'::jsonb)
 where s.room_id=new.id;
 return new;
end $$;
revoke all on function dish_v4_private.pin_history_consent_scopes() from public,anon,authenticated,service_role;
create trigger dish_v4_pin_history_consent_scopes
 after update of state on public.rooms
 for each row execute function dish_v4_private.pin_history_consent_scopes();

create or replace function dish_v4_private.save_history(room_key uuid,result_key uuid,projection_value jsonb,roster_value uuid[],consents jsonb,finish_time timestamptz) returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare person uuid; all_consented boolean:=true; history_expiry timestamptz:=finish_time+interval '30 days';
 personal_expiry timestamptz; consent_expiry timestamptz; personal_opted boolean; group_opted boolean; locked_at_value timestamptz;
begin
 select r.locked_at into locked_at_value from public.rooms r where r.id=room_key;
 if locked_at_value is null then return; end if;
 perform 1 from public.consents c where c.user_id=any(roster_value)
  and (c.room_id=room_key or (c.room_id is null and not c.retention_detached)) order by c.id for update;
 for person in select unnest(roster_value) loop
  select coalesce((entry.value->>'personalHistoryConsent')::boolean,(entry.value->>'historyConsent')::boolean,false),
         coalesce((entry.value->>'groupHistoryConsent')::boolean,(entry.value->>'historyConsent')::boolean,false)
   into personal_opted,group_opted
   from jsonb_array_elements(consents) entry(value) where entry.value->>'userId'=person::text;
  personal_opted:=coalesce(personal_opted,false); group_opted:=coalesce(group_opted,false);
  consent_expiry:=null;
  if personal_opted then
   select c.expires_at into consent_expiry from public.consents c where c.user_id=person and c.scope='personal_history'
    and (c.room_id=room_key or (c.room_id is null and not c.retention_detached)) and c.enabled and c.revoked_at is null
    and c.granted_at<=locked_at_value and (c.expires_at is null or c.expires_at>finish_time)
    and exists(select 1 from gm21_private.settings st where st.user_id=person and st.scope='personal' and st.enabled)
    order by (c.room_id=room_key) desc nulls last limit 1;
  end if;
  if personal_opted and found then
   personal_expiry:=least(finish_time+interval '30 days',coalesce(consent_expiry,'infinity'));
   insert into dish_v4_private.history(id,room_id,result_id,scope,owner_user_id,member_user_ids,projection,created_at,expires_at,consent_snapshot)
    values(gen_random_uuid(),room_key,result_key,'personal',person,array[person],projection_value,finish_time,personal_expiry,consents);
  end if;
  consent_expiry:=null;
  if group_opted then
   select c.expires_at into consent_expiry from public.consents c where c.user_id=person and c.scope='group_history'
    and (c.room_id=room_key or (c.room_id is null and not c.retention_detached)) and c.enabled and c.revoked_at is null
    and c.granted_at<=locked_at_value and (c.expires_at is null or c.expires_at>finish_time)
    and exists(select 1 from gm21_private.settings st where st.user_id=person and st.scope='group' and st.enabled)
    order by (c.room_id=room_key) desc nulls last limit 1;
  end if;
  if not group_opted or not found then all_consented:=false;
  else history_expiry:=least(history_expiry,coalesce(consent_expiry,'infinity')); end if;
 end loop;
 if all_consented and cardinality(roster_value)>=2 then
  insert into dish_v4_private.history(id,room_id,result_id,scope,owner_user_id,member_user_ids,projection,created_at,expires_at,consent_snapshot)
   values(gen_random_uuid(),room_key,result_key,'group',null,roster_value,projection_value,finish_time,history_expiry,consents);
 end if;
end $$;
revoke all on function dish_v4_private.save_history(uuid,uuid,jsonb,uuid[],jsonb,timestamptz) from public,anon,authenticated,service_role;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.9.1','dish-session-v4/roadmap-v2/GM-07.B','1.1.0','1.1.0','dish-session-v4/roadmap-v2/GM-07.B history consent scope pin')
on conflict(schema_version) do nothing;

commit;
