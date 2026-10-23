-- Read/assert only; run against the owned QA DB after real import + legacy fixture.
do $gm40$
begin
 if not exists(select 1 from public.gm40_qa_owner) then
  raise exception 'QA ownership marker required';
 end if;
 if (select count(*) from dish_v3_private.catalogues where active)<>1 then
  raise exception 'Exactly one QA release must be active';
 end if;
 if exists(select 1 from dish_v3_private.catalogues where not test_only
   or not dish_v3_private.valid_catalogue(cards)) then
  raise exception 'Invalid/non-test release';
 end if;
 if has_table_privilege('authenticated','dish_v3_private.catalogues','select')
   or has_table_privilege('authenticated','dish_v3_private.catalogues','update')
   or has_table_privilege('anon','dish_v3_private.catalogues','select') then
  raise exception 'Private catalogue ACL weakened';
 end if;
 if has_function_privilege('anon','public.dish_session(text,jsonb)','execute')
   or not has_function_privilege('authenticated','public.dish_session(text,jsonb)','execute') then
  raise exception 'RPC auth boundary changed';
 end if;
 if has_table_privilege('authenticated','dish_v3_private.ballots','select') then
  raise exception 'Private ballots exposed';
 end if;
end $gm40$;
