-- Operator rollback on the intended DB, as postgres. Preserve other Cron jobs.
begin;
do $gm48$
declare
  target_job bigint;
begin
  if not exists (
    select 1 from pg_catalog.pg_extension where extname = 'pg_cron'
  ) then
    return;
  end if;

  if current_user <> 'postgres' then
    raise exception 'GM-48 jobs must be removed by postgres';
  end if;

  for target_job in
    select jobid from cron.job
    where username = current_user
      and jobname in ('ie307-gm48-tick', 'ie307-gm48-prune')
  loop
    perform cron.unschedule(target_job);
  end loop;
end
$gm48$;
commit;
