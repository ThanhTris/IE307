-- ADR-026: in-app notifications.
--  1. The sender of a friend invite is told when it is accepted (FRIEND_ACCEPTED): a server event and inbox row,
--     so it arrives even when the sender was offline instead of the app guessing from the friend list.
--  2. Inbox rows say what happened in plain words: who asked to be friends, who accepted, who invites you to eat,
--     which dish the group picked or that no common dish was found.
-- Additive: new event kind + trigger, and a wrapper over the existing list_partner_inbox (same shape and keys; the
-- only new type is `friend_accepted` with metadata { invitationId }). Earlier migrations are untouched.
begin;

alter table public.events drop constraint if exists events_kind_shape;
alter table public.events add constraint events_kind_shape
  check (kind in ('ROOM_INVITED', 'ROOM_RESULT_READY', 'FRIEND_INVITED', 'FRIEND_ACCEPTED'));
alter table public.events drop constraint if exists events_result_reference_shape;
alter table public.events add constraint events_result_reference_shape check (
  ((kind = 'ROOM_INVITED') and invitation_id is not null and result_id is null and dish_v4_result_id is null)
  or ((kind = 'ROOM_RESULT_READY') and invitation_id is null
    and ((result_id is not null and dish_v4_result_id is null) or (result_id is null and dish_v4_result_id is not null)))
  or ((kind in ('FRIEND_INVITED', 'FRIEND_ACCEPTED')) and room_id is null and invitation_id is null
    and friend_invitation_id is not null and result_id is null and dish_v4_result_id is null)
);

create function gm22_private.notify_friend_accepted() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare key text := 'friend-accepted:' || new.id::text; expiry timestamptz := statement_timestamp() + interval '7 days';
begin
  if old.state = 'pending' and new.state = 'accepted' then
    insert into public.events(id, kind, room_id, invitation_id, friend_invitation_id, result_id, recipient_user_ids, dedupe_key, created_at, expires_at, version)
    values (gen_random_uuid(), 'FRIEND_ACCEPTED', null, null, new.id, null, array[new.sender_user_id], key, statement_timestamp(), expiry, 1)
    on conflict (dedupe_key) do nothing;
    insert into public.inbox(id, owner_user_id, event_id, created_at, expires_at, version)
    select gen_random_uuid(), new.sender_user_id, e.id, e.created_at, e.expires_at, 1
    from public.events e where e.dedupe_key = key
    on conflict (owner_user_id, event_id) do nothing;
  end if;
  return new;
end $$;
revoke all on function gm22_private.notify_friend_accepted() from public, anon, authenticated, service_role;
create trigger gm22_friend_accepted_notice after update of state on public.friend_invitations
  for each row execute function gm22_private.notify_friend_accepted();

alter function public.list_partner_inbox(text) rename to list_partner_inbox_before_notification_text;
revoke all on function public.list_partner_inbox_before_notification_text(text) from public, anon, authenticated, service_role;

create function public.list_partner_inbox(cursor text default null) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare rows jsonb;
begin
  rows := public.list_partner_inbox_before_notification_text(cursor);
  if jsonb_typeof(rows) <> 'array' then return rows; end if;
  return coalesce((
    select jsonb_agg(
      case
        when src.kind = 'FRIEND_ACCEPTED' then jsonb_build_object(
          'id', v->'id', 'eventId', v->'eventId', 'type', 'friend_accepted',
          'title', 'Kết bạn thành công',
          'body', coalesce(accepter.name, 'Một người bạn') || ' đã chấp nhận lời mời kết bạn của bạn',
          'read', v->'read', 'metadata', jsonb_build_object('invitationId', src.friend_invitation_id::text), 'createdAt', v->'createdAt')
        when v->>'type' = 'room_invite' and room_sender.name is not null
          then jsonb_set(jsonb_set(v, '{title}', to_jsonb(room_sender.name)), '{body}', to_jsonb('rủ bạn đi ăn'::text))
        when v->>'type' = 'room_result' and res.status = 'DECIDED' and res.dish is not null
          then jsonb_set(jsonb_set(v, '{title}', to_jsonb('Đã chốt món'::text)), '{body}', to_jsonb('Nhóm chọn: ' || res.dish))
        when v->>'type' = 'room_result' and res.status = 'NO_CONSENSUS'
          then jsonb_set(jsonb_set(v, '{title}', to_jsonb('Chưa chốt được món'::text)), '{body}', to_jsonb('Phòng kết thúc mà chưa có món chung'::text))
        else v
      end order by ord)
    from jsonb_array_elements(rows) with ordinality t(v, ord)
    left join lateral (
      select e.kind, e.friend_invitation_id
      from public.inbox i join public.events e on e.id = i.event_id
      where i.id::text = v->>'id'
    ) src on true
    left join lateral (
      select p.display_name as name
      from public.friend_invitations f join public.profiles p on p.user_id = f.recipient_user_id
      where src.kind = 'FRIEND_ACCEPTED' and f.id = src.friend_invitation_id
    ) accepter on true
    left join lateral (
      select p.display_name as name
      from public.room_invitations r join public.profiles p on p.user_id = r.sender_user_id
      where v->>'type' = 'room_invite' and r.id::text = v->'metadata'->>'invitationId'
    ) room_sender on true
    left join lateral (
      select * from (
        select r.status,
          (select d->>'name' from jsonb_array_elements(r.locked_pool) d where d->>'dishId' = r.winner_dish_id::text limit 1) as dish
        from gm06_canonical.results r
        where v->>'type' = 'room_result' and r.result_id::text = v->'metadata'->>'resultId'
        union all
        select case when r4.winner_dish_id is null then 'NO_CONSENSUS' else 'DECIDED' end, r4.projection->'winner'->>'name'
        from dish_v4_private.results r4
        where v->>'type' = 'room_result' and r4.id::text = v->'metadata'->>'resultId'
      ) found limit 1
    ) res on true
  ), '[]'::jsonb);
end $$;
revoke all on function public.list_partner_inbox(text) from public, anon, authenticated, service_role;
grant execute on function public.list_partner_inbox(text) to authenticated;

insert into public.schema_versions(schema_version, contract_id, food_contract_version, core_contract_version, upstream_revision)
values ('0.28.0', 'dish-session-v4/roadmap-v2/GM-07.B-supplement', '1.1.0', '1.1.0', 'ADR-026/0052_inbox_friend_accepted');

commit;
