-- Multi-label dish data (ADR-025). Builds on ADR-024 / 0050.
-- A dish carries MANY values for every filter, and the server counts a match on any of them:
--   meals (`mealSlots`), dish families (`categoryIds`), regions (`cuisineIds` of the Miền cuisines) and flavours.
-- 1. Béo / Ngậy is a fifth flavour, `flavor.fatty` (present + intensity), optional next to the four classic kinds.
-- 2. Regions are cuisine IDs from data-preparation/config/filter_taxonomy_v2.json (several per dish); the legacy
--    single `origin` still counts, mapped to the same region.
-- 3. preference_match: any shared family; any shared region; Cay / Chua / Ngọt / fatty when wanted and present;
--    salty high or low. The old fatty tag in categoryIds is gone.
-- Additive: earlier migrations stay immutable; these are copies of the latest definitions with the changes above.
begin;

create or replace function dish_v4_private.valid_preferences(value jsonb)
returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare flavor_item record; budget_value jsonb;
begin
 if jsonb_typeof(value) is distinct from 'object' or not(value ?& array['cuisineIds','categoryIds','temperature','flavor','budget','avoidRecent']) then return false; end if;
 if exists(select 1 from jsonb_object_keys(value) k where k not in('cuisineIds','categoryIds','temperature','flavor','budget','avoidRecent')) then return false; end if;
 if value ? 'cuisineIds' and (jsonb_typeof(value->'cuisineIds')<>'array' or exists(select 1 from jsonb_array_elements(value->'cuisineIds') x(value) where jsonb_typeof(x.value)<>'string' or gm19_private.uuid_or_null(x.value#>>'{}') is null)
   or (select count(*)<>count(distinct x.value#>>'{}') from jsonb_array_elements(value->'cuisineIds') x(value))) then return false; end if;
 if value ? 'categoryIds' and (jsonb_typeof(value->'categoryIds')<>'array' or exists(select 1 from jsonb_array_elements(value->'categoryIds') x(value) where jsonb_typeof(x.value)<>'string' or gm19_private.uuid_or_null(x.value#>>'{}') is null)
   or (select count(*)<>count(distinct x.value#>>'{}') from jsonb_array_elements(value->'categoryIds') x(value))) then return false; end if;
 if value ? 'temperature' and (jsonb_typeof(value->'temperature') not in('string','null') or coalesce(value->>'temperature','unknown') not in('hot','warm','cold','ambient','unknown')) then return false; end if;
 if jsonb_typeof(value->'flavor') not in('object','null') then return false; end if;
 if jsonb_typeof(value->'flavor')='object' then
  if not(value->'flavor' ?& array['spicy','salty','sweet','sour']) or exists(select 1 from jsonb_object_keys(value->'flavor') k where not k=any(array['spicy','salty','sweet','sour','fatty'])) then return false; end if;
  for flavor_item in
   select entry.flavor_key,entry.flavor_value
   from pg_catalog.jsonb_each($1->'flavor') as entry(flavor_key,flavor_value)
  loop
   if jsonb_typeof(flavor_item.flavor_value)<>'object' or not(flavor_item.flavor_value ?& array['present','intensity'])
    or jsonb_typeof(flavor_item.flavor_value->'present') not in('boolean','null')
    or jsonb_typeof(flavor_item.flavor_value->'intensity')<>'string'
    or flavor_item.flavor_value->>'intensity' not in('none','low','medium','high','unknown')
    or exists(select 1 from jsonb_object_keys(flavor_item.flavor_value) k where not k=any(array['present','intensity'])) then return false; end if;
  end loop;
 end if;
 budget_value:=value->'budget';
 if jsonb_typeof(budget_value) not in('object','null') then return false; end if;
 if jsonb_typeof(budget_value)='object' and (not(budget_value ?& array['maximum','currency','unit'])
  or exists(select 1 from jsonb_object_keys(budget_value) k where not k=any(array['maximum','currency','unit']))
  or jsonb_typeof(budget_value->'maximum')<>'number' or (budget_value->>'maximum')::numeric<0
  or jsonb_typeof(budget_value->'currency')<>'string' or budget_value->>'currency' !~ '^[A-Z]{3}$'
  or jsonb_typeof(budget_value->'unit')<>'string' or budget_value->>'unit' not in('portion','item','person','group','kg','menu_item_unspecified')) then return false; end if;
 if jsonb_typeof(value->'avoidRecent')<>'boolean' then return false; end if;
 return true;
end $$;

create or replace function gm06_canonical.valid_preferences(cuisines uuid[], categories uuid[], temperature text, flavor jsonb, budget jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
 select coalesce(gm06_canonical.unique_uuids(cuisines) and cardinality(cuisines)<=100
 and gm06_canonical.unique_uuids(categories) and cardinality(categories)<=100
 and (temperature is null or temperature in('hot','warm','cold','ambient','unknown'))
 and (flavor='null'::jsonb or gm06_private.json_matches(flavor,
 '{"type":"object","required":["spicy","salty","sweet","sour"],"properties":{"spicy":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"salty":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"sweet":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"sour":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"fatty":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false}},"additionalProperties":false}'::jsonb))
 and gm06_private.flavor_valid(nullif(flavor,'null'::jsonb))
 and (budget='null'::jsonb or gm06_private.json_matches(budget,
 '{"type":"object","properties":{"maximum":{"type":"number","minimum":0},"currency":{"type":"string","pattern":"^[A-Z]{3}$"},"unit":{"type":"string","enum":["portion","item","person","group","kg","menu_item_unspecified"]}},"required":["maximum","currency","unit"],"additionalProperties":false}'::jsonb)),false)
$function$;

-- Region cuisine IDs (stable_id of `cuisine:vi_*`) -> legacy `origin`. The placeholder IDs of 0050 stay mapped so
-- preferences saved before the real IDs existed still work.
create or replace function dish_v4_private.region_origin(region text) returns text
language sql immutable set search_path=pg_catalog as $$
 select case region
  when '0cc4d0c4-4692-5098-b61f-cdad67ee2d11' then 'north' when '4587f624-6f58-5a22-b109-8c5b27bb3154' then 'central' when '59eaa370-3b50-57cc-b01e-6691dcbd4be0' then 'south' when '93436350-0b00-55c0-9866-adff304ba486' then 'west'
  when 'f3e57f22-1cc1-51c8-ad0d-5448436e2f85' then 'north' when '4591467d-959b-5115-b259-1af70b3f3e4b' then 'central'
  when '1b39960d-75f8-593d-bf40-7eb541d2f313' then 'south' when 'a739129b-1f51-5ba8-a53f-4c5d66455f68' then 'west' end
$$;

-- How many preference dimensions of one member a card matches (0..8). Unknown dish data matches nothing; a dish
-- with several values matches on any of them.
create or replace function dish_v4_private.preference_match(card jsonb, pref jsonb) returns integer
language sql immutable set search_path=pg_catalog as $$
 select
  -- dish group: any shared family id (a group's ids are all its families)
  (case when exists(select 1 from jsonb_array_elements_text(coalesce(card->'categoryIds','[]')) c
     join jsonb_array_elements_text(coalesce(pref->'categoryIds','[]')) p on p=c) then 1 else 0 end)
  -- region: any chosen region is one of the dish's regions (cuisineIds) or its legacy origin
  + (case when exists(select 1 from jsonb_array_elements_text(coalesce(pref->'cuisineIds','[]')) p
     where coalesce(card->'cuisineIds','[]') ? p
        or (card->>'origin' in('north','central','south','west') and dish_v4_private.region_origin(p)=card->>'origin')) then 1 else 0 end)
  -- Cay, Chua / Chua cay, Ngọt, Béo / Ngậy: wanted and present
  + (select count(*)::integer from unnest(array['spicy','sour','sweet','fatty']) k
     where pref->'flavor'->k->>'present'='true' and card->'flavor'->k->>'present'='true')
  -- Mặn / Đậm đà (salty medium or high) and Thanh đạm (salty low)
  + (case when pref->'flavor'->'salty'->>'present'='true' and card->'flavor'->'salty'->>'present'='true'
      and ((pref->'flavor'->'salty'->>'intensity'='high' and card->'flavor'->'salty'->>'intensity' in('medium','high'))
        or (pref->'flavor'->'salty'->>'intensity'='low' and card->'flavor'->'salty'->>'intensity'='low')) then 1 else 0 end)
$$;

create or replace function gm20_canonical_private.canonical_card(card jsonb) returns jsonb
language plpgsql immutable set search_path=pg_catalog as $$
declare result jsonb:=case when jsonb_typeof(card->'flavor')='object' then jsonb_set(card-'origin','{flavor}',(card->'flavor')-'fatty') else card-'origin' end; price jsonb:=card->'priceReference'; art jsonb:=card->'artwork';
begin
 if price<>'null'::jsonb then result:=jsonb_set(result,'{priceReference}',(price-'checkedAt')||jsonb_build_object('observedAt',price->'checkedAt')); end if;
 if art<>'null'::jsonb then result:=jsonb_set(result,'{artwork}',art||jsonb_build_object('attribution',coalesce(art->'attribution','null'::jsonb))); end if;
 if gm06_canonical.valid_card(result) is not true then raise sqlstate '23514' using message='GM20_CARD_ADAPTER'; end if;
 return result;
end $$;

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.27.0','dish-session-v4/roadmap-v2/GM-07.B-supplement','1.1.0','1.1.0','ADR-025/0051_multi_label_filters');

commit;
