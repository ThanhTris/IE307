begin;

alter function public.dish_session(text,jsonb) rename to dish_session_before_gm46;
revoke all on function public.dish_session_before_gm46(text,jsonb)
 from public,anon,authenticated,service_role,gm06_publisher;

create function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare
 answer jsonb;
 caller uuid:=auth.uid();
 at_time timestamptz;
 has_recent boolean;
begin
 answer:=public.dish_session_before_gm46(command,payload);
 if command is distinct from 'getDefaultPreferences'
    or payload->>'contractVersion' is distinct from 'dish-session-v4/roadmap-v2/GM-07.B-supplement'
    or answer->>'ok' is distinct from 'true' then
  return answer;
 end if;

 -- Match the personal history eligibility used by start (0057).
 at_time:=clock_timestamp();
 select exists(
  select 1 from gm21_private.settings s
  join gm06_canonical.histories h on h.owner_user_id=s.user_id and h.scope='personal'
  join gm06_canonical.results r using(result_id)
  where s.user_id=caller and s.scope='personal' and s.enabled
   and h.expires_at>at_time and r.winner_dish_id is not null
 ) into has_recent;
 return jsonb_set(answer,'{data,hasRecentHistory}',to_jsonb(has_recent));
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role,gm06_publisher;
grant execute on function public.dish_session(text,jsonb) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values ('0.31.7','dish-session-v4/roadmap-v2/GM-46.1','1.1.0','1.1.0','ADR-028/0057; GM-44/0060');
commit;
