-- Inbox rows name who sent the invitation: "Linh" / "muốn kết bạn với bạn" instead of the same generic
-- "Lời mời kết bạn" twice. Additive wrapper over the existing projection; shapes and keys are unchanged
-- (only title/body text differ), and rows whose sender cannot be resolved keep the generic text.
begin;

alter function public.list_partner_inbox(text) rename to list_partner_inbox_before_sender_names;
revoke all on function public.list_partner_inbox_before_sender_names(text) from public, anon, authenticated, service_role;

create function public.list_partner_inbox(cursor text default null) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare rows jsonb;
begin
  rows := public.list_partner_inbox_before_sender_names(cursor);
  if jsonb_typeof(rows) <> 'array' then return rows; end if;
  return coalesce((
    select jsonb_agg(
      case
        when v->>'type' = 'friend_invite' and sender.name is not null
          then jsonb_set(jsonb_set(v, '{title}', to_jsonb(sender.name)), '{body}', to_jsonb('muốn kết bạn với bạn'::text))
        when v->>'type' = 'room_invite' and room_sender.name is not null
          then jsonb_set(jsonb_set(v, '{title}', to_jsonb(room_sender.name)), '{body}', to_jsonb('mời bạn vào phòng'::text))
        else v
      end order by ord)
    from jsonb_array_elements(rows) with ordinality t(v, ord)
    left join lateral (
      select p.display_name as name
      from public.friend_invitations f join public.profiles p on p.user_id = f.sender_user_id
      where v->>'type' = 'friend_invite' and f.id::text = v->'metadata'->>'invitationId'
    ) sender on true
    left join lateral (
      select p.display_name as name
      from public.room_invitations r join public.profiles p on p.user_id = r.sender_user_id
      where v->>'type' = 'room_invite' and r.id::text = v->'metadata'->>'invitationId'
    ) room_sender on true
  ), '[]'::jsonb);
end $$;
revoke all on function public.list_partner_inbox(text) from public, anon, authenticated, service_role;
grant execute on function public.list_partner_inbox(text) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.19.0','food-v1/roadmap-v2/inbox-sender-names','1.1.0','1.1.0','0043_inbox_sender_names');

commit;
