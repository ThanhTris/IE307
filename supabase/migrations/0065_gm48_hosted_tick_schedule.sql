-- Enable Supabase Cron in the intended hosted project before applying this migration.
-- Disposable deployments without the extension continue using the existing worker.
begin;
do $gm48$
begin
  if not exists (
    select 1 from pg_catalog.pg_extension where extname = 'pg_cron'
  ) then
    raise notice 'GM-48: pg_cron is not installed; no jobs were scheduled';
    return;
  end if;

  if current_user <> 'postgres' then
    raise exception 'GM-48 jobs must be registered by postgres';
  end if;

  if to_regprocedure('dish_v3_private.tick()') is null
      or to_regprocedure('dish_v4_private.tick()') is null then
    raise exception 'GM-48 requires the v3 and v4 tick functions';
  end if;

  -- Named schedules are upserts for the current owner. Reject another owner's
  -- copy so it cannot coexist with a second active schedule for the same task.
  if exists (
    select 1 from cron.job
    where jobname in ('ie307-gm48-tick', 'ie307-gm48-prune')
      and username <> current_user
  ) then
    raise exception 'GM-48 job name is already owned by a different role';
  end if;

  perform cron.schedule('ie307-gm48-tick', '2 seconds', $tick$
    set local search_path = pg_catalog;
    select dish_v3_private.tick();
    select dish_v4_private.tick();
  $tick$);

  -- Both tick paths acquire the existing reference-epoch row lock. The job
  -- calls the same functions as the QA worker and makes no new RPC or grants.
  perform cron.schedule('ie307-gm48-prune', '17 * * * *', $prune$
    set local search_path = pg_catalog;
    delete from cron.job_run_details as result
    using cron.job as job
    where result.jobid = job.jobid
      and job.username = current_user
      and job.jobname in ('ie307-gm48-tick', 'ie307-gm48-prune')
      and result.end_time < statement_timestamp() - interval '1 day';
  $prune$);
end
$gm48$;
commit;
