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

-- GM40.2: opt-in rich release assertions, leaving baseline catalogues untouched.
do $gm40_rich$
begin
 if exists(select 1 from dish_v3_private.catalogues where id like '%:gm18.2') then
  if not exists(select 1 from public.schema_versions where schema_version='0.11.0') then
   raise exception 'GM18.2 producer ledger missing';
  end if;
  if exists(select 1 from dish_v3_private.catalogues c cross join lateral jsonb_array_elements(c.cards) d
    where c.id like '%:gm18.2' and (d->>'projectionVersion'<>'GM18.2'
      or jsonb_typeof(d->'cuisineTerms') is distinct from 'array'
      or jsonb_typeof(d->'categoryTerms') is distinct from 'array'
      or jsonb_typeof(d->'cuisineLabels') is distinct from 'array'
      or jsonb_typeof(d->'categoryLabels') is distinct from 'array'
      or not(d ?& array['temperature','flavor','artwork','priceReference','priceObservation','taxonomyVersion'])
      or d ?| array['venueId','offeringId','enteredBy','reviewedBy','preferences'])) then
   raise exception 'Rich card metadata/privacy contract mismatch';
  end if;
  if exists(select 1 from dish_v3_private.catalogues c cross join lateral jsonb_array_elements(c.cards) d
    where c.id like '%:gm18.2' and d->'priceReference'<>'null'::jsonb
      and (d->'priceObservation'='null'::jsonb or d->'priceObservation'->'amount'='null'::jsonb)) then
   raise exception 'A hidden/unknown latest price cannot fall back to a display price';
  end if;
 end if;
end $gm40_rich$;
