select coalesce(
  json_agg(
    inventory.function_row
    order by inventory.schema_name, inventory.function_name, inventory.identity_arguments
  ),
  '[]'::json
)::text
from (
  select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    json_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'kind', p.prokind,
      'identityArguments', pg_get_function_identity_arguments(p.oid),
      'result', pg_get_function_result(p.oid),
      'owner', pg_get_userbyid(p.proowner),
      'securityDefiner', p.prosecdef,
      'searchPathConfig', coalesce(p.proconfig, array[]::text[]),
      'acl', coalesce((
        select string_agg(
          coalesce(r.rolname, 'PUBLIC') || ':' || x.privilege_type || ':' || x.is_grantable::text,
          ';' order by coalesce(r.rolname, 'PUBLIC'), x.privilege_type
        )
        from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
        left join pg_roles r on r.oid=x.grantee
      ), ''),
      'definitionSha256', encode(
        extensions.digest(convert_to(pg_get_functiondef(p.oid), 'UTF8'), 'sha256'), 'hex'
      )
    ) as function_row
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where p.prokind in ('f', 'p')
    and (n.nspname='public' or n.nspname like 'gm%_private' or n.nspname like 'dish%_private')
) inventory;
