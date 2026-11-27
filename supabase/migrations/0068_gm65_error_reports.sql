-- GM-65: user-sent error reports (ADR-030). Additive only: older app builds never call this function.
-- 0067 is reserved for GM-54; rename to the next free number if the merge order changes.
begin;

create schema gm65_private;
revoke all on schema gm65_private from public, anon, authenticated, service_role;

create table gm65_private.error_reports (
  id uuid primary key default gen_random_uuid(),
  report_code text not null unique,
  client_report_id uuid not null unique,
  install_id uuid not null,
  reporter_id uuid references auth.users(id) on delete set null,
  error_code text not null,
  http_status integer,
  screen text not null,
  action text,
  request_id text,
  app_version text not null,
  platform text not null,
  os_version text,
  occurred_at timestamptz not null,
  note text,
  urgent boolean not null default false,
  status text not null default 'new' check (status in ('new', 'seen', 'fixed', 'ignored')),
  created_at timestamptz not null default clock_timestamp()
);
create index error_reports_created_at on gm65_private.error_reports (created_at);
create index error_reports_install on gm65_private.error_reports (install_id, created_at);
create index error_reports_reporter on gm65_private.error_reports (reporter_id, created_at);
alter table gm65_private.error_reports enable row level security;
revoke all on gm65_private.error_reports from public, anon, authenticated, service_role;

create function gm65_private.prune() returns bigint
language sql volatile security definer set search_path = pg_catalog as $$
  with removed as (
    delete from gm65_private.error_reports where created_at < clock_timestamp() - interval '30 days' returning 1
  )
  select count(*) from removed;
$$;
revoke all on function gm65_private.prune() from public, anon, authenticated, service_role;

