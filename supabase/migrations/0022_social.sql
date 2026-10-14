-- GM-22.1 social identities, partner relations, and room invitations.
-- This migration is additive: it reuses GM-17/19 references, ACKs, rate
-- windows, and the GM-07 DTO boundary.  No client table writes are granted.
begin;

create schema if not exists gm22_private;
revoke all on schema gm22_private from public, anon, authenticated, service_role;
alter default privileges in schema gm22_private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema gm22_private revoke execute on functions from public, anon, authenticated, service_role;

-- A pair may be deleted while room invitations/events still retain their
-- neutral reference.  Keep the UUID-only reference until GM-17 cleanup sees
-- no invitation/event/ACK edge.
create table gm22_private.friend_refs (id uuid primary key);
alter table gm22_private.friend_refs enable row level security;
alter table gm22_private.friend_refs force row level security;
revoke all on gm22_private.friend_refs from public, anon, authenticated, service_role, gm06_publisher;
insert into gm22_private.friend_refs select id from public.friends;
create function gm22_private.register_friend_ref() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
begin
  insert into gm22_private.friend_refs(id) values(new.id) on conflict do nothing;
  return new;
end $$;
create trigger gm22_friend_ref after insert on public.friends for each row execute function gm22_private.register_friend_ref();
create function gm22_private.cleanup_friend_ref() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists(select 1 from public.room_invitations where friend_id=old.id)
     and not exists(select 1 from public.events e join public.room_invitations i on i.event_id=e.id where i.friend_id=old.id) then
    delete from gm22_private.friend_refs where id=old.id;
  end if;
  return old;
end $$;
create trigger gm22_friend_ref_cleanup after delete on public.friends for each row execute function gm22_private.cleanup_friend_ref();
alter table public.room_invitations drop constraint if exists room_invitations_friend_id_fk;
alter table public.room_invitations add constraint room_invitations_friend_ref_fk
  foreign key(friend_id) references gm22_private.friend_refs(id) deferrable initially deferred;

alter table public.profiles add column if not exists friend_code text;
alter table public.profiles add column if not exists avatar_seed text;
alter table public.profiles add constraint profiles_friend_code_shape
  check (friend_code is null or friend_code ~ '^[A-HJ-NP-Z2-9]{10}$');
alter table public.profiles add constraint profiles_avatar_seed_shape
  check (avatar_seed is null or (length(avatar_seed) between 1 and 64 and avatar_seed !~ '[[:cntrl:]]'));
create unique index if not exists profiles_friend_code_uq on public.profiles(friend_code) where friend_code is not null;

create function gm22_private.friend_code() returns text
language plpgsql volatile security definer set search_path = pg_catalog, extensions as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; value text := ''; i integer;
begin
  for i in 0..9 loop
    value := value || substr(alphabet, 1 + (get_byte(extensions.digest(gen_random_uuid()::text::bytea,'sha256'), i % 32) % length(alphabet)), 1);
  end loop;
  return value;
end $$;

create function gm22_private.valid_name(raw text) returns text
language sql immutable security definer set search_path = pg_catalog as $$
  select case when raw is not null and length(btrim(raw)) between 1 and 24
    and btrim(raw) !~ '[[:cntrl:]]' then btrim(raw) else 'Khách' end
$$;

create function gm22_private.ensure_profile(user_key uuid, raw_name text default null) returns void
language plpgsql security definer set search_path = pg_catalog, public, gm22_private, extensions as $$
declare code text; name_value text := gm22_private.valid_name(raw_name); seed text := encode(extensions.digest(user_key::text,'sha256'),'hex');
begin
  loop
    code := gm22_private.friend_code();
    begin
      insert into public.profiles(id,user_id,display_name,created_at,version,friend_code,avatar_seed)
      values(gen_random_uuid(),user_key,name_value,statement_timestamp(),1,code,seed)
      on conflict (user_id) do update set friend_code=coalesce(public.profiles.friend_code,excluded.friend_code),
        avatar_seed=coalesce(public.profiles.avatar_seed,excluded.avatar_seed),
        display_name=case when public.profiles.display_name='Khách' then excluded.display_name else public.profiles.display_name end,
        version=public.profiles.version+1;
      exit;
    exception when unique_violation then
      -- A concurrent profile can win either the user or code constraint.
      if exists(select 1 from public.profiles where user_id=user_key and friend_code is not null) then exit; end if;
    end;
  end loop;
