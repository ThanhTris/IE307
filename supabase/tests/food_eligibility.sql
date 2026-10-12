-- Read-only standalone kernel assertions after applying 0018. No fixtures/publish.
begin;
do $$ begin
 if gm18_private.distance_m(0,0,0,0) <> 0 then raise exception 'distance'; end if;
 if gm18_private.seed_hash('same-seed') <> gm18_private.seed_hash('same-seed') then raise exception 'seed'; end if;
 if not gm18_private.inside_polygon('{"type":"Polygon","coordinates":[[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]]]}',0,1) then raise exception 'polygon boundary'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='gm18_private' and p.prosecdef) then raise exception 'security definer bypass'; end if;
end $$;
rollback;
-- Full 42-case expected sets/TS-SQL/physical DB/draft input:
-- python3 scripts/gm18_eligibility_check.py --report /tmp/gm18-eligibility.json
