begin;

create schema gm45_private;
revoke all on schema gm45_private from public,anon,authenticated,service_role,gm06_publisher;

create table public.room_version_signals (
 room_id uuid primary key references public.rooms(id) on delete cascade,
 version bigint not null check (version between 1 and 9007199254740991)
);
alter table public.room_version_signals enable row level security;
revoke all on public.room_version_signals from public,anon,authenticated,service_role,gm06_publisher;
grant select on public.room_version_signals to authenticated;
create policy gm45_active_member on public.room_version_signals
 for select to authenticated using (gm17_private.is_member(room_id));

create function gm45_private.publish_room_version() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 if new.policy_version='dish-decision-v4' then
  insert into public.room_version_signals(room_id,version) values(new.id,new.version)
   on conflict(room_id) do update set version=excluded.version
   where public.room_version_signals.version<excluded.version;
 end if;
 return null;
end $$;
revoke all on function gm45_private.publish_room_version()
 from public,anon,authenticated,service_role,gm06_publisher;

create trigger gm45_room_insert after insert on public.rooms
 for each row execute function gm45_private.publish_room_version();
create trigger gm45_room_version after update of version on public.rooms
 for each row when (old.version is distinct from new.version)
 execute function gm45_private.publish_room_version();

insert into public.room_version_signals(room_id,version)
 select id,version from public.rooms where policy_version='dish-decision-v4';

do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.room_version_signals;
 end if;
end $$;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values ('0.31.6','dish-session-v4/roadmap-v2/GM-45.1','1.1.0','1.1.0','GM-44/0060; ADR-026/0053');

commit;