end $$;

create function gm22_private.auth_user_profile() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, gm22_private as $$
begin
  perform gm22_private.ensure_profile(new.id, new.raw_user_meta_data->>'display_name');
  return new;
end $$;
drop trigger if exists gm22_profile_on_auth_user on auth.users;
create trigger gm22_profile_on_auth_user after insert on auth.users for each row execute function gm22_private.auth_user_profile();

-- Backfill existing guest identities before the public profile projection is used.
do $$ declare u record; begin
  for u in select au.id, au.raw_user_meta_data->>'display_name' as display_name from auth.users au loop
    perform gm22_private.ensure_profile(u.id,u.display_name);
  end loop;
end $$;

alter table public.events alter column room_id drop not null;
alter table public.events add column if not exists friend_invitation_id uuid;
alter table public.events drop constraint if exists events_kind_shape;
alter table public.events drop constraint if exists events_check;
alter table public.events drop constraint if exists events_check1;
alter table public.events drop constraint if exists events_check2;
alter table public.events add constraint events_kind_shape check (kind in ('ROOM_INVITED','ROOM_RESULT_READY','FRIEND_INVITED'));
alter table public.events add constraint events_social_shape check (
  (kind='ROOM_INVITED' and room_id is not null and invitation_id is not null and friend_invitation_id is null and result_id is null)
  or (kind='ROOM_RESULT_READY' and room_id is not null and invitation_id is null and friend_invitation_id is null and result_id is not null)
  or (kind='FRIEND_INVITED' and room_id is null and invitation_id is null and friend_invitation_id is not null and result_id is null)
);
alter table public.events add constraint events_friend_invitation_fk
  foreign key(friend_invitation_id) references public.friend_invitations(id) deferrable initially deferred;
create index if not exists events_friend_invitation_id_idx on public.events(friend_invitation_id);

create function gm22_private.cleanup_friend_event() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  delete from public.inbox where event_id in (select id from public.events where friend_invitation_id=old.id);
  delete from public.deliveries where event_id in (select id from public.events where friend_invitation_id=old.id);
  delete from public.events where friend_invitation_id=old.id;
  return old;
end $$;
create trigger gm22_friend_invite_cleanup before delete on public.friend_invitations
  for each row execute function gm22_private.cleanup_friend_event();

create unique index if not exists friend_invitations_pending_pair_uq
  on public.friend_invitations(least(sender_user_id,recipient_user_id),greatest(sender_user_id,recipient_user_id))
  where state='pending';
create unique index if not exists room_invitations_pending_room_recipient_uq
  on public.room_invitations(room_id,recipient_user_id) where state='pending';
create index if not exists profiles_friend_code_idx on public.profiles(friend_code);

create function gm22_private.friend_projection(inv public.friend_invitations) returns jsonb
language sql stable security definer set search_path = pg_catalog, public as $$
  select jsonb_build_object('id',inv.id::text,'inviterUserId',inv.sender_user_id::text,
    'inviterName',coalesce(sender.display_name,'Khách'),'inviteeUserId',inv.recipient_user_id::text,
    'status',case when inv.state='pending' and inv.expires_at<=statement_timestamp() then 'expired' else inv.state end,
    'createdAt',inv.created_at,'expiresAt',inv.expires_at)
  from public.profiles sender where sender.user_id=inv.sender_user_id
$$;