-- Anyone may report, including someone whose sign-in just failed, so the input is checked key by key and
-- limited per install, per account and globally. Only the allowlisted keys below are accepted.
create function public.report_app_error(payload jsonb) returns jsonb
language plpgsql volatile security definer set search_path = pg_catalog as $$
declare
  allowed constant text[] := array['clientReportId', 'installId', 'errorCode', 'httpStatus', 'screen', 'action',
    'requestId', 'appVersion', 'platform', 'osVersion', 'occurredAt', 'note', 'urgent'];
  texts constant text[] := array['clientReportId', 'installId', 'errorCode', 'screen', 'action', 'requestId',
    'appVersion', 'platform', 'osVersion', 'occurredAt', 'note'];
  invalid constant jsonb := '{"ok": false, "messageKey": "INVALID_INPUT"}';
  limited constant jsonb := '{"ok": false, "messageKey": "RATE_LIMITED"}';
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  key_name text;
  person uuid := auth.uid();
  report_id uuid;
  install uuid;
  occurred timestamptz;
  status_code integer;
  note_text text;
  existing text;
  code text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then return invalid; end if;
  for key_name in select jsonb_object_keys(payload) loop
    if not key_name = any(allowed) then return invalid; end if;
    if key_name = any(texts) and jsonb_typeof(payload->key_name) <> 'string' then return invalid; end if;
  end loop;
  if payload ? 'urgent' and jsonb_typeof(payload->'urgent') <> 'boolean' then return invalid; end if;
  if payload ? 'httpStatus' then
    if jsonb_typeof(payload->'httpStatus') <> 'number' or (payload->>'httpStatus') !~ '^[1-5][0-9]{2}$' then
      return invalid;
    end if;
    status_code := (payload->>'httpStatus')::integer;
  end if;
  if coalesce(payload->>'clientReportId', '') !~ uuid_pattern or coalesce(payload->>'installId', '') !~ uuid_pattern
    or coalesce(payload->>'errorCode', '') !~ '^[A-Z][A-Z0-9_]{1,39}$'
    or coalesce(payload->>'screen', '') !~ '^[a-z0-9][a-z0-9_/-]{0,59}$'
    or (payload ? 'action' and (payload->>'action') !~ '^[a-z0-9][a-z0-9_/-]{0,59}$')
    or (payload ? 'requestId' and (payload->>'requestId') !~ '^[A-Za-z0-9._:-]{1,100}$')
    or coalesce(payload->>'appVersion', '') !~ '^[A-Za-z0-9._+-]{1,32}$'
    or coalesce(payload->>'platform', '') not in ('android', 'ios', 'web')
    or (payload ? 'osVersion' and (payload->>'osVersion') !~ '^[A-Za-z0-9._ ()-]{1,40}$')
    or coalesce(payload->>'occurredAt', '') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$' then
    return invalid;
  end if;
  note_text := nullif(btrim(coalesce(payload->>'note', '')), '');
  if char_length(note_text) > 500 then return invalid; end if;
  begin
    occurred := (payload->>'occurredAt')::timestamptz;
  exception when others then
    return invalid;
  end;
  report_id := (payload->>'clientReportId')::uuid;
  install := (payload->>'installId')::uuid;

  -- Serialise counting and inserting so parallel calls cannot slip past the limits.
  perform pg_advisory_xact_lock(hashtext('gm65.report_app_error'));
  select r.report_code into existing from gm65_private.error_reports r where r.client_report_id = report_id;
  if existing is not null then return jsonb_build_object('ok', true, 'reportCode', existing); end if;

  perform gm65_private.prune();
  if (select count(*) from gm65_private.error_reports r
      where r.created_at > clock_timestamp() - interval '1 hour'
        and (r.install_id = install or (person is not null and r.reporter_id = person))) >= 10
    or (select count(*) from gm65_private.error_reports r
      where r.created_at > clock_timestamp() - interval '1 hour') >= 500 then
    return limited;
  end if;

  code := 'GCD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into gm65_private.error_reports (report_code, client_report_id, install_id, reporter_id, error_code,
    http_status, screen, action, request_id, app_version, platform, os_version, occurred_at, note, urgent)
  values (code, report_id, install,
    (select u.id from auth.users u where u.id = person),
    payload->>'errorCode', status_code, payload->>'screen', payload->>'action', payload->>'requestId',
    payload->>'appVersion', payload->>'platform', payload->>'osVersion', occurred, note_text,
    coalesce((payload->>'urgent')::boolean, false));
  return jsonb_build_object('ok', true, 'reportCode', code);
end $$;

revoke all on function public.report_app_error(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.report_app_error(jsonb) to anon, authenticated;

-- Operator read for the triage script (service_role only). Reporter and install ids are not returned.
create function public.gm65_admin_list_error_reports(only_new boolean default true) returns jsonb
language sql stable security definer set search_path = pg_catalog as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'reportCode', r.report_code, 'errorCode', r.error_code, 'httpStatus', r.http_status, 'screen', r.screen,
      'action', r.action, 'requestId', r.request_id, 'appVersion', r.app_version, 'platform', r.platform,
      'osVersion', r.os_version, 'occurredAt', r.occurred_at, 'urgent', r.urgent, 'status', r.status,
      'note', r.note) order by r.created_at desc), '[]'::jsonb)
  from gm65_private.error_reports r
  where not only_new or r.status = 'new';
$$;
revoke all on function public.gm65_admin_list_error_reports(boolean) from public, anon, authenticated;
grant execute on function public.gm65_admin_list_error_reports(boolean) to service_role;

-- Hosted projects with Supabase Cron also prune on a schedule, so rows expire even when nobody reports.
do $gm65$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') and current_user = 'postgres' then
    perform cron.schedule('ie307-gm65-report-retention', '41 3 * * *', 'select gm65_private.prune();');
  end if;
end $gm65$;

insert into public.schema_versions(schema_version, contract_id, food_contract_version, core_contract_version, upstream_revision)
values ('0.32.0', 'release-v1/2026-11-25/GM-65.1', '1.1.0', '1.1.0', 'GM-35/0066');

commit;
