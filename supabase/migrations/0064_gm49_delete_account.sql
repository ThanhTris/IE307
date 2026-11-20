begin;

create schema gm49_private;
revoke all on schema gm49_private from public,anon,authenticated,service_role,gm06_publisher;
alter default privileges in schema gm49_private revoke execute on functions from public;

create table gm49_private.requests (
 request_key uuid not null,
 token_hash text not null check(token_hash ~ '^[a-f0-9]{64}$'),
 person uuid unique,
 session_key uuid,
 expires_at timestamptz not null,
 completed boolean not null default false,
 primary key(request_key,token_hash),
 check(completed=(person is null and session_key is null))
);
alter table gm49_private.requests enable row level security;

-- A deleted member contributes a count, never an identity or a consent grant.
create table gm49_private.history_redactions (
 history_id uuid primary key references gm06_canonical.histories(history_id) on delete cascade,
 deleted_count integer not null check(deleted_count between 1 and 20)
);
alter table gm49_private.history_redactions enable row level security;

create function gm49_private.active_room(person uuid) returns boolean
language sql volatile set search_path=pg_catalog as $$
 select exists(
  select 1 from public.rooms r
  where r.state in ('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2')
   and r.expires_at>clock_timestamp()
   and (r.host_user_id=person or person=any(r.roster_user_ids) or exists(
     select 1 from public.members m where m.room_id=r.id and m.user_id=person and m.left_at is null)));
$$;

create function public.gm49_account_delete_completed(request_key uuid,token_hash text) returns boolean
language sql volatile security definer set search_path=pg_catalog as $$
 select exists(select 1 from gm49_private.requests q
  where q.request_key=$1 and q.token_hash=$2 and q.completed and q.expires_at>clock_timestamp());
$$;

create function public.gm49_prepare_account_delete(person uuid,session_key uuid,request_key uuid,token_hash text,token_exp bigint)
returns text language plpgsql security definer set search_path=pg_catalog as $$
declare expiry timestamptz:=to_timestamp(token_exp); previous gm49_private.requests%rowtype;
begin
 perform 1 from gm06_private.reference_epoch where singleton for update;
 if expiry is null or expiry<=clock_timestamp() or session_key is null or to_regclass('auth.sessions') is null
    or not exists(select 1 from auth.users u where u.id=person)
    or not gm23_private.session_valid(person,session_key) then
  return 'AUTH_REQUIRED';
 end if;
 if gm49_private.active_room(person) then return 'ACTIVE_ROOM'; end if;
 delete from gm49_private.requests q where q.expires_at<=clock_timestamp();
 select * into previous from gm49_private.requests q where q.person=$1 for update;
 if found then
  if previous.request_key=request_key and previous.token_hash=token_hash then return 'READY'; end if;
  return 'DELETION_IN_PROGRESS';
 end if;
 insert into gm49_private.requests(request_key,token_hash,person,session_key,expires_at)
 values($3,$4,$1,$2,expiry);
 return 'READY';
end $$;

revoke all on function public.gm49_account_delete_completed(uuid,text),
 public.gm49_prepare_account_delete(uuid,uuid,uuid,text,bigint)
 from public,anon,authenticated,service_role,gm06_publisher;
grant execute on function public.gm49_account_delete_completed(uuid,text),
 public.gm49_prepare_account_delete(uuid,uuid,uuid,text,bigint) to service_role;

create or replace function gm06_canonical.history_visible(key uuid,viewer uuid,at_time timestamptz) returns boolean
language sql stable set search_path=pg_catalog as $$
 select exists(select 1 from gm06_canonical.histories h join gm06_canonical.results r using(result_id)
 where h.history_id=key and isfinite(at_time) and at_time>=r.finalized_at
 and h.expires_at>at_time and r.retain_until>at_time and h.expires_at<=r.retain_until
 and exists(select 1 from gm06_canonical.history_audience a where a.history_id=h.history_id and a.user_id=viewer)
 and (select count(*) from gm06_canonical.history_audience a where a.history_id=h.history_id)=
   case when h.scope='personal' then 1 else r.member_count-coalesce((
     select x.deleted_count from gm49_private.history_redactions x where x.history_id=h.history_id),0) end
 and not exists(select 1 from gm06_canonical.history_audience a
  left join public.consents c on c.id=a.consent_id
  where a.history_id=h.history_id and (c.id is null or c.user_id<>a.user_id or
   c.scope<>h.scope||'_history' or not c.enabled or c.revoked_at is not null or
   c.granted_at is null or c.granted_at>r.finalized_at or
   (c.room_id is not null and c.room_id<>r.room_ref_id) or
   (c.expires_at is not null and (c.expires_at<=at_time or c.expires_at<h.expires_at)) or
   (h.scope='personal' and a.user_id<>h.owner_user_id) or
   exists(select 1 from gm21_private.settings s where s.user_id=a.user_id and s.scope=h.scope and not s.enabled))))