create function gm22_private.room_projection(inv public.room_invitations) returns jsonb
language sql stable security definer set search_path = pg_catalog, public as $$
  select jsonb_build_object('id',inv.id::text,'roomId',inv.room_id::text,'roomCode',r.code,
    'inviterUserId',inv.sender_user_id::text,'inviterName',coalesce(sender.display_name,'Khách'),
    'inviteeUserId',inv.recipient_user_id::text,
    'status',case when inv.state='pending' and inv.expires_at<=statement_timestamp() then 'expired' else inv.state end,
    'createdAt',inv.created_at,'expiresAt',inv.expires_at)
  from public.rooms r join public.profiles sender on sender.user_id=inv.sender_user_id where r.id=inv.room_id
$$;

create function gm22_private.social_error(code text, status integer, room uuid default null, request_key uuid default null)
returns jsonb language sql security definer set search_path = pg_catalog, gm19_private as $$
  select gm19_private.error(code,status,room,request_key)
$$;

create function public.get_my_social_identity() returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid:=gm19_private.require_auth(); p public.profiles%rowtype;
begin
  if not gm19_private.allow_call('get_my_social_identity',60) then return gm22_private.social_error('RATE_LIMITED',429); end if;
  perform gm22_private.ensure_profile(caller);
  select * into p from public.profiles where user_id=caller;
  return jsonb_build_object('id',p.user_id::text,'displayName',p.display_name,'friendCode',p.friend_code,'avatarSeed',p.avatar_seed);
exception when sqlstate 'PT401' then return gm22_private.social_error('AUTH_REQUIRED',401); end $$;

create function public.list_friends() returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid:=gm19_private.require_auth();
begin
  if not gm19_private.allow_call('list_friends',60) then return gm22_private.social_error('RATE_LIMITED',429); end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',f.id::text,'friendUserId',other.user_id::text,
      'displayName',other.display_name,'friendCode',other.friend_code,'status','active','since',f.accepted_at) order by other.display_name)
    from public.friends f join public.profiles other on other.user_id=case when f.low_user_id=caller then f.high_user_id else f.low_user_id end
    where caller in (f.low_user_id,f.high_user_id)),'[]'::jsonb);
exception when sqlstate 'PT401' then return gm22_private.social_error('AUTH_REQUIRED',401); end $$;

create function public.invite_partner("requestId" text, friend_code text default null, partner_id text default null) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; payload jsonb; payload_key text; ack jsonb; target uuid; inv public.friend_invitations%rowtype; wire jsonb; name_value text;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); target:=gm19_private.uuid_or_null(partner_id); exception when others then return gm22_private.social_error('INVALID_INPUT',400); end;
  if ($2 is null) = (target is null) then return gm22_private.social_error('INVALID_INPUT',400); end if;
  if $2 is not null then select p.user_id into target from public.profiles p where p.friend_code=upper(btrim($2)); end if;
  if target is null or target=caller then return gm22_private.social_error('INVALID_INPUT',400, null,request_key); end if;
  if not exists(select 1 from auth.users where id=target) then return gm22_private.social_error('INVALID_INPUT',400,null,request_key); end if;
  payload:=jsonb_build_object('friendCode',$2,'partnerId',target); payload_key:=gm19_private.hash_payload(payload);
  ack:=gm19_private.ack_lookup('create_friend_invite',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('invite_partner',10) then return gm22_private.social_error('RATE_LIMITED',429,null,request_key); end if;
  if exists(select 1 from public.friends where low_user_id=least(caller,target) and high_user_id=greatest(caller,target)) then return gm22_private.social_error('NOT_PARTNER',409,null,request_key); end if;
  update public.friend_invitations set state='expired',responded_at=expires_at-interval '1 microsecond',version=version+1
    where state='pending' and expires_at<=statement_timestamp()
      and least(sender_user_id,recipient_user_id)=least(caller,target)
      and greatest(sender_user_id,recipient_user_id)=greatest(caller,target);
  select * into inv from public.friend_invitations where state='pending' and least(sender_user_id,recipient_user_id)=least(caller,target) and greatest(sender_user_id,recipient_user_id)=greatest(caller,target) for update;
  if not found then
    inv.id:=gen_random_uuid(); inv.sender_user_id:=caller; inv.recipient_user_id:=target; inv.state:='pending'; inv.created_at:=statement_timestamp(); inv.expires_at:=statement_timestamp()+interval '7 days'; inv.version:=1;
    insert into public.friend_invitations(id,sender_user_id,recipient_user_id,state,created_at,expires_at,version) values(inv.id,inv.sender_user_id,inv.recipient_user_id,inv.state,inv.created_at,inv.expires_at,inv.version);
    insert into public.events(id,kind,room_id,invitation_id,friend_invitation_id,result_id,recipient_user_ids,dedupe_key,created_at,expires_at,version)
      values(gen_random_uuid(),'FRIEND_INVITED',null,null,inv.id,null,array[caller,target], 'friend:'||inv.id::text,statement_timestamp(),inv.expires_at,1);
    insert into public.inbox(id,owner_user_id,event_id,created_at,expires_at,version)
      select gen_random_uuid(),target,e.id,e.created_at,e.expires_at,1 from public.events e where e.friend_invitation_id=inv.id;
  end if;
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'data',gm22_private.friend_projection(inv));
  perform gm19_private.save_ack('create_friend_invite',request_key,payload_key,null,null,null,1,wire); return wire;
