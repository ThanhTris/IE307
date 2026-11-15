-- An invitation that is no longer pending (accepted, rejected, cancelled, expired - e.g. you became friends
-- another way) is not actionable, so its inbox row must not keep showing Đồng ý / Từ chối: answering it only
-- ever returned INVITE_CANCELLED. Result notifications are untouched. Additive wrapper over the projection.
begin;

alter function public.list_partner_inbox(text) rename to list_partner_inbox_before_hide_answered;
revoke all on function public.list_partner_inbox_before_hide_answered(text) from public, anon, authenticated, service_role;

create function public.list_partner_inbox(cursor text default null) returns jsonb
language plpgsql security definer set search_path = pg_catalog as $$
declare rows jsonb;
begin
  rows := public.list_partner_inbox_before_hide_answered(cursor);
  if jsonb_typeof(rows) <> 'array' then return rows; end if;
  return coalesce((
    select jsonb_agg(v order by ord)
    from jsonb_array_elements(rows) with ordinality t(v, ord)
    where case v->>'type'
      when 'friend_invite' then exists (select 1 from public.friend_invitations f
        where f.id::text = v->'metadata'->>'invitationId' and f.state = 'pending' and f.expires_at > statement_timestamp())
      when 'room_invite' then exists (select 1 from public.room_invitations r
        where r.id::text = v->'metadata'->>'invitationId' and r.state = 'pending' and r.expires_at > statement_timestamp())
      else true end
  ), '[]'::jsonb);
end $$;
revoke all on function public.list_partner_inbox(text) from public, anon, authenticated, service_role;
grant execute on function public.list_partner_inbox(text) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.21.0','food-v1/roadmap-v2/inbox-hide-answered','1.1.0','1.1.0','0045_inbox_hide_answered_invites');

commit;
