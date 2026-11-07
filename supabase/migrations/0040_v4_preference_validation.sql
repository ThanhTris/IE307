begin;

-- Keep the public signature and its argument name stable. Qualify the
-- jsonb_each output columns and reference the input argument positionally so
-- the output column named "value" cannot collide with the PL/pgSQL parameter.
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
  if not(value->'flavor' ?& array['spicy','salty','sweet','sour']) or exists(select 1 from jsonb_object_keys(value->'flavor') k where not k=any(array['spicy','salty','sweet','sour'])) then return false; end if;
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

insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.16.1','dish-session-v4/roadmap-v2/GM-07.B','1.1.0','1.1.0','GM07.B/0040_v4_preference_validation');

commit;