end $$;

create function public.accept_partner("requestId" text, invitation_id text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; iid uuid; inv public.friend_invitations%rowtype; payload jsonb; payload_key text; ack jsonb; wire jsonb; low uuid; high uuid;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); iid:=invitation_id::uuid; exception when others then return gm22_private.social_error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('invitationId',iid); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('accept_friend_invite',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('accept_partner',30) then return gm22_private.social_error('RATE_LIMITED',429,null,request_key); end if;
  update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
  select * into inv from public.friend_invitations where id=iid for update;
  if not found or inv.recipient_user_id<>caller then return gm22_private.social_error('NOT_RECIPIENT',403,null,request_key); end if;
  if inv.state<>'pending' then return gm22_private.social_error(case when inv.state in ('rejected','cancelled') then 'INVITE_CANCELLED' else 'INVITE_REJECTED' end,409,null,request_key); end if;
  if inv.expires_at<=statement_timestamp() then return gm22_private.social_error('INVITE_EXPIRED',410,null,request_key); end if;
  low:=least(inv.sender_user_id,inv.recipient_user_id); high:=greatest(inv.sender_user_id,inv.recipient_user_id);
  insert into public.friends(id,low_user_id,high_user_id,accepted_at,version) values(gen_random_uuid(),low,high,statement_timestamp(),1) on conflict (low_user_id,high_user_id) do nothing;
  update public.friend_invitations set state='accepted',responded_at=statement_timestamp(),version=version+1 where id=iid;
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'data',null); perform gm19_private.save_ack('accept_friend_invite',request_key,payload_key,null,null,null,1,wire); return wire;
end $$;

create function public.reject_partner("requestId" text, invitation_id text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; iid uuid; inv public.friend_invitations%rowtype; payload_key text; ack jsonb; wire jsonb;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); iid:=invitation_id::uuid; exception when others then return gm22_private.social_error('INVALID_INPUT',400); end;
  payload_key:=gm19_private.hash_payload(jsonb_build_object('invitationId',iid)); ack:=gm19_private.ack_lookup('reject_friend_invite',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('reject_partner',30) then return gm22_private.social_error('RATE_LIMITED',429,null,request_key); end if;
  select * into inv from public.friend_invitations where id=iid for update;
  if not found or inv.recipient_user_id<>caller then return gm22_private.social_error('NOT_RECIPIENT',403,null,request_key); end if;
  if inv.state<>'pending' then return gm22_private.social_error('INVITE_CANCELLED',409,null,request_key); end if;
  if inv.expires_at<=statement_timestamp() then return gm22_private.social_error('INVITE_EXPIRED',410,null,request_key); end if;
  update public.friend_invitations set state='rejected',responded_at=statement_timestamp(),version=version+1 where id=iid;
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'data',null); perform gm19_private.save_ack('reject_friend_invite',request_key,payload_key,null,null,null,1,wire); return wire;
end $$;

