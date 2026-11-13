-- ADR-025 / 0051: a dish carries many meals, families, regions and flavours; any of them can match.
-- Region IDs are stable_id('taxonomy', 'cuisine:vi_*') from data-preparation/config/filter_taxonomy_v2.json.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = pg_catalog, public, extensions;
select extensions.plan(14);

select extensions.ok(exists(
  select 1 from public.schema_versions where schema_version = '0.27.0' and upstream_revision = 'ADR-025/0051_multi_label_filters'
), '0051 is registered');

-- families: any shared family counts, once per member, however many the dish or the member has
select extensions.is(dish_v4_private.preference_match(
  '{"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650","bf53ba6f-c4fc-536b-a932-b7cb18cb7e60"]}',
  '{"categoryIds":["bf53ba6f-c4fc-536b-a932-b7cb18cb7e60"]}'), 1, 'a dish that is rice and porridge matches a porridge fan');
select extensions.is(dish_v4_private.preference_match(
  '{"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650","bf53ba6f-c4fc-536b-a932-b7cb18cb7e60"]}',
  '{"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650","bf53ba6f-c4fc-536b-a932-b7cb18cb7e60"]}'), 1, 'two shared families still count once');

-- regions: several per dish (cuisineIds); the legacy origin still counts
select extensions.is(dish_v4_private.preference_match('{"cuisineIds":["59eaa370-3b50-57cc-b01e-6691dcbd4be0"]}', '{"cuisineIds":[]}'), 0, 'no chosen region, no point');
select extensions.is(dish_v4_private.preference_match('{"cuisineIds":["59eaa370-3b50-57cc-b01e-6691dcbd4be0","93436350-0b00-55c0-9866-adff304ba486"]}', '{"cuisineIds":["93436350-0b00-55c0-9866-adff304ba486"]}'), 1, 'a dish of two regions matches a fan of either');
select extensions.is(dish_v4_private.preference_match('{"cuisineIds":["59eaa370-3b50-57cc-b01e-6691dcbd4be0","93436350-0b00-55c0-9866-adff304ba486"]}', '{"cuisineIds":["0cc4d0c4-4692-5098-b61f-cdad67ee2d11"]}'), 0, 'a region the dish does not have does not match');
select extensions.is(dish_v4_private.preference_match('{"origin":"south"}', '{"cuisineIds":["59eaa370-3b50-57cc-b01e-6691dcbd4be0"]}'), 1, 'the legacy origin still counts');

-- flavours: fatty is a fifth kind; a dish can be spicy and fatty at once
select extensions.is(dish_v4_private.preference_match(
  '{"flavor":{"spicy":{"present":true,"intensity":"high"},"fatty":{"present":true,"intensity":"medium"}}}',
  '{"flavor":{"spicy":{"present":true,"intensity":"unknown"},"fatty":{"present":true,"intensity":"unknown"}}}'), 2, 'spicy and fatty both match');
select extensions.is(dish_v4_private.preference_match(
  '{"flavor":{"spicy":{"present":true,"intensity":"high"}}}',
  '{"flavor":{"fatty":{"present":true,"intensity":"unknown"}}}'), 0, 'a dish without a fatty value does not match fatty');

-- validation: fatty is accepted, anything else unknown is not, the four classic kinds stay required
select extensions.ok(dish_v4_private.valid_preferences('{"cuisineIds":[],"categoryIds":[],"temperature":null,"flavor":{"spicy":{"present":null,"intensity":"unknown"},"salty":{"present":null,"intensity":"unknown"},"sweet":{"present":null,"intensity":"unknown"},"sour":{"present":null,"intensity":"unknown"},"fatty":{"present":true,"intensity":"unknown"}},"budget":null,"avoidRecent":true}'), 'preferences with fatty are valid');
select extensions.ok(not dish_v4_private.valid_preferences('{"cuisineIds":[],"categoryIds":[],"temperature":null,"flavor":{"spicy":{"present":null,"intensity":"unknown"},"salty":{"present":null,"intensity":"unknown"},"sweet":{"present":null,"intensity":"unknown"},"sour":{"present":null,"intensity":"unknown"},"bitter":{"present":true,"intensity":"unknown"}},"budget":null,"avoidRecent":true}'), 'an unknown flavour kind is rejected');
select extensions.ok(not dish_v4_private.valid_preferences('{"cuisineIds":[],"categoryIds":[],"temperature":null,"flavor":{"spicy":{"present":null,"intensity":"unknown"},"fatty":{"present":true,"intensity":"unknown"}},"budget":null,"avoidRecent":true}'), 'the four classic kinds are still required');

-- stored results keep the GM-06 card shape: no origin, no flavor.fatty
select extensions.ok((
  with c as (select gm20_canonical_private.canonical_card(jsonb_set(dish_v4_private.card_v4s(jsonb_build_object(
    'dishId','00000000-0000-4000-8000-000000000001','name','A','mealSlots','["lunch"]'::jsonb,'cuisineIds','[]'::jsonb,'categoryIds','[]'::jsonb,
    'origin','north','flavor','{"spicy":{"present":true,"intensity":"high"},"salty":{"present":null,"intensity":"unknown"},"sweet":{"present":null,"intensity":"unknown"},"sour":{"present":null,"intensity":"unknown"},"fatty":{"present":true,"intensity":"low"}}'::jsonb)),'{roundDishId}','"00000000-0000-4000-8000-0000000000aa"')) v)
  select not (v ? 'origin') and not (v->'flavor' ? 'fatty') and v->'flavor'->'spicy'->>'present'='true' from c
), 'canonical_card drops origin and flavor.fatty');

-- ranked_pool: a dish reaching a chosen group through its second family is drawn
select extensions.ok((
  select bool_or(d->>'name'='B') from jsonb_array_elements(dish_v4_private.ranked_pool('[
    {"dishId":"00000000-0000-4000-8000-000000000001","name":"A","mealSlots":["lunch"],"cuisineIds":[],"categoryIds":[]},
    {"dishId":"00000000-0000-4000-8000-000000000002","name":"B","mealSlots":["lunch"],"cuisineIds":[],"categoryIds":["e69b5f45-580d-5ee3-9e43-360650b4c650","bf53ba6f-c4fc-536b-a932-b7cb18cb7e60"]},
    {"dishId":"00000000-0000-4000-8000-000000000003","name":"C","mealSlots":["lunch"],"cuisineIds":[],"categoryIds":[]}]',
    1, 'lunch', 'abc', '[{"categoryIds":["bf53ba6f-c4fc-536b-a932-b7cb18cb7e60"]}]')) d
), 'a rice-and-porridge dish is drawn for a porridge fan');

select * from extensions.finish();
rollback;