$$;

create function gm49_private.redact_histories(person uuid) returns void
language plpgsql security definer set search_path=pg_catalog as $$
declare entry record; names jsonb; redacted_count integer; deleted_label constant text:='Thành viên đã xóa';
begin
 delete from gm06_canonical.histories h where h.owner_user_id=person;
 for entry in
  select h.history_id,n.participants,room.roster_user_ids,r.member_count
  from gm06_canonical.history_audience a join gm06_canonical.histories h using(history_id)
  join gm06_canonical.results r on r.result_id=a.result_id
  left join public.rooms room on room.id=r.room_ref_id
  left join gm42_private.history_names n on n.history_id=h.history_id
  where a.user_id=person and h.scope='group'
 loop
  if not gm06_canonical.history_visible(entry.history_id,person,clock_timestamp()) then
   delete from gm06_canonical.histories h where h.history_id=entry.history_id;
   continue;
  end if;
  insert into gm49_private.history_redactions as x(history_id,deleted_count) values(entry.history_id,1)
  on conflict(history_id) do update set deleted_count=x.deleted_count+1 returning deleted_count into redacted_count;
  delete from gm06_canonical.history_audience a where a.history_id=entry.history_id and a.user_id=person;
  if not exists(select 1 from gm06_canonical.history_audience a where a.history_id=entry.history_id) then
   delete from gm06_canonical.histories h where h.history_id=entry.history_id;
   continue;
  end if;

  -- GM-42 captured names in locked-roster order. A detached roster cannot be
  -- reconstructed by matching display names, which need not be unique.
  if entry.participants is not null and cardinality(entry.roster_user_ids)=jsonb_array_length(entry.participants)
     and person=any(entry.roster_user_ids) then
   select jsonb_agg(case when entry.roster_user_ids[ord::int]=person then
     jsonb_build_object('displayName',deleted_label,'role',value->>'role') else value end order by ord)
   into names from jsonb_array_elements(entry.participants) with ordinality p(value,ord);
  else
   select jsonb_agg(jsonb_build_object('displayName',
      case when i<=redacted_count then deleted_label else 'Thành viên' end,'role','MEMBER') order by i)
   into names from generate_series(1,entry.member_count) i;
  end if;
  insert into gm42_private.history_names(history_id,participants) values(entry.history_id,names)
  on conflict(history_id) do update set participants=excluded.participants;
 end loop;
end $$;

-- GoTrue performs the actual user deletion and owns auth-schema cascades.
-- Run application cleanup in that same transaction so a failed admin request
-- never commits a half-deleted account.
create function gm49_private.before_user_delete() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
declare
 intent gm49_private.requests%rowtype;
 person constant uuid:=old.id;
 rooms uuid[];
 invites uuid[];
 friend_invites uuid[];
 removed_events uuid[];
 v3_guard text:=current_setting('dish_v3.writer',true);
 v4_guard text:=current_setting('dish_v4.writer',true);
