-- GM-17.1, schema 0.2.0. No business write endpoint or authentication issuer.
begin;
create schema gm17_private;
revoke all on schema gm17_private from public, anon, authenticated;
alter default privileges in schema gm17_private revoke execute on functions from public;
alter default privileges in schema gm17_private revoke all on tables from public;

-- Reference identities carry no room context, roster, ballot, or token. History,
-- ACKs and neutral events can outlive their operational parent rows.
do $$ declare entity text; begin
  foreach entity in array array['room','result','invitation','event'] loop
    execute format('create table gm17_private.%I (id uuid primary key)',entity||'_refs');
    execute format('alter table gm17_private.%I enable row level security',entity||'_refs');
    execute format('alter table gm17_private.%I force row level security',entity||'_refs');
    execute format('revoke all on gm17_private.%I from public,anon,authenticated,service_role,gm06_publisher',entity||'_refs');
  end loop;
end $$;
insert into gm17_private.room_refs select id from public.rooms;
insert into gm17_private.result_refs select id from public.results;
insert into gm17_private.invitation_refs select id from public.room_invitations;
insert into gm17_private.event_refs select id from public.events;

create function gm17_private.register_reference() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
  -- TG_ARGV is installed only by this migration, never supplied by a caller.
  execute format('insert into gm17_private.%I(id) values($1)',TG_ARGV[0]) using new.id;
  return new;
end $$;
create trigger gm17_room_ref after insert on public.rooms for each row execute function gm17_private.register_reference('room_refs');
create trigger gm17_result_ref after insert on public.results for each row execute function gm17_private.register_reference('result_refs');
create trigger gm17_invitation_ref after insert on public.room_invitations for each row execute function gm17_private.register_reference('invitation_refs');
create trigger gm17_event_ref after insert on public.events for each row execute function gm17_private.register_reference('event_refs');

alter table public.histories drop constraint histories_result_id_fk;
alter table public.histories add constraint histories_result_ref_fk foreign key(result_id) references gm17_private.result_refs(id) deferrable initially deferred;
alter table public.events drop constraint events_room_id_fk, drop constraint events_result_id_fk, drop constraint events_invitation_id_fk;
alter table public.events add constraint events_room_ref_fk foreign key(room_id) references gm17_private.room_refs(id) deferrable initially deferred;
alter table public.events add constraint events_result_ref_fk foreign key(result_id) references gm17_private.result_refs(id) deferrable initially deferred;
alter table public.events add constraint events_invitation_ref_fk foreign key(invitation_id) references gm17_private.invitation_refs(id) deferrable initially deferred;
alter table public.room_invitations drop constraint room_invitations_event_id_fk;
alter table public.room_invitations add constraint room_invitations_event_ref_fk foreign key(event_id) references gm17_private.event_refs(id) deferrable initially deferred;

-- Normalize just the ACK reference edges; the immutable JSON response is unchanged.
drop trigger gm06_idempotency_nested_fk on public.idempotency;
drop trigger gm06_results_nested_fk on public.results;
drop trigger gm06_rooms_nested_fk on public.rooms;
create constraint trigger gm06_rooms_nested_fk after insert or update or delete on public.rooms deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"rooms","path":["roster_user_ids","[]"],"target_schema":"auth","target":"users","key":"id"},{"table":"rooms","path":["consent_snapshot","[]","userId"],"target_schema":"auth","target":"users","key":"id"}]');
alter table public.idempotency add column room_ref_id uuid generated always as ((response->>'roomId')::uuid) stored;
alter table public.idempotency add column result_ref_id uuid generated always as ((response->>'resultId')::uuid) stored;
alter table public.idempotency add constraint idempotency_room_ref_fk foreign key(room_ref_id) references gm17_private.room_refs(id) deferrable initially deferred;
alter table public.idempotency add constraint idempotency_result_ref_fk foreign key(result_ref_id) references gm17_private.result_refs(id) deferrable initially deferred;

alter table public.rooms add column terminal_at timestamptz;
update public.rooms r set terminal_at=case when state='EXPIRED' then expires_at
  else coalesce((select finalized_at from public.results s where s.room_id=r.id),updated_at) end,
  version=version+1 where state in ('DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED');
