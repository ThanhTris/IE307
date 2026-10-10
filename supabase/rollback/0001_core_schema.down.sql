-- Local rollback only. All task data is lost; never use on a live database.
-- Apply only to disposable GM-06 test DBs; downstream migrations must roll back first.
begin;
drop trigger if exists gm06_users_nested_fk on auth.users;
do $$ declare r record; begin
  for r in select conrelid::regclass as tbl, conname from pg_constraint
    where contype='f' and conrelid in ('public.availability_overrides'::regclass,'public.consents'::regclass,'public.coverage_areas'::regclass,'public.data_sources'::regclass,'public.dataset_versions'::regclass,'public.date_exceptions'::regclass,'public.deliveries'::regclass,'public.devices'::regclass,'public.dishes'::regclass,'public.events'::regclass,'public.friend_invitations'::regclass,'public.friends'::regclass,'public.histories'::regclass,'public.idempotency'::regclass,'public.inbox'::regclass,'public.members'::regclass,'public.preferences'::regclass,'public.profiles'::regclass,'public.public_anchors'::regclass,'public.results'::regclass,'public.room_invitations'::regclass,'public.rooms'::regclass,'public.round_dishes'::regclass,'public.submissions'::regclass,'public.taxonomy'::regclass,'public.venue_dishes'::regclass,'public.venues'::regclass,'public.votes'::regclass,'public.weekly_schedules'::regclass,'public.schedule_groups'::regclass) loop
    execute format('alter table %s drop constraint %I',r.tbl,r.conname);
  end loop;
end $$;
drop table public.availability_overrides;
drop table public.consents;
drop table public.coverage_areas;
drop table public.data_sources;
drop table public.dataset_versions;
drop table public.date_exceptions;
drop table public.deliveries;
drop table public.devices;
drop table public.dishes;
drop table public.events;
drop table public.friend_invitations;
drop table public.friends;
drop table public.histories;
drop table public.idempotency;
drop table public.inbox;
drop table public.members;
drop table public.preferences;
drop table public.profiles;
drop table public.public_anchors;
drop table public.results;
drop table public.room_invitations;
drop table public.rooms;
drop table public.round_dishes;
drop table public.submissions;
drop table public.taxonomy;
drop table public.venue_dishes;
drop table public.venues;
drop table public.votes;
drop table public.weekly_schedules;
drop table public.schedule_groups;
drop table public.schema_versions;
-- Refuse external dependencies instead of CASCADE-removing their constraints.
do $$ declare r record; begin
  for r in select p.oid::regprocedure as signature from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace where n.nspname='gm06_private'
    order by p.oid desc loop
    execute format('drop function %s',r.signature);
  end loop;
end $$;
drop schema gm06_private;
-- Keep NOLOGIN gm06_publisher: roles are cluster-wide and may be used by another local DB.
commit;
