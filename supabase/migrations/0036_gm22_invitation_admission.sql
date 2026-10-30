-- GM-22.2: invitation admission follows the policy pinned to the room.
-- Existing GM-22 RPC signatures and wire DTOs remain unchanged.
begin;

create or replace function public.unfriend("requestId" text, partner_id text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare
  caller uuid:=gm19_private.require_auth();
  request_key uuid;
  target uuid;
  pair_key uuid;
  room_key uuid;
  invitation_key uuid;
  payload_key text;
  ack jsonb;
  wire jsonb;
begin
  begin request_key:=gm19_private.request_uuid("requestId"); target:=partner_id::uuid;
  exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload_key:=gm19_private.hash_payload(jsonb_build_object('partnerId',target));
  ack:=gm19_private.ack_lookup('unfriend',request_key,payload_key);
  if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('unfriend',30) then return gm19_private.error('RATE_LIMITED',429,null,request_key); end if;

  -- Shared lock order: request reference (ack_lookup) -> canonical pair ->
  -- room UUID order -> invitation UUID order. This agrees with accept/invite.
  select f.id into pair_key from public.friends f
    where f.low_user_id=least(caller,target) and f.high_user_id=greatest(caller,target)
    for update;
  for room_key in
    select distinct i.room_id from public.room_invitations i
    where i.state='pending'
      and ((i.sender_user_id=caller and i.recipient_user_id=target)
        or (i.sender_user_id=target and i.recipient_user_id=caller))
    order by i.room_id
  loop
    perform 1 from public.rooms r where r.id=room_key for update;
  end loop;
  for invitation_key in
    select i.id from public.room_invitations i
    where i.state='pending'
      and ((i.sender_user_id=caller and i.recipient_user_id=target)
        or (i.sender_user_id=target and i.recipient_user_id=caller))
    order by i.id
  loop
    perform 1 from public.room_invitations i where i.id=invitation_key for update;
  end loop;

  delete from public.friends where id=pair_key;
  update public.room_invitations i
    set state='cancelled',responded_at=statement_timestamp(),version=i.version+1
    where i.state='pending'
      and ((i.sender_user_id=caller and i.recipient_user_id=target)
        or (i.sender_user_id=target and i.recipient_user_id=caller));
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'data',null);
  perform gm19_private.save_ack('unfriend',request_key,payload_key,null,null,null,1,wire);
  return wire;
end $$;

create or replace function public.accept_room_invite("requestId" text, invitation_id text, display_name text) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public,gm19_private,gm22_private,dish_v4_private as $$
declare
  caller uuid:=gm19_private.require_auth();
  request_key uuid;
  iid uuid;
  pair_key uuid;
  room_key uuid;
  payload jsonb;
  payload_key text;
  ack jsonb;
  probe public.room_invitations%rowtype;
  inv public.room_invitations%rowtype;
  r public.rooms%rowtype;
  m public.members%rowtype;
  name_value text;
  new_version bigint;
  wire jsonb;
  admitted jsonb;
  member_exists boolean;
  pair_exists boolean;
  room_exists boolean;
  previous_v3_writer text:=current_setting('dish_v3.writer',true);