create function public.unfriend("requestId" text, partner_id text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; target uuid; payload_key text; ack jsonb; wire jsonb;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); target:=partner_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload_key:=gm19_private.hash_payload(jsonb_build_object('partnerId',target)); ack:=gm19_private.ack_lookup('unfriend',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('unfriend',30) then return gm19_private.error('RATE_LIMITED',429,null,request_key); end if;
  delete from public.friends where low_user_id=least(caller,target) and high_user_id=greatest(caller,target);
  update public.room_invitations set state='cancelled',responded_at=statement_timestamp(),version=version+1 where state='pending' and ((sender_user_id=caller and recipient_user_id=target) or (sender_user_id=target and recipient_user_id=caller));
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'data',null); perform gm19_private.save_ack('unfriend',request_key,payload_key,null,null,null,1,wire); return wire;
end $$;

create function public.invite_to_room("requestId" text, room_id text, partner_id text, expected_version bigint) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; rid uuid; target uuid; payload jsonb; payload_key text; ack jsonb; guard jsonb; r public.rooms%rowtype; f public.friends%rowtype; inv public.room_invitations%rowtype; event_key uuid; wire jsonb;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); rid:=room_id::uuid; target:=partner_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('roomId',rid,'partnerId',target,'expectedVersion',expected_version); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('create_room_invite',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,rid,request_key); end if;
  if not gm19_private.allow_call('invite_to_room',30) then return gm19_private.error('RATE_LIMITED',429,rid,request_key); end if;
  select * into f from public.friends where low_user_id=least(caller,target) and high_user_id=greatest(caller,target) for update;
  if not found then return gm19_private.error('NOT_PARTNER',403,rid,request_key); end if;
  guard:=gm19_private.room_guard(rid,expected_version,false); if guard is not null then return guard; end if;
  select * into r from public.rooms where id=rid for update; if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,rid,request_key); end if;
  update public.room_invitations i set state='expired',responded_at=i.expires_at-interval '1 microsecond',version=version+1
    where i.room_id=rid and i.recipient_user_id=target and i.state='pending' and i.expires_at<=statement_timestamp();
  select * into inv from public.room_invitations i where i.room_id=rid and i.recipient_user_id=target and i.state='pending' for update;
  if not found then
    inv.id:=gen_random_uuid(); inv.room_id:=rid; inv.friend_id:=f.id; inv.sender_user_id:=caller; inv.recipient_user_id:=target; inv.state:='pending'; inv.event_id:=gen_random_uuid(); inv.created_at:=statement_timestamp(); inv.expires_at:=least(r.expires_at,statement_timestamp()+interval '7 days'); inv.version:=1;
    insert into public.room_invitations(id,room_id,friend_id,sender_user_id,recipient_user_id,state,event_id,created_at,expires_at,version) values(inv.id,inv.room_id,inv.friend_id,inv.sender_user_id,inv.recipient_user_id,inv.state,inv.event_id,inv.created_at,inv.expires_at,inv.version);
    insert into public.events(id,kind,room_id,invitation_id,friend_invitation_id,result_id,recipient_user_ids,dedupe_key,created_at,expires_at,version)
      values(inv.event_id,'ROOM_INVITED',rid,inv.id,null,null,array[target],'room:'||rid::text||':'||target::text||':'||inv.id::text,inv.created_at,inv.expires_at,1);
    insert into public.inbox(id,owner_user_id,event_id,created_at,expires_at,version) values(gen_random_uuid(),target,inv.event_id,inv.created_at,inv.expires_at,1);
  end if;
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',rid,'version',r.version,'state','LOBBY','data',gm22_private.room_projection(inv));
  perform gm19_private.save_ack('create_room_invite',request_key,payload_key,rid,null,expected_version,r.version,wire); return wire;
end $$;

