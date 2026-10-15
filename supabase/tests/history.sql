-- Administrator-only smoke after all migrations, including0021.
-- Full independent business/retention/role suite:
-- python3 scripts/gm21_history_check.py --report /tmp/gm21-sql.json
begin;
do $$begin
 if gm21_private.group_key(array['21000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002']::uuid[])
   <>gm21_private.group_key(array['21000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000001']::uuid[])
 then raise exception 'canonical group key';end if;
 if has_schema_privilege('authenticated','gm21_private','USAGE') then raise exception 'private schema';end if;
 if has_function_privilege('anon','public.get_history(text,text)','EXECUTE') then raise exception 'anonymous history';end if;
end$$;
rollback;
