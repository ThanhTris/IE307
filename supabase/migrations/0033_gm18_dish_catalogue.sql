-- GM18.2 additive catalogue/preview; existing v2/v3/v4 APIs and storage stay pinned.
begin;
create function gm18_api_private.dish_card(source jsonb) returns jsonb
language plpgsql immutable set search_path=pg_catalog as $$
declare observation jsonb:=source->'priceObservation'; price jsonb:='null'; terms jsonb; answer jsonb; key text;
begin
 if gm06_canonical.valid_price(observation) is not true then observation:='null'; end if;
 if observation<>'null' and observation->'amount'<>'null' and observation->'currency'<>'null'
    and observation->'unit'<>'null' and observation->'sourceRef'<>'null' then
  price:=jsonb_build_object('amount',observation->'amount','currency',observation->'currency',
   'unit',observation->'unit','sourceRef',observation->'sourceRef','servingSize',observation->'servingSize','checkedAt',observation->'observedAt');
 end if;
 answer:=dish_v4_private.card(source)||jsonb_build_object('priceReference',price,'priceObservation',coalesce(observation,'null'),
  'taxonomyVersion',case when jsonb_typeof(source->'taxonomyVersion')='string' then source->'taxonomyVersion' else 'null'::jsonb end);
 foreach key in array array['cuisineTerms','categoryTerms'] loop
  select coalesce(jsonb_agg(jsonb_build_object('id',v->'id','type',v->'type','code',v->'code','label',v->'label','version',v->'version') order by ord),'[]')
   into terms from jsonb_array_elements(case when jsonb_typeof(source->key)='array' then source->key else '[]'::jsonb end) with ordinality x(v,ord);
  answer:=answer||jsonb_build_object(key,terms);
 end loop;
 return answer;
end $$;
revoke all on function gm18_api_private.dish_card(jsonb) from public,anon,authenticated,service_role,gm06_publisher;

create function gm18_api_private.dish_read(payload jsonb,preview boolean) returns jsonb
language plpgsql volatile security definer set search_path=pg_catalog as $$
declare caller uuid:=auth.uid(); c dish_v3_private.catalogues%rowtype; meal text; requested integer;
 available integer; dishes jsonb; pref jsonb; allowed text[];
begin
 if caller is null or not exists(select 1 from auth.users where id=caller) then return dish_v4_private.fail('AUTH_REQUIRED','{}',401); end if;
 if not gm19_private.allow_call(case when preview then 'gm18_dish_preview' else 'gm18_dish_catalogue' end,60) then
  return dish_v4_private.fail('RATE_LIMITED','{}',429);
 end if;
 if jsonb_typeof(payload) is distinct from 'object' then return dish_v4_private.fail('INVALID_INPUT'); end if;
 if payload->>'contractVersion' is distinct from 'dish-catalogue/roadmap-v2/GM-18.2' then return dish_v4_private.fail('UNSUPPORTED_CONTRACT_VERSION'); end if;
 allowed:=case when preview then array['contractVersion','mealSlot','dishCount','preferences'] else array['contractVersion','mealSlot'] end;
 if exists(select 1 from jsonb_object_keys(payload) k where not k=any(allowed)) then return dish_v4_private.fail('UNSUPPORTED_FIELD'); end if;
 meal:=payload->>'mealSlot';
 if (preview or payload ? 'mealSlot') and (jsonb_typeof(payload->'mealSlot') is distinct from 'string' or meal not in('breakfast','lunch','dinner','snack')) then return dish_v4_private.fail('INVALID_INPUT'); end if;
 if preview then
  if jsonb_typeof(payload->'dishCount') is distinct from 'number' then return dish_v4_private.fail('INVALID_INPUT'); end if;
  if (payload->>'dishCount')::numeric not between 10 and 20 or trunc((payload->>'dishCount')::numeric)<>(payload->>'dishCount')::numeric then return dish_v4_private.fail('INVALID_INPUT'); end if;
  requested:=(payload->>'dishCount')::integer;
  if payload ? 'preferences' then
   pref:=payload->'preferences';
   if dish_v4_private.valid_preferences(pref) is not true then return dish_v4_private.fail('INVALID_INPUT'); end if;
  end if;
 end if;
 select * into c from dish_v3_private.catalogues where active;
 if not found or jsonb_array_length(c.cards)>1000 then return dish_v4_private.fail('CATALOGUE_NOT_READY','{}',503); end if;
 -- Normalize identity comparison; a malformed SQL-installed release must not return duplicate dishes.
 if (select count(*)<>count(distinct lower(v->>'dishId')) from jsonb_array_elements(c.cards) v) then return dish_v4_private.fail('CATALOGUE_NOT_READY','{}',503); end if;
 select count(*) into available from jsonb_array_elements(c.cards) v where meal is null or v->'mealSlots' ? meal;
 if preview and available<requested then return dish_v4_private.fail('INSUFFICIENT_DISHES',jsonb_build_object('available',available,'requested',requested),409); end if;
 select coalesce(jsonb_agg(gm18_api_private.dish_card(v) order by v->>'dishId' collate "C"),'[]') into dishes
 from (select v from jsonb_array_elements(c.cards) v where meal is null or v->'mealSlots' ? meal
       order by v->>'dishId' collate "C" limit coalesce(requested,1000)) x;
 return jsonb_build_object('ok',true,'data',jsonb_build_object(
  'contractVersion','dish-catalogue/roadmap-v2/GM-18.2','projectionVersion','GM18.2',
  'catalogueVersion',c.id,'catalogueSha',c.source_sha,'testOnly',c.test_only,
  'mealSlot',meal,'available',available,'requested',requested,'previewOnly',preview,
  'preferenceRanking','UNSUPPORTED','dishes',dishes));
end $$;
revoke all on function gm18_api_private.dish_read(jsonb,boolean) from public,anon,authenticated,service_role,gm06_publisher;
create function public.get_dish_catalogue(payload jsonb default '{}') returns jsonb
language sql volatile security definer set search_path=pg_catalog as $$ select gm18_api_private.dish_read(payload,false) $$;
create function public.preview_dish_pool(payload jsonb default '{}') returns jsonb
language sql volatile security definer set search_path=pg_catalog as $$ select gm18_api_private.dish_read(payload,true) $$;
revoke all on function public.get_dish_catalogue(jsonb),public.preview_dish_pool(jsonb) from public,anon,service_role,gm06_publisher;
grant execute on function public.get_dish_catalogue(jsonb),public.preview_dish_pool(jsonb) to authenticated;
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.11.0','dish-catalogue/roadmap-v2/GM-18.2','1.1.0','1.1.0','40feb9bf66f4bad67074601d8d49ffe587bfef93');
commit;
