begin;

-- Read only the authenticated caller's independent account-level consent scopes.
create function public.get_history_consent() returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare
 denial text;
 personal_value boolean;
 group_value boolean;
begin
 denial:=gm21_private.authorize('get_history_consent');
 if denial is not null then
  return gm21_private.error(denial,case when denial='RATE_LIMITED' then 429 else 401 end);
 end if;

 select coalesce((select s.enabled from gm21_private.settings s
   where s.user_id=auth.uid() and s.scope='personal'),false),
        coalesce((select s.enabled from gm21_private.settings s
   where s.user_id=auth.uid() and s.scope='group'),false)
 into personal_value,group_value;

 return jsonb_build_object('ok',true,'data',jsonb_build_object(
  'personal',personal_value,'group',group_value));
end
$$;

revoke all on function public.get_history_consent() from public,anon,service_role,gm06_publisher;
grant execute on function public.get_history_consent() to authenticated;
comment on function public.get_history_consent() is
 'Returns only the caller account personal/group history consent; an absent preference is false.';

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.16.0','food-v1/roadmap-v2/GM-21.4','1.1.0','1.1.0','GM21.4/0039_history_consent_read');

commit;