begin
  begin request_key:=gm19_private.request_uuid("requestId"); iid:=invitation_id::uuid;
  exception when others then return gm19_private.error('INVALID_INPUT',400); end;
  payload:=jsonb_build_object('invitationId',iid,'displayName',display_name);
  payload_key:=gm19_private.hash_payload(payload);
  -- ACK replay precedes quota and mutable invite/room/pair checks.
  ack:=gm19_private.ack_lookup('accept_room_invite',request_key,payload_key);
  if ack->>'kind'<>'missing' then return gm19_private.replay_or_reused(ack,null,request_key); end if;
  if not gm19_private.allow_call('accept_room_invite',30) then return gm19_private.error('RATE_LIMITED',429,null,request_key); end if;

  -- This unlocked read identifies the lock keys only. All authorization and
  -- mutable fields are re-read after taking pair -> room -> invitation locks.
  select * into probe from public.room_invitations i where i.id=iid;
  if not found or probe.recipient_user_id<>caller then
    return gm19_private.error('NOT_RECIPIENT',403,null,request_key);
  end if;
  pair_key:=probe.friend_id;
  room_key:=probe.room_id;
  perform 1 from public.friends f
    where f.id=pair_key
      and f.low_user_id=least(probe.sender_user_id,probe.recipient_user_id)
      and f.high_user_id=greatest(probe.sender_user_id,probe.recipient_user_id)
    for update;
  pair_exists:=found;
  select * into r from public.rooms room_row where room_row.id=room_key for update;
  room_exists:=found;
  select * into inv from public.room_invitations invitation_row where invitation_row.id=iid for update;
  if not found or inv.recipient_user_id<>caller then
    return gm19_private.error('NOT_RECIPIENT',403,room_key,request_key);
  end if;
  if inv.room_id<>room_key or inv.friend_id<>pair_key
    or inv.sender_user_id<>probe.sender_user_id or inv.recipient_user_id<>probe.recipient_user_id then
    return gm19_private.error('INVITE_CANCELLED',409,room_key,request_key);
  end if;
  if inv.state<>'pending' then return gm19_private.error('INVITE_CANCELLED',409,room_key,request_key); end if;
  if not pair_exists then return gm19_private.error('NOT_PARTNER',403,room_key,request_key); end if;
  if not room_exists or r.expires_at<=statement_timestamp() then
    return gm19_private.error('ROOM_EXPIRED',410,room_key,request_key);
  end if;
  if inv.expires_at<=statement_timestamp() then return gm19_private.error('INVITE_EXPIRED',410,room_key,request_key); end if;
  if r.state<>'LOBBY' then return gm19_private.error('ROOM_LOCKED',409,room_key,request_key); end if;
  if not exists(select 1 from public.members active_inviter
      where active_inviter.room_id=room_key and active_inviter.user_id=inv.sender_user_id
        and active_inviter.left_at is null) then
    return gm19_private.error('NOT_MEMBER',403,room_key,request_key);
  end if;
  if display_name is null or length(btrim(display_name))<1 or length(btrim(display_name))>24
    or btrim(display_name)~'[[:cntrl:]]' then
    return gm19_private.error('INVALID_INPUT',400,room_key,request_key);
  end if;

  if r.policy_version='dish-decision-v4' then
    -- GM-07.B and B-supplement share the GM-19/20 admission helper. An active
    -- member is a no-op; a new member snapshots account defaults without
    -- rebuilding the pinned pool or changing poolVersion.
    admitted:=dish_v4_private.admit_member(r.id,caller,display_name);
    if admitted->>'ok'<>'true' then return admitted; end if;
    select room_row.version into new_version from public.rooms room_row where room_row.id=r.id;
  elsif r.policy_version='dish-decision-v3' then
    -- Match v3 direct join: capacity 20, preserve an active member, and do not
    -- run the decision-v2 ready/preference/pool-refresh path.
    select * into m from public.members member_row
      where member_row.room_id=r.id and member_row.user_id=caller for update;
    member_exists:=found;
    if not member_exists or m.left_at is not null then
      if (select count(*) from public.members active_member
          where active_member.room_id=r.id and active_member.left_at is null)>=20 then
        return gm19_private.error('ROOM_FULL',409,r.id,request_key);
      end if;
      perform set_config('dish_v3.writer','on',true);
      if not member_exists then
        insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
          values(gen_random_uuid(),r.id,caller,btrim(display_name),false,false,statement_timestamp(),null,1);
      else
        update public.members member_row
          set left_at=null,nickname=btrim(display_name),joined_at=statement_timestamp(),version=member_row.version+1
          where member_row.id=m.id;
      end if;
      update public.rooms room_row set version=room_row.version+1,updated_at=statement_timestamp()
        where room_row.id=r.id returning room_row.version into new_version;
      perform set_config('dish_v3.writer',coalesce(previous_v3_writer,'off'),true);
    else
      new_version:=r.version;
    end if;
  else
    -- Preserve decision-v2 capacity and its published legacy refresh semantics.
    select * into m from public.members member_row
      where member_row.room_id=r.id and member_row.user_id=caller for update;
    member_exists:=found;
    if not member_exists or m.left_at is not null then
      if (select count(*) from public.members active_member
          where active_member.room_id=r.id and active_member.left_at is null)>=8 then
        return gm19_private.error('ROOM_FULL',409,r.id,request_key);
      end if;
      if not member_exists then
        insert into public.members(id,room_id,user_id,nickname,ready,history_consent,joined_at,left_at,version)
          values(gen_random_uuid(),r.id,caller,btrim(display_name),false,false,statement_timestamp(),null,1);
      else
        update public.members member_row
          set nickname=btrim(display_name),left_at=null,ready=false,version=member_row.version+1
          where member_row.id=m.id;
      end if;
      insert into public.preferences(id,room_id,user_id,cuisine_ids,category_ids,temperature,flavor,updated_at,version)
        values(gen_random_uuid(),r.id,caller,'{}','{}',null,null,statement_timestamp(),1)
        on conflict(room_id,user_id) do nothing;
      update public.rooms room_row
        set roster_user_ids=array_append(array_remove(room_row.roster_user_ids,caller),caller),
          version=room_row.version+1,updated_at=statement_timestamp()
        where room_row.id=r.id returning room_row.version into new_version;
      perform gm19_private.refresh_lobby_pool(r.id);
      select room_row.version into new_version from public.rooms room_row where room_row.id=r.id;
    else
      new_version:=r.version;
    end if;
  end if;

  update public.room_invitations invitation_row
    set state='accepted',responded_at=statement_timestamp(),version=invitation_row.version+1
    where invitation_row.id=iid;
  select * into r from public.rooms room_row where room_row.id=room_key;
  wire:=jsonb_build_object('roomId',r.id::text,'code',r.code,'version',new_version,
    'memberId',(select member_row.id::text from public.members member_row
      where member_row.room_id=r.id and member_row.user_id=caller and member_row.left_at is null));
  wire:=jsonb_build_object('ok',true,'requestId',"requestId",'roomId',r.id,
    'version',new_version,'state','LOBBY','data',wire);
  perform gm19_private.save_ack('accept_room_invite',request_key,payload_key,r.id,null,null,new_version,wire);
  return wire;
