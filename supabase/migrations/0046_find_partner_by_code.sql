-- Look up who a friend code belongs to BEFORE sending the invitation, so the app can show "Linh" instead of a
-- bare code. Read-only; exposes only the display name and the code that was typed. Rate limited. An unknown code
-- answers ok with data null (the caller learns nothing beyond "no such code").
begin;

create function public.find_partner_by_code(friend_code text) returns jsonb
language plpgsql security definer set search_path = pg_catalog, public, gm19_private as $$
declare caller uuid := gm19_private.require_auth(); clean text := upper(btrim(coalesce(friend_code, ''))); hit record;
begin
  if clean !~ '^[A-HJ-NP-Z2-9]{10}$' then return gm19_private.error('INVALID_INPUT', 400); end if;
  if not gm19_private.allow_call('find_partner_by_code', 30) then return gm19_private.error('RATE_LIMITED', 429); end if;
  select p.display_name, p.friend_code, p.user_id into hit from public.profiles p where p.friend_code = clean;
  if not found then return jsonb_build_object('ok', true, 'data', null); end if;
  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'displayName', hit.display_name, 'friendCode', hit.friend_code,
    'self', hit.user_id = caller,
    'alreadyFriends', exists (select 1 from public.friends f where f.low_user_id = least(caller, hit.user_id) and f.high_user_id = greatest(caller, hit.user_id))));
exception when sqlstate 'PT401' then return gm19_private.error('AUTH_REQUIRED', 401);
end $$;
revoke all on function public.find_partner_by_code(text) from public, anon, authenticated, service_role;
grant execute on function public.find_partner_by_code(text) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.22.0','food-v1/roadmap-v2/find-partner-by-code','1.1.0','1.1.0','0046_find_partner_by_code');

commit;