begin
 select * into intent from gm49_private.requests q where q.person=old.id;
 if not found then return old; end if;
 -- GoTrue may already hold the auth row lock. Fail fast if a writer holds
 -- reference_epoch, rather than waiting for a lock it may need us to release.
 perform 1 from gm06_private.reference_epoch where singleton for update nowait;
 if intent.expires_at<=clock_timestamp() or to_regclass('auth.sessions') is null
    or not gm23_private.session_valid(person,intent.session_key) then
  raise exception using message='AUTH_REQUIRED';
 end if;
 if gm49_private.active_room(person) then raise exception using message='ACTIVE_ROOM'; end if;

 perform set_config('dish_v3.writer','on',true);
 perform set_config('dish_v4.writer','on',true);

 select array(select r.id from public.rooms r
  where (r.state in ('DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED') or r.expires_at<=clock_timestamp())
   and (r.host_user_id=person or person=any(r.roster_user_ids) or exists(
    select 1 from public.members m where m.room_id=r.id and m.user_id=person))) into rooms;

 perform gm49_private.redact_histories(person);
 delete from gm06_canonical.history_receipts h where h.owner_user_id=person;
 delete from gm06_canonical.result_members m where m.user_id=person;
 -- Legacy summaries which embed a deleted member have no independent
 -- audience rows. Purge those copies, retaining other users' own summaries.
 delete from public.histories h where h.owner_user_id=person or person=any(h.member_user_ids);
 delete from dish_v4_private.history h where h.owner_user_id=person or person=any(h.member_user_ids);
 update dish_v4_private.history h set consent_snapshot=(
  select coalesce(jsonb_agg(e.value order by e.ord),'[]')
  from jsonb_array_elements(h.consent_snapshot) with ordinality e(value,ord)
  where e.value->>'userId' is distinct from person::text
 ) where h.consent_snapshot @> jsonb_build_array(jsonb_build_object('userId',person));

 select array(select i.id from public.friend_invitations i
  where person in (i.sender_user_id,i.recipient_user_id)) into friend_invites;
 select array(select i.id from public.room_invitations i
  where person in (i.sender_user_id,i.recipient_user_id) or i.room_id=any(rooms)) into invites;
 select array(select e.id from public.events e
  where e.invitation_id=any(invites) or e.friend_invitation_id=any(friend_invites)
   or (person=any(e.recipient_user_ids) and cardinality(e.recipient_user_ids)=1)) into removed_events;
 delete from public.deliveries d where d.recipient_user_id=person or d.event_id=any(removed_events)
  or exists(select 1 from public.devices t where t.id=d.device_id and t.user_id=person);
 delete from public.inbox i where i.owner_user_id=person or i.event_id=any(removed_events);
 delete from public.room_invitations i where i.id=any(invites);
 delete from public.events e where e.id=any(removed_events);
 update public.events e set recipient_user_ids=array_remove(e.recipient_user_ids,person),version=version+1
  where person=any(e.recipient_user_ids);
 delete from public.friend_invitations i where i.id=any(friend_invites);
 delete from public.friends f where person in(f.low_user_id,f.high_user_id);
 delete from public.devices t where t.user_id=person;

 -- Same dependency ordering as GM-17 retention, scoped to this account.
 delete from public.votes v using public.submissions s,public.members m
  where v.submission_id=s.id and s.member_id=m.id and (m.user_id=person or s.room_id=any(rooms));
 delete from public.submissions s using public.members m
  where s.member_id=m.id and (m.user_id=person or s.room_id=any(rooms));
 delete from public.results r where r.room_id=any(rooms);
 delete from public.round_dishes d where d.room_id=any(rooms);
 delete from public.preferences p where p.user_id=person or p.room_id=any(rooms);
 delete from dish_v3_private.ballots b where b.user_id=person;
 delete from dish_v4_private.ballots b where b.user_id=person;
 delete from public.members m where m.user_id=person or m.room_id=any(rooms);

 -- Other viewers' retained grants must survive deletion of the operational room.
 update public.consents c set room_id=null,retention_detached=true,version=version+1
 where c.room_id=any(rooms) and c.user_id<>person and (
  exists(select 1 from gm06_canonical.history_audience a where a.consent_id=c.id)
  or exists(select 1 from public.histories h where c.id=any(h.consent_ids)));
 delete from public.consents c where c.user_id=person or c.room_id=any(rooms);
 delete from gm21_private.settings s where s.user_id=person;
 delete from public.idempotency a where a.user_id=person or a.response->>'roomId' in
  (select id::text from unnest(rooms) id);
 delete from dish_v3_private.acks a where a.user_id=person or a.response->>'roomId' in
  (select id::text from unnest(rooms) id);
 delete from dish_v4_private.request_acks a where a.user_id=person or a.response#>>'{data,roomId}' in
  (select id::text from unnest(rooms) id);
 delete from gm20_canonical_private.request_acks a where a.user_id=person or a.response#>>'{data,roomId}' in
  (select id::text from unnest(rooms) id);
 delete from public.rooms r where r.id=any(rooms);
 delete from public.profiles p where p.user_id=person;

 update gm49_private.requests q set completed=true,person=null,session_key=null where q.person=old.id;
 perform set_config('dish_v3.writer',coalesce(v3_guard,'off'),true);
 perform set_config('dish_v4.writer',coalesce(v4_guard,'off'),true);
 return old;
end $$;
create trigger gm49_remove_user_data before delete on auth.users
 for each row execute function gm49_private.before_user_delete();

alter function gm17_private.cleanup() rename to cleanup_before_gm49;
revoke all on function gm17_private.cleanup_before_gm49() from public,anon,authenticated,service_role,gm06_publisher;
create function gm17_private.cleanup() returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform 1 from gm06_private.reference_epoch where singleton for update;
 delete from gm49_private.requests where expires_at<=statement_timestamp();
 return gm17_private.cleanup_before_gm49();
end $$;
revoke all on function gm17_private.cleanup() from public,anon,authenticated,service_role,gm06_publisher;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values ('0.31.8','release-v1/2026-11-20/GM-49.1','1.1.0','1.1.0','GM-16/#183; GM-42/0058; GM-45/0061');
commit;