create function public.accept_room_invite("requestId" text, invitation_id text, display_name text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; iid uuid; payload jsonb; payload_key text; ack jsonb; inv public.room_invitations%rowtype; r public.rooms%rowtype; m public.members%rowtype; guard jsonb; name_value text; new_version bigint; wire jsonb;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); iid:=invitation_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('invitationId',iid,'displayName',display_name); payload_key:=gm19_private.hash_payload(payload); ack:=gm19_private.ack_lookup('accept_room_invite',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('accept_room_invite',30) then return gm19_private.error('RATE_LIMITED',429,null,request_key); end if;
  update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
  select * into inv from public.room_invitations where id=iid for update;
  if not found or inv.recipient_user_id<>caller then return gm19_private.error('NOT_RECIPIENT',403,null,request_key); end if;
  if inv.state<>'pending' then return gm19_private.error('INVITE_CANCELLED',409,inv.room_id,request_key); end if;
  if inv.expires_at<=statement_timestamp() then return gm19_private.error('INVITE_EXPIRED',410,inv.room_id,request_key); end if;
  select * into r from public.rooms where id=inv.room_id for update;
  if not found or r.expires_at<=statement_timestamp() then return gm19_private.error('ROOM_EXPIRED',410,inv.room_id,request_key); end if;
  if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,inv.room_id,request_key); end if;
  if not exists(select 1 from public.friends f where f.id=inv.friend_id and caller in (f.low_user_id,f.high_user_id)) then return gm19_private.error('NOT_PARTNER',403,inv.room_id,request_key); end if;
  if display_name is null or length(btrim(display_name))<1 or length(btrim(display_name))>24 or btrim(display_name)~'[[:cntrl:]]' then return gm19_private.error('INVALID_INPUT',400,inv.room_id,request_key); end if;
  select * into m from public.members where room_id=r.id and user_id=caller for update;
  if not found or m.left_at is not null then
    if (select count(*) from public.members where room_id=r.id and left_at is null)>=8 then return gm19_private.error('ROOM_FULL',409,r.id,request_key); end if;
    if not found then
      insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version) values(gen_random_uuid(),r.id,caller,btrim(display_name),false,false,statement_timestamp(),null,1);
    else
      update public.members set nickname=btrim(display_name),left_at=null,ready=false,version=version+1 where id=m.id;
    end if;
    insert into public.preferences(id,room_id,user_id,cuisine_ids,category_ids,temperature,flavor,updated_at,version) values(gen_random_uuid(),r.id,caller,'{}','{}',null,null,statement_timestamp(),1) on conflict(room_id,user_id) do nothing;
    update public.rooms set roster_user_ids=array_append(array_remove(roster_user_ids,caller),caller),version=version+1,updated_at=statement_timestamp() where id=r.id returning version into new_version;
    perform gm19_private.refresh_lobby_pool(r.id); select version into new_version from public.rooms where id=r.id;
  else new_version:=r.version;
  end if;
  update public.room_invitations set state='accepted',responded_at=statement_timestamp(),version=version+1 where id=iid;
  select * into r from public.rooms where id=r.id;
  wire:=jsonb_build_object('roomId',r.id::text,'code',r.code,'version',new_version,'memberId',(select id::text from public.members where room_id=r.id and user_id=caller and left_at is null));
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',r.id,'version',new_version,'state','LOBBY','data',wire); perform gm19_private.save_ack('accept_room_invite',request_key,payload_key,r.id,null,null,new_version,wire); return wire;
end $$;

