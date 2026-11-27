-- GM-54: Android release configuration support — read-only minimum app version policy.
-- Public clients read minimum version via public.get_app_version_policy(text) and fail open on errors.
-- Direct table reads/writes from anon/authenticated remain denied by RLS and revoked privileges.

begin;

create schema if not exists gm54_private;
revoke all on schema gm54_private from public, anon, authenticated;

create table if not exists gm54_private.app_release_config (
  id text primary key check (id in ('android')),
  minimum_version text not null check (minimum_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  update_url text check (update_url is null or update_url ~ '^https://'),
  message text,
  updated_at timestamptz not null default transaction_timestamp(),
  version bigint not null default 1 check (version >= 1)
);

alter table gm54_private.app_release_config enable row level security;
alter table gm54_private.app_release_config force row level security;
revoke all on table gm54_private.app_release_config from public, anon, authenticated;

insert into gm54_private.app_release_config(id, minimum_version, update_url, message)
values (
  'android',
  '1.0.0',
  'https://play.google.com/store/apps/details?id=vn.gicungduoc.mobile',
  'Đã có phiên bản mới. Vui lòng cập nhật Gì Cũng Được trên Google Play để tiếp tục sử dụng.'
)
on conflict (id) do nothing;

create or replace function public.get_app_version_policy(p_platform text default 'android')
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_platform text := coalesce(nullif(pg_catalog.lower(pg_catalog.btrim(p_platform)), ''), 'android');
  v_row gm54_private.app_release_config%rowtype;
begin
  if v_platform not in ('android') then
    return pg_catalog.jsonb_build_object(
      'platform', v_platform,
      'minimumVersion', null,
      'updateUrl', null,
      'message', null,
      'updatedAt', null
    );
  end if;

  select *
  into v_row
  from gm54_private.app_release_config cfg
  where cfg.id = v_platform;

  if not found then
    return pg_catalog.jsonb_build_object(
      'platform', v_platform,
      'minimumVersion', null,
      'updateUrl', null,
      'message', null,
      'updatedAt', null
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'platform', v_row.id,
    'minimumVersion', v_row.minimum_version,
    'updateUrl', v_row.update_url,
    'message', v_row.message,
    'updatedAt', v_row.updated_at
  );
end;
$$;

revoke all on function public.get_app_version_policy(text) from public;
grant execute on function public.get_app_version_policy(text) to anon, authenticated, service_role;

insert into public.schema_versions(schema_version, contract_id, food_contract_version, core_contract_version, upstream_revision)
values ('0.32.0', 'release-v1/2026-11-23/GM-54.2', '1.1.0', '1.1.0', 'GM-35/0066; GM-54 minimum version gate');

commit;
