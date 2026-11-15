begin;

create schema gm42_private;
revoke all on schema gm42_private from public,anon,authenticated,service_role,gm06_publisher;
alter default privileges in schema gm42_private revoke execute on functions from public;

create table gm42_private.locked_names (
 room_id uuid primary key references public.rooms(id) on delete cascade,
 consent_ids uuid[] not null,
 participants jsonb not null check (jsonb_array_length(participants) between 2 and 20)
);
create table gm42_private.history_names (
 history_id uuid primary key references gm06_canonical.histories(history_id) on delete cascade,
 participants jsonb not null check (jsonb_array_length(participants) between 2 and 20)
);
alter table gm42_private.locked_names enable row level security;
alter table gm42_private.history_names enable row level security;

create function gm42_private.capture_locked_names() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 insert into gm42_private.locked_names(room_id,consent_ids,participants)
 select new.id,array_agg(c.id order by roster.ord),jsonb_agg(jsonb_build_object(
  'displayName',m.nickname,'role',case when roster.user_id=new.host_user_id then 'HOST' else 'MEMBER' end
 ) order by roster.ord)
 from unnest(new.roster_user_ids) with ordinality roster(user_id,ord)
 join public.members m on m.room_id=new.id and m.user_id=roster.user_id and m.left_at is null
 join gm21_private.settings settings on settings.user_id=roster.user_id and settings.scope='group' and settings.enabled
 cross join lateral (
  select grant_row.id from public.consents grant_row
  where grant_row.user_id=roster.user_id and grant_row.scope='group_history'
    and (grant_row.room_id=new.id or (grant_row.room_id is null and not grant_row.retention_detached))
    and grant_row.enabled and grant_row.revoked_at is null and grant_row.granted_at<=new.locked_at
    and (grant_row.expires_at is null or grant_row.expires_at>new.locked_at)
  order by (grant_row.room_id=new.id) desc nulls last,grant_row.id limit 1
 ) c
 where exists(select 1 from gm20_canonical_private.sessions s where s.room_id=new.id)
 having count(*)=cardinality(new.roster_user_ids) and count(*) between 2 and 20;
 return new;
end $$;
create trigger gm42_capture_locked_names after update of state on public.rooms
 for each row when (old.state='LOBBY' and new.state='ROUND_1' and new.policy_version='dish-decision-v4')
 execute function gm42_private.capture_locked_names();

create function gm42_private.clear_locked_names() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 delete from gm42_private.locked_names where room_id=new.id;
 return new;
end $$;
create trigger gm42_clear_locked_names after update of state on public.rooms
 for each row when (new.state in ('DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED'))
 execute function gm42_private.clear_locked_names();

create function gm42_private.invalidate_locked_grant() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 delete from gm42_private.locked_names where consent_ids @> array[old.id];
 return null;
end $$;
create trigger gm42_delete_locked_grant after delete on public.consents
 for each row when (old.scope='group_history') execute function gm42_private.invalidate_locked_grant();
create trigger gm42_change_locked_grant after update on public.consents
 for each row when (old.scope='group_history' and
  (old.enabled,old.revoked_at,old.granted_at,old.expires_at,old.room_id,old.retention_detached)
   is distinct from (new.enabled,new.revoked_at,new.granted_at,new.expires_at,new.room_id,new.retention_detached))
 execute function gm42_private.invalidate_locked_grant();

create function gm42_private.clear_removed_audience() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 delete from gm42_private.history_names where history_id=old.history_id;
 return null;
end $$;
create trigger gm42_clear_removed_audience after delete on gm06_canonical.history_audience
 for each row execute function gm42_private.clear_removed_audience();

alter function gm20_canonical_private.save_history(uuid,uuid,uuid[],jsonb,timestamptz,timestamptz) rename to save_history_before_gm42;
create function gm20_canonical_private.save_history(room_key uuid,result_key uuid,roster uuid[],snapshot jsonb,locked_at timestamptz,stamp timestamptz) returns void
language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform gm20_canonical_private.save_history_before_gm42(room_key,result_key,roster,snapshot,locked_at,stamp);
 insert into gm42_private.history_names(history_id,participants)
 select h.history_id,n.participants
 from gm06_canonical.histories h cross join gm42_private.locked_names n
 where h.result_id=result_key and h.scope='group' and n.room_id=room_key
   and cardinality(n.consent_ids)=cardinality(roster)
   and not exists(select 1 from gm06_canonical.history_audience a where a.history_id=h.history_id
    and not (a.consent_id=any(n.consent_ids)));
end $$;
revoke all on function gm20_canonical_private.save_history(uuid,uuid,uuid[],jsonb,timestamptz,timestamptz),
 gm20_canonical_private.save_history_before_gm42(uuid,uuid,uuid[],jsonb,timestamptz,timestamptz)
 from public,anon,authenticated,service_role,gm06_publisher;

alter function public.dish_session(text,jsonb) rename to dish_session_before_gm42;
revoke all on function public.dish_session_before_gm42(text,jsonb) from public,anon,authenticated,service_role,gm06_publisher;
create function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare answer jsonb; items jsonb; caller uuid:=auth.uid(); at_time timestamptz;
begin
 answer:=public.dish_session_before_gm42(command,payload);
 if command is distinct from 'history' or answer->>'ok' is distinct from 'true'
    or jsonb_typeof(answer#>'{data,items}') is distinct from 'array' then
  return answer;
 end if;
 at_time:=clock_timestamp();
 select coalesce(jsonb_agg(case when names.participants is null then item
   else item||jsonb_build_object('participants',names.participants) end order by ord),'[]'::jsonb) into items
 from jsonb_array_elements(answer#>'{data,items}') with ordinality rows(item,ord)
 left join lateral (
  select n.participants from gm06_canonical.histories h join gm42_private.history_names n using(history_id)
  where h.result_id=(item->>'resultId')::uuid and h.scope='group'
    and gm06_canonical.history_visible(h.history_id,caller,at_time)
 ) names on true;
 return jsonb_set(answer,'{data,items}',items);
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role,gm06_publisher;
grant execute on function public.dish_session(text,jsonb) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values ('0.31.3','dish-session-v4/roadmap-v2/GM-42.1','1.1.0','1.1.0','GM20.4/0035; GM21.3/0036; start/0050; ADR-028/0057');
commit;