create function public.reject_room_invite("requestId" text, invitation_id text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid:=gm19_private.require_auth(); request_key uuid; iid uuid; inv public.room_invitations%rowtype; payload_key text; ack jsonb; wire jsonb;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); iid:=invitation_id::uuid; exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload_key:=gm19_private.hash_payload(jsonb_build_object('invitationId',iid)); ack:=gm19_private.ack_lookup('reject_room_invite',request_key,payload_key); if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('reject_room_invite',30) then return gm19_private.error('RATE_LIMITED',429,null,request_key); end if;
  select * into inv from public.room_invitations where id=iid for update;
  if not found or inv.recipient_user_id<>caller then return gm19_private.error('NOT_RECIPIENT',403,null,request_key); end if;
  if inv.state<>'pending' then return gm19_private.error('INVITE_CANCELLED',409,inv.room_id,request_key); end if;
  if inv.expires_at<=statement_timestamp() then return gm19_private.error('INVITE_EXPIRED',410,inv.room_id,request_key); end if;
  update public.room_invitations set state='rejected',responded_at=statement_timestamp(),version=version+1 where id=iid;
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',inv.room_id,'data',null); perform gm19_private.save_ack('reject_room_invite',request_key,payload_key,inv.room_id,null,null,1,wire); return wire;
end $$;

create function public.list_partner_inbox(cursor text default null) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid:=gm19_private.require_auth(); cursor_id uuid;
begin
  if not gm19_private.allow_call('list_partner_inbox',60) then return gm22_private.social_error('RATE_LIMITED',429); end if;
  if cursor is not null then begin cursor_id:=cursor::uuid; exception when others then return gm22_private.social_error('INVALID_INPUT',400); end; end if;
  if cursor_id is not null and not exists(select 1 from public.inbox where id=cursor_id and owner_user_id=caller) then return gm22_private.social_error('NOT_MEMBER',403); end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',q.id::text,'eventId',q.event_id::text,
      'type',case when q.kind='FRIEND_INVITED' then 'friend_invite' when q.kind='ROOM_INVITED' then 'room_invite' else 'room_result' end,
      'title',case when q.kind='FRIEND_INVITED' then 'Lời mời kết bạn' when q.kind='ROOM_INVITED' then 'Lời mời vào phòng' else 'Kết quả phòng đã sẵn sàng' end,
      'body',case when q.kind='FRIEND_INVITED' then 'Bạn có lời mời kết bạn mới' when q.kind='ROOM_INVITED' then 'Bạn có lời mời vào phòng mới' else 'Phòng của bạn đã có kết quả' end,
      'read',q.read_at is not null,'metadata',case when q.kind='FRIEND_INVITED' then jsonb_build_object('invitationId',q.friend_invitation_id::text)
        when q.kind='ROOM_INVITED' then jsonb_build_object('invitationId',q.invitation_id::text,'roomId',q.room_id::text)
        else jsonb_build_object('roomId',q.room_id::text,'resultId',q.result_id::text) end,'createdAt',q.created_at) order by q.id desc)
    from (select i.id,i.event_id,i.read_at,i.created_at,e.kind,e.friend_invitation_id,e.invitation_id,e.room_id,e.result_id
      from public.inbox i join public.events e on e.id=i.event_id
      where i.owner_user_id=caller and i.expires_at>statement_timestamp() and (cursor_id is null or i.id<cursor_id)
      order by i.id desc limit 50) q),'[]'::jsonb);
exception when sqlstate 'PT401' then return gm22_private.social_error('AUTH_REQUIRED',401); end $$;

revoke all on function public.get_my_social_identity(),public.list_friends(),public.invite_partner(text,text,text),public.accept_partner(text,text),public.reject_partner(text,text),public.unfriend(text,text),public.invite_to_room(text,text,text,bigint),public.accept_room_invite(text,text,text),public.reject_room_invite(text,text),public.list_partner_inbox(text) from public,anon,authenticated,service_role;
grant execute on function public.get_my_social_identity(),public.list_friends(),public.invite_partner(text,text,text),public.accept_partner(text,text),public.reject_partner(text,text),public.unfriend(text,text),public.invite_to_room(text,text,text,bigint),public.accept_room_invite(text,text,text),public.reject_room_invite(text,text),public.list_partner_inbox(text) to authenticated;
revoke all on schema gm22_private from public,anon,authenticated,service_role;
alter table public.profiles enable row level security;
grant select(friend_code,avatar_seed) on public.profiles to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.4.0','food-v1/roadmap-v2/GM-22.1','1.1.0','1.1.0','GM-19 5b148de')
on conflict (schema_version) do nothing;
commit;