set constraints all immediate;
set constraints all deferred;
alter table public.rooms add constraint rooms_terminal_time check(terminal_at is null or (isfinite(terminal_at) and terminal_at>=created_at));
create function gm17_private.terminal_clock() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if TG_OP='UPDATE' and old.terminal_at is not null then
    if new.terminal_at is distinct from old.terminal_at or new.state is distinct from old.state then
      raise exception using errcode='23514',message='GM17_TERMINAL_IMMUTABLE';
    end if;
  elsif new.state in ('DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED') then
    new.terminal_at := case when new.state='EXPIRED' then new.expires_at else statement_timestamp() end;
  else
    new.terminal_at := null;
  end if;
  return new;
end $$;
create trigger gm17_terminal_clock before insert or update on public.rooms for each row execute function gm17_private.terminal_clock();
create index rooms_terminal_at_idx on public.rooms(terminal_at);

-- An active guest is authenticated, not the PostgREST anon role.
-- No helper accepts an arbitrary caller identity or a client clock.
create function gm17_private.is_member(room uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select auth.uid() is not null and exists(select 1 from public.rooms r join public.members m on m.room_id=r.id
    where r.id=room and m.user_id=auth.uid() and m.left_at is null and r.expires_at>statement_timestamp());
$$;
create function gm17_private.owns_submission(submission uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists(select 1 from public.submissions s join public.members m on m.id=s.member_id and m.room_id=s.room_id
    where s.id=submission and m.user_id=auth.uid() and gm17_private.is_member(s.room_id));
$$;
create function gm17_private.history_valid(history uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists(select 1 from public.histories h where h.id=history
    and h.expires_at>statement_timestamp() and h.finalized_at+interval '30 days'>statement_timestamp()
    and cardinality(h.consent_ids)=cardinality(h.member_user_ids)
    and not exists(select 1 from unnest(h.member_user_ids) u(id) where not exists(
      select 1 from public.consents c where c.id=any(h.consent_ids) and c.user_id=u.id
      and c.scope=case when h.scope='personal' then 'personal_history' else 'group_history' end
      and c.enabled and c.revoked_at is null and c.granted_at<=h.finalized_at
      and (c.expires_at is null or c.expires_at>statement_timestamp())))
    and not exists(select 1 from unnest(h.consent_ids) ci(id) where not exists(
      select 1 from public.consents c where c.id=ci.id and c.user_id=any(h.member_user_ids))));
$$;
create function gm17_private.history_visible(history uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists(select 1 from public.histories h where h.id=history and auth.uid() is not null
    and ((h.scope='personal' and h.owner_user_id=auth.uid()) or (h.scope='group' and auth.uid()=any(h.member_user_ids)))
    and gm17_private.history_valid(h.id));
$$;

-- Downstream transaction guard: caller/membership first prevents existence leaks;
-- lock serializes checks with mutations; ACK lookup still precedes this guard.
create function gm17_private.require_room(room uuid, expected_version bigint, host_only boolean default false) returns void
language plpgsql security definer set search_path = pg_catalog as $$
declare r public.rooms%rowtype;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message='AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.members m where m.room_id=room and m.user_id=auth.uid() and m.left_at is null) then
    raise sqlstate 'PT403' using message='NOT_MEMBER';
  end if;
  -- All GM-06 related writes acquire reference_epoch BEFORE locking a room.
  update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
  select * into r from public.rooms where id=room for update;
  if not found then raise sqlstate 'PT403' using message='NOT_MEMBER'; end if;
  if not exists(select 1 from public.members m where m.room_id=room and m.user_id=auth.uid() and m.left_at is null) then
    raise sqlstate 'PT403' using message='NOT_MEMBER';
  end if;
  if r.expires_at<=statement_timestamp() then raise sqlstate 'PT410' using message='ROOM_EXPIRED'; end if;
  if host_only and r.host_user_id<>auth.uid() then raise sqlstate 'PT403' using message='NOT_HOST'; end if;
  if expected_version is null or expected_version<>r.version then raise sqlstate 'PT409' using message='VERSION_CONFLICT'; end if;
  if r.state in ('DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED') then raise sqlstate 'PT409' using message='ROOM_TERMINAL'; end if;
end $$;

-- Allowlisted columns plus RLS. No table-wide SELECT on private tables.
grant usage on schema gm17_private to authenticated;
grant execute on function gm17_private.is_member(uuid),gm17_private.owns_submission(uuid),gm17_private.history_visible(uuid) to authenticated;
-- require_room is only called by trusted endpoint owners, not exposed as RPC.

grant select(id,user_id,display_name,created_at,version) on public.profiles to authenticated;
create policy gm17_profile_self on public.profiles for select to authenticated using(user_id=auth.uid());
grant select(id,code,host_user_id,state,created_at,updated_at,expires_at,meal_slot,time_hint,budget,avoid_recent,anchor_id,coverage_id,radius_m,desired_at,timezone,service_mode,catalogue_version,dataset_version,eligibility_version,context_version,pool_version,policy_version,evaluated_at,locked_at,version) on public.rooms to authenticated;
create policy gm17_room_member on public.rooms for select to authenticated using(gm17_private.is_member(id));
grant select(id,room_id,user_id,nickname,ready,joined_at,left_at,version) on public.members to authenticated;
create policy gm17_member_roster on public.members for select to authenticated using(gm17_private.is_member(room_id));
grant select(id,room_id,user_id,cuisine_ids,category_ids,temperature,flavor,updated_at,version) on public.preferences to authenticated;
create policy gm17_preferences_self on public.preferences for select to authenticated using(user_id=auth.uid() and gm17_private.is_member(room_id));
grant select(id,room_id,round,choice_id,dish_id,variant,offering_id,venue_id,ordinal,dataset_version,schedule_id,schedule_version,effective_profile,price,pool_version,version) on public.round_dishes to authenticated;
create policy gm17_pool_member on public.round_dishes for select to authenticated using(gm17_private.is_member(room_id));
grant select(id,room_id,member_id,round,request_id,pool_version,accepted_at,version) on public.submissions to authenticated;
create policy gm17_submission_self on public.submissions for select to authenticated using(gm17_private.owns_submission(id));
grant select(id,submission_id,round_dish_id,value,version) on public.votes to authenticated;
create policy gm17_votes_self on public.votes for select to authenticated using(gm17_private.owns_submission(submission_id));
grant select(id,room_id,winner_round_dish_id,reason_code,match_tier,policy_version,finalized_at,version) on public.results to authenticated;
create policy gm17_result_member on public.results for select to authenticated using(gm17_private.is_member(room_id));
grant select(id,user_id,scope,enabled,granted_at,revoked_at,expires_at,version) on public.consents to authenticated;
create policy gm17_consent_self on public.consents for select to authenticated using(user_id=auth.uid());
grant select(id,scope,result_id,dish_id,dish_name,meal_slot,match_tier,finalized_at,expires_at,version) on public.histories to authenticated;
create policy gm17_history_owner on public.histories for select to authenticated using(
  gm17_private.history_visible(id));
grant select(id,low_user_id,high_user_id,accepted_at,version) on public.friends to authenticated;
create policy gm17_friend_pair on public.friends for select to authenticated using(auth.uid() in (low_user_id,high_user_id));
grant select(id,sender_user_id,recipient_user_id,state,created_at,expires_at,responded_at,version) on public.friend_invitations to authenticated;
create policy gm17_friend_invite_pair on public.friend_invitations for select to authenticated using(
  auth.uid() in (sender_user_id,recipient_user_id) and expires_at>statement_timestamp() and created_at+interval '7 days'>statement_timestamp());
grant select(id,room_id,sender_user_id,recipient_user_id,state,created_at,expires_at,responded_at,version) on public.room_invitations to authenticated;
create policy gm17_room_invite_pair on public.room_invitations for select to authenticated using(
  auth.uid() in (sender_user_id,recipient_user_id) and expires_at>statement_timestamp()
  and exists(select 1 from public.rooms r where r.id=room_id and r.expires_at>statement_timestamp())
  and exists(select 1 from public.friends f where f.id=friend_id and auth.uid() in (f.low_user_id,f.high_user_id)));
-- The room/invitation predicate must work for a recipient who has not joined.
create function gm17_private.invitation_live(invitation uuid) returns boolean
language sql stable security definer set search_path = pg_catalog as $$
  select exists(select 1 from public.room_invitations i join public.rooms r on r.id=i.room_id join public.friends f on f.id=i.friend_id
    where i.id=invitation and auth.uid() in (i.sender_user_id,i.recipient_user_id)
    and i.expires_at>statement_timestamp() and r.expires_at>statement_timestamp()
    and r.state='LOBBY' and f.low_user_id=least(i.sender_user_id,i.recipient_user_id)
    and f.high_user_id=greatest(i.sender_user_id,i.recipient_user_id));
$$;
drop policy gm17_room_invite_pair on public.room_invitations;
create policy gm17_room_invite_pair on public.room_invitations for select to authenticated using(gm17_private.invitation_live(id));
grant execute on function gm17_private.invitation_live(uuid) to authenticated;
grant select(id,owner_user_id,event_id,read_at,created_at,expires_at,version) on public.inbox to authenticated;
create policy gm17_inbox_self on public.inbox for select to authenticated using(owner_user_id=auth.uid() and expires_at>statement_timestamp() and created_at+interval '7 days'>statement_timestamp());
grant select(id,platform,permission,active,created_at,last_seen_at,version) on public.devices to authenticated;
create policy gm17_device_self on public.devices for select to authenticated using(user_id=auth.uid());

-- Published catalogue fields are public, internal evidence/author fields are not.
do $$ declare t text; cols text; begin
  for t,cols in select * from (values
    ('taxonomy','id,type,code,label,description,status,origin,version,review_status,source_ref,checked_at,valid_until'),
    ('dishes','id,name,description,aliases,cuisine_ids,category_ids,meal_slots,time_hints,classification_status,origin,ingredient_tags,temperature,flavor,artwork,source_dish_ids,status,version,review_status,source_ref,checked_at,valid_until'),
    ('venues','id,branch_name,address,admin_area_id,lat,lng,timezone,status,service_modes,version,review_status,source_ref,checked_at,valid_until,schedule_id'),
    ('venue_dishes','offering_id,venue_id,dish_id,variant,menu_name,menu_source,schedule_id,service_mode,price_min,price_max,unit,currency,serving_size,profile_overrides,artwork,status,version,review_status,source_ref,checked_at,valid_until'),
    ('weekly_schedules','id,schedule_id,owner_type,owner_id,day_of_week,start_time,end_time,end_day_offset,is24_hours,timezone,status,version,review_status,source_ref,checked_at,valid_until,last_order,last_order_day_offset'),
    ('date_exceptions','id,schedule_id,local_date,status,intervals,last_order,version,review_status,source_ref,checked_at,valid_until,last_order_day_offset'),
    ('availability_overrides','id,offering_id,state,source,observed_at,expires_at,version,review_status,source_ref,checked_at,valid_until'),
    ('coverage_areas','area_id,name,boundary,dataset_version,version,review_status,source_ref,checked_at,valid_until'),
    ('public_anchors','anchor_id,name,lat,lng,coverage_id,is_public,version,review_status,source_ref,checked_at,valid_until'),
    ('data_sources','source_ref,usage_rights,license,attribution,status,version,review_status,checked_at,valid_until'),
    ('dataset_versions','id,dataset_version,contract_version,status,checksum,previous_version_id,version,review_status,source_ref,checked_at,valid_until'),
    ('schedule_groups','schedule_id,owner_type,owner_id,timezone,review_status,version')
  ) allowlist(table_name,columns) loop
    execute format('grant select(%s) on public.%I to anon,authenticated',cols,t);
    execute format('create policy gm17_published_read on public.%I for select to anon,authenticated using(review_status=''published'' and not fixture_only)',t);
  end loop;
end $$;

alter table public.consents add column retention_detached boolean not null default false;
create function gm17_private.cleanup() returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare now_at timestamptz:=statement_timestamp(); doomed uuid[]; removed bigint; count_rooms bigint; count_history bigint;
begin
  if not pg_try_advisory_xact_lock(170017) then return jsonb_build_object('skipped',true); end if;
  -- Same lock order as upstream reference triggers and downstream write guard.
  update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
  set constraints all deferred;
  delete from public.histories h where h.expires_at<=now_at or h.finalized_at+interval '30 days'<=now_at or not gm17_private.history_valid(h.id);
  get diagnostics count_history=row_count;
  delete from public.idempotency where expires_at<=now_at;
  select coalesce(array_agg(id),'{}') into doomed from public.rooms
    where least(coalesce(terminal_at,expires_at),expires_at)+interval '24 hours'<=now_at;
  delete from public.votes where submission_id in(select id from public.submissions where room_id=any(doomed));
  delete from public.submissions where room_id=any(doomed);
  delete from public.results where room_id=any(doomed);
  delete from public.round_dishes where room_id=any(doomed);
  delete from public.preferences where room_id=any(doomed);
  delete from public.members where room_id=any(doomed);
  -- Keep only the consent metadata needed by retained history; no room context.
  update public.consents c set room_id=null,retention_detached=true,version=version+1 where room_id=any(doomed)
    and exists(select 1 from public.histories h where c.id=any(h.consent_ids));
  delete from public.consents c where room_id=any(doomed) or (room_id is null
    and not exists(select 1 from public.histories h where c.id=any(h.consent_ids))
    and (retention_detached or not enabled or revoked_at is not null or expires_at<=now_at));
  delete from public.room_invitations i where room_id=any(doomed)
    or least(expires_at,coalesce(responded_at,expires_at))+interval '24 hours'<=now_at
    or exists(select 1 from public.rooms r where r.id=i.room_id and r.terminal_at+interval '24 hours'<=now_at);
  delete from public.friend_invitations where least(expires_at,created_at+interval '7 days',coalesce(responded_at,expires_at))+interval '24 hours'<=now_at;
  delete from public.deliveries d where expires_at<=now_at or exists(select 1 from public.events e where e.id=d.event_id and least(e.expires_at,e.created_at+interval '7 days')<=now_at);
  delete from public.inbox i where least(expires_at,created_at+interval '7 days')<=now_at or exists(select 1 from public.events e where e.id=i.event_id and least(e.expires_at,e.created_at+interval '7 days')<=now_at);
  delete from public.events where least(expires_at,created_at+interval '7 days')<=now_at;
  -- Notification refs permit neutral events to finish their shorter independent TTL.
  delete from public.rooms where id=any(doomed);
  get diagnostics count_rooms=row_count;
  update public.devices set active=false,push_token=null,version=version+1
    where push_token is not null and (not active or last_seen_at+interval '30 days'<=now_at);
  delete from public.deliveries where device_id in(select id from public.devices where not active and last_seen_at+interval '30 days'<=now_at);
  delete from public.devices where not active and last_seen_at+interval '30 days'<=now_at;
  delete from gm17_private.result_refs x where not exists(select 1 from public.results r where r.id=x.id)
    and not exists(select 1 from public.histories h where h.result_id=x.id)
    and not exists(select 1 from public.idempotency a where a.result_ref_id=x.id)
    and not exists(select 1 from public.events e where e.result_id=x.id);
  delete from gm17_private.room_refs x where not exists(select 1 from public.rooms r where r.id=x.id)
    and not exists(select 1 from public.idempotency a where a.room_ref_id=x.id)
    and not exists(select 1 from public.events e where e.room_id=x.id);
  delete from gm17_private.invitation_refs x where not exists(select 1 from public.room_invitations i where i.id=x.id)
    and not exists(select 1 from public.events e where e.invitation_id=x.id);
  delete from gm17_private.event_refs x where not exists(select 1 from public.events e where e.id=x.id)
    and not exists(select 1 from public.room_invitations i where i.event_id=x.id);
  set constraints all immediate;
  return jsonb_build_object('skipped',false,'rooms',count_rooms,'histories',count_history);
end $$;
-- Supabase may have global default grants even for a newly created schema.
-- Revoke EVERY client role, then regrant only the four safe RLS predicates.
revoke execute on all functions in schema gm17_private from public,anon,authenticated,service_role,gm06_publisher;
grant execute on function gm17_private.is_member(uuid),gm17_private.owns_submission(uuid),gm17_private.history_visible(uuid),gm17_private.invitation_live(uuid) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.2.0','food-v1/roadmap-v2/GM-17.1','1.1.0','1.1.0','GM-06 schema0.1.0 + GM-16.1; ADR-015');
commit;
