begin;

alter function public.dish_session(text,jsonb) rename to dish_session_before_gm44;
revoke all on function public.dish_session_before_gm44(text,jsonb)
 from public,anon,authenticated,service_role,gm06_publisher;

create function public.dish_session(command text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare
 caller uuid;
 room jsonb;
 as_of timestamptz;
begin
 if command is distinct from 'activeRoom' then
  return public.dish_session_before_gm44(command,payload);
 end if;

 caller:=auth.uid();
 if caller is null or not exists(select 1 from auth.users u where u.id=caller) then
  return dish_v4_private.fail('AUTH_REQUIRED','{}',401);
 end if;
 if jsonb_typeof(payload) is distinct from 'object'
    or payload->>'contractVersion' is distinct from 'dish-session-v4/roadmap-v2/GM-07.B-supplement' then
  return dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION');
 end if;
 if payload-'contractVersion'<>'{}'::jsonb then
  return dish_v4_private.fail('INVALID_INPUT');
 end if;
 if not gm19_private.allow_call('dish_v4_activeRoom',120) then
  return dish_v4_private.fail('RATE_LIMITED','{}',429);
 end if;

 as_of:=clock_timestamp();
 select jsonb_build_object('roomId',r.id,'code',r.code,'state',r.state,'version',r.version)
 into room
 from public.members m join public.rooms r on r.id=m.room_id
 where m.user_id=caller and m.left_at is null
   and r.policy_version='dish-decision-v4'
   and r.expires_at>as_of
   and r.state in ('LOBBY','ROUND_1','WAITING_1','ROUND_2','WAITING_2')
 order by m.joined_at desc,r.id asc
 limit 1;
 return jsonb_build_object('ok',true,'data',room);
end $$;
revoke all on function public.dish_session(text,jsonb) from public,anon,service_role,gm06_publisher;
grant execute on function public.dish_session(text,jsonb) to authenticated;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values ('0.31.5','dish-session-v4/roadmap-v2/GM-44.1','1.1.0','1.1.0','ADR-027/0054; GM-42/0058');

commit;