exception when sqlstate 'PT401' then return gm19_private.error('AUTH_REQUIRED',401); end $$;

-- Keep the missing-JWT path inside the function's exception handler. The
-- baseline declaration initialized caller before BEGIN, outside that handler.
create or replace function public.list_friends() returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private, gm22_private as $$
declare caller uuid;
begin
  caller:=gm19_private.require_auth();
  if not gm19_private.allow_call('list_friends',60) then return gm22_private.social_error('RATE_LIMITED',429); end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',f.id::text,'friendUserId',other.user_id::text,
      'displayName',other.display_name,'friendCode',other.friend_code,'status','active','since',f.accepted_at) order by other.display_name)
    from public.friends f join public.profiles other on other.user_id=case when f.low_user_id=caller then f.high_user_id else f.low_user_id end
    where caller in (f.low_user_id,f.high_user_id)),'[]'::jsonb);
exception when sqlstate 'PT401' then return gm22_private.social_error('AUTH_REQUIRED',401); end $$;

-- Allow the missing-JWT request to reach the guarded function and return the
-- stable application error. The guard runs before reads or quota changes.
grant execute on function public.list_friends() to anon;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.13.0','food-v1/roadmap-v2/GM-22.2','1.1.0','1.1.0','GM19.2/0034; GM20.4/0035; invitation-admission-v4');

commit;
