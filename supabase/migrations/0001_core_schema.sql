-- GM-06 schema 0.1.0; food/core 1.1.0; input GM-04.2 at d9e83d9.
-- Frozen migration after handoff. Later tasks allocate new numeric migrations.
begin;
-- Source of helpers embedded in 0001. After handoff, changes use new migrations.
create schema gm06_private;
revoke all on schema gm06_private from public, anon, authenticated;

create function gm06_private.json_matches(v jsonb, s jsonb) returns boolean
language plpgsql immutable set search_path = pg_catalog, gm06_private as $$
declare k text; child jsonb; actual text; expected jsonb; n numeric;
begin
  if v is null then return false; end if;
  -- Closed vocabulary; unsupported rules fail rather than silently allow data.
  for k in select jsonb_object_keys(s) loop
    if k not in ('type','anyOf','const','enum','pattern','minLength','maxLength',
      'minimum','maximum','properties','required','additionalProperties',
      'items','minItems','maxItems','uniqueItems','minProperties') then return false; end if;
  end loop;
  if s ? 'anyOf' then
    for child in select value from jsonb_array_elements(s->'anyOf') loop
      if gm06_private.json_matches(v, child) then return true; end if;
    end loop;
    return false;
  end if;
  if s ? 'const' and v <> s->'const' then return false; end if;
  if s ? 'enum' and not (s->'enum' @> jsonb_build_array(v)) then return false; end if;
  actual := jsonb_typeof(v); expected := s->'type';
  if expected is not null then
    if jsonb_typeof(expected) = 'array' then
      if not (expected @> jsonb_build_array(actual)) then return false; end if;
    elsif expected #>> '{}' = 'integer' then
      if actual <> 'number' then return false; end if;
      n := (v #>> '{}')::numeric;
      if n <> trunc(n) then return false; end if;
    elsif actual <> expected #>> '{}' then return false;
    end if;
  end if;
  case actual
  when 'string' then
    k := v #>> '{}';
    if s ? 'pattern' and not (k ~ (s->>'pattern')) then return false; end if;
    if s ? 'minLength' and char_length(k) < (s->>'minLength')::int then return false; end if;
    if s ? 'maxLength' and char_length(k) > (s->>'maxLength')::int then return false; end if;
  when 'number' then
    n := (v #>> '{}')::numeric;
    if s ? 'minimum' and n < (s->>'minimum')::numeric then return false; end if;
    if s ? 'maximum' and n > (s->>'maximum')::numeric then return false; end if;
  when 'object' then
    if s ? 'minProperties' and (select count(*) from jsonb_object_keys(v)) < (s->>'minProperties')::int then return false; end if;
    for k in select jsonb_array_elements_text(coalesce(s->'required','[]')) loop
      if not (v ? k) then return false; end if;
    end loop;
    for k, child in select * from jsonb_each(v) loop
      if s->'properties' ? k then
        if not gm06_private.json_matches(child, s->'properties'->k) then return false; end if;
      elsif s->'additionalProperties' = 'false'::jsonb then return false;
      end if;
    end loop;
  when 'array' then
    if s ? 'minItems' and jsonb_array_length(v) < (s->>'minItems')::int then return false; end if;
    if s ? 'maxItems' and jsonb_array_length(v) > (s->>'maxItems')::int then return false; end if;
    if s->'uniqueItems' = 'true'::jsonb and
       (select count(distinct value) <> count(*) from jsonb_array_elements(v)) then return false; end if;
    for child in select value from jsonb_array_elements(v) loop
      if not gm06_private.json_matches(child, s->'items') then return false; end if;
    end loop;
  else null;
  end case;
  return true;
end $$;

create function gm06_private.minute_of_day(t text) returns integer
language sql immutable strict set search_path = pg_catalog as $$
  select split_part(t,':',1)::integer*60 + split_part(t,':',2)::integer
$$;

create function gm06_private.interval_valid(s text, e text, offset_day bigint, full_day boolean)
returns boolean language sql immutable set search_path = pg_catalog, gm06_private as $$
  select coalesce(s is not null and e is not null and offset_day in (0,1) and
    gm06_private.minute_of_day(e)+offset_day*1440-gm06_private.minute_of_day(s) between 1 and 1440 and
    full_day = (gm06_private.minute_of_day(e)+offset_day*1440-gm06_private.minute_of_day(s)=1440),false)
$$;

create function gm06_private.exception_valid(v jsonb, status text, last_order text, offset_day bigint)
returns boolean language plpgsql immutable set search_path = pg_catalog, gm06_private as $$
declare a jsonb; b jsonb; point bigint; start_min bigint; end_min bigint; inside boolean := false;
begin
  if status <> 'open' then return v = '[]'::jsonb and last_order is null and offset_day is null; end if;
  if jsonb_array_length(v) = 0 or (last_order is null) <> (offset_day is null) then return false; end if;
  point := gm06_private.minute_of_day(last_order) + offset_day*1440;
  for a in select value from jsonb_array_elements(v) loop
    if not gm06_private.interval_valid(a->>'startTime',a->>'endTime',(a->>'endDayOffset')::bigint,(a->>'is24Hours')::boolean) then return false; end if;
    start_min := gm06_private.minute_of_day(a->>'startTime');
    end_min := gm06_private.minute_of_day(a->>'endTime')+(a->>'endDayOffset')::bigint*1440;
    inside := inside or (point >= start_min and point < end_min);
  end loop;
  -- Multiple intervals may touch, but cannot overlap or duplicate.
  if exists(select 1 from jsonb_array_elements(v) with ordinality a(val,ord)
      join jsonb_array_elements(v) with ordinality b(val,ord) on a.ord < b.ord
      where greatest(gm06_private.minute_of_day(a.val->>'startTime'),gm06_private.minute_of_day(b.val->>'startTime')) <
        least(gm06_private.minute_of_day(a.val->>'endTime')+(a.val->>'endDayOffset')::int*1440,
              gm06_private.minute_of_day(b.val->>'endTime')+(b.val->>'endDayOffset')::int*1440)) then return false; end if;
  return last_order is null or coalesce(inside,false);
end $$;

create function gm06_private.flavor_valid(v jsonb) returns boolean
language sql immutable set search_path = pg_catalog as $$
  select case when v is null or v = 'null'::jsonb then true else not exists (
    select 1 from jsonb_each(v) p where
      (p.value->'present' = 'null'::jsonb and p.value->>'intensity' <> 'unknown') or
      (p.value->'present' = 'false'::jsonb and p.value->>'intensity' <> 'none') or
      (p.value->'present' = 'true'::jsonb and p.value->>'intensity' = 'none')) end
$$;

create function gm06_private.polygon_valid(v jsonb) returns boolean
language plpgsql immutable set search_path = pg_catalog as $$
declare ring jsonb; point jsonb;
begin
  if v is null then return true; end if;
  for ring in select value from jsonb_array_elements(v->'coordinates') loop
    if ring->0 <> ring->(jsonb_array_length(ring)-1) then return false; end if;
    for point in select value from jsonb_array_elements(ring) loop
      if (point->>0)::numeric not between -180 and 180 or (point->>1)::numeric not between -90 and 90 then return false; end if;
    end loop;
  end loop;
  return true;
end $$;

create function gm06_private.timezone_valid(v text) returns boolean
language sql stable strict set search_path = pg_catalog as $$
  select exists(select 1 from pg_timezone_names where name = v)
$$;

create function gm06_private.roster_valid(roster uuid[], consent jsonb) returns boolean
language sql immutable set search_path = pg_catalog as $$
  select (select array_agg(id order by id) from unnest(roster) u(id)) =
    (select array_agg((entry->>'userId')::uuid order by (entry->>'userId')::uuid)
       from jsonb_array_elements(consent) e(entry))
$$;

create function gm06_private.version_guard() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if to_jsonb(new)->TG_ARGV[0] <> to_jsonb(old)->TG_ARGV[0] then
    raise exception using errcode='23514', message='GM06_IMMUTABLE_KEY';
  end if;
  if new is distinct from old and new.version <= old.version then
    raise exception using errcode='23514', message='GM06_VERSION_MUST_INCREASE';
  end if;
  if TG_TABLE_NAME in ('results','submissions','votes','idempotency') and new is distinct from old then
    raise exception using errcode='23514', message='GM06_ACK_RESULT_IMMUTABLE';
  end if;
  return new;
end $$;

-- JSON path extraction only for the fixed paths installed by migration.
create function gm06_private.reference_values(v jsonb, parts text[]) returns setof text
language plpgsql immutable set search_path = pg_catalog, gm06_private as $$
declare child jsonb;
begin
  if v is null or v = 'null'::jsonb then return; end if;
  if cardinality(parts)=0 then return next v #>> '{}'; return; end if;
  if parts[1]='*' then
    for child in select value from jsonb_each(v) loop
      return query select * from gm06_private.reference_values(child,parts[2:]);
    end loop;
  elsif parts[1]='[]' then
    for child in select value from jsonb_array_elements(v) loop
      return query select * from gm06_private.reference_values(child,parts[2:]);
    end loop;
  else
    return query select * from gm06_private.reference_values(v->parts[1],parts[2:]);
  end if;
end $$;

-- A private serialization row covers every table with an outgoing or incoming
-- nested FK. BEFORE STATEMENT acquires it before any affected row is locked.
-- This deliberately serializes these writes until a normalized FK design can
-- be reviewed with real workload measurements. No reference API/contract changes.
create table gm06_private.reference_epoch (
  singleton boolean primary key check(singleton),
  epoch bigint not null check(epoch>=0)
);
insert into gm06_private.reference_epoch values(true,0);
alter table gm06_private.reference_epoch enable row level security;
alter table gm06_private.reference_epoch force row level security;
revoke all on gm06_private.reference_epoch from public,anon,authenticated;

create function gm06_private.lock_references() returns trigger
language plpgsql security definer set search_path = pg_catalog, gm06_private as $$
begin
  -- A tuple UPDATE, rather than an advisory/row lock alone, makes a transaction
  -- with a stale REPEATABLE READ snapshot fail with 40001. READ COMMITTED waits
  -- here, then the volatile deferred check sees the preceding committed writes.
  update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
  if not found then
    raise exception using errcode='23514',message='GM06_REFERENCE_LOCK_MISSING';
  end if;
  return null;
end $$;

-- Deferred reference checks include the reverse (parent delete/update) edge.
-- Query current rows instead of queued NEW to permit multiple writes in one transaction.
-- Every affected statement already holds reference_epoch through commit. This
-- also protects SET CONSTRAINTS ALL IMMEDIATE followed by an idle transaction:
-- the competing parent/reference writer cannot pass the serialization boundary.
create function gm06_private.reference_guard() returns trigger
language plpgsql security definer set search_path = pg_catalog, gm06_private as $$
declare edge jsonb; bad boolean; path text[];
begin
  for edge in select value from jsonb_array_elements(TG_ARGV[0]::jsonb) loop
    select array_agg(value order by ord) into path from jsonb_array_elements_text(edge->'path') with ordinality p(value,ord);
    execute format('select exists(select 1 from public.%I s cross join lateral gm06_private.reference_values(to_jsonb(s),$1) r(value) where not exists(select 1 from %I.%I t where t.%I = r.value::uuid))',
      edge->>'table',edge->>'target_schema',edge->>'target',edge->>'key') into bad using path;
    if bad then raise exception using errcode='23503', message='GM06_NESTED_FK', detail=edge->>'table'||'.'||array_to_string(path,'.'); end if;
  end loop;
  return null;
end $$;

do $$ begin if not exists(select 1 from pg_roles where rolname='gm06_publisher') then create role gm06_publisher nologin noinherit nobypassrls; elsif exists(select 1 from pg_roles where rolname='gm06_publisher' and (rolcanlogin or rolinherit or rolbypassrls or rolsuper)) then raise exception 'Unsafe pre-existing gm06_publisher role'; end if; end $$;
create table public.schema_versions (schema_version text primary key, contract_id text not null, food_contract_version text not null, core_contract_version text not null, upstream_revision text not null, installed_at timestamptz not null default transaction_timestamp());
insert into public.schema_versions values ('0.1.0','food-v1/roadmap-v2/GM-06.1','1.1.0','1.1.0','d9e83d9c091b4487f7188bdfb7906e8f950db378',transaction_timestamp());
create table public.schedule_groups (schedule_id uuid primary key, owner_type text not null check(owner_type in ('venue','offering')), owner_id uuid not null, timezone text not null check(gm06_private.timezone_valid(timezone)), review_status text not null check(review_status in ('draft','verified','published')), fixture_only boolean not null default true, version bigint not null check(version>=1), venue_id uuid generated always as (case when owner_type='venue' then owner_id end) stored, offering_id uuid generated always as (case when owner_type='offering' then owner_id end) stored, unique(schedule_id,owner_type,owner_id), unique(schedule_id,owner_type,owner_id,timezone,review_status), unique(schedule_id,owner_type,owner_id,timezone), check(not fixture_only or review_status<>'published'));

-- food.taxonomy: dictionary columns; no implicit business defaults.
create table public.taxonomy (
  id uuid not null,
  type text not null,
  code text not null,
  label text not null,
  description text,
  status text not null,
  origin text,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  primary key (id),
  constraint taxonomy_unique_1 unique nulls not distinct (type,code),
  fixture_only boolean not null default true,
  constraint taxonomy_type_shape check (type is null or gm06_private.json_matches(to_jsonb(type),'{"type":"string","enum":["cuisine","origin","category"]}'::jsonb)),
  constraint taxonomy_code_shape check (code is null or gm06_private.json_matches(to_jsonb(code),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint taxonomy_label_shape check (label is null or gm06_private.json_matches(to_jsonb(label),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint taxonomy_description_shape check (description is null or gm06_private.json_matches(to_jsonb(description),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint taxonomy_status_shape check (status is null or gm06_private.json_matches(to_jsonb(status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint taxonomy_origin_shape check (origin is null or gm06_private.json_matches(to_jsonb(origin),'{"type":"string","enum":["north","central","south","unknown","not_applicable"]}'::jsonb)),
  constraint taxonomy_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint taxonomy_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint taxonomy_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint taxonomy_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint taxonomy_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check (status=review_status)
);
comment on table public.taxonomy is 'food.taxonomy GM-06.1 / GM-04.2; trusted publisher only';
create trigger taxonomy_version_guard before update on public.taxonomy for each row execute function gm06_private.version_guard('id');
create index taxonomy_source_ref_idx on public.taxonomy(source_ref);
create index taxonomy_valid_until_idx on public.taxonomy(valid_until);

-- food.dishes: dictionary columns; no implicit business defaults.
create table public.dishes (
  id uuid not null,
  name text not null,
  description text,
  aliases text[] not null,
  cuisine_ids uuid[] not null,
  category_ids uuid[] not null,
  meal_slots text[] not null,
  time_hints text[] not null,
  classification_status text not null,
  origin text,
  ingredient_tags text[],
  temperature text,
  flavor jsonb,
  artwork jsonb,
  source_dish_ids text[] not null,
  status text not null,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  primary key (id),
  fixture_only boolean not null default true,
  constraint dishes_name_shape check (name is null or gm06_private.json_matches(to_jsonb(name),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint dishes_description_shape check (description is null or gm06_private.json_matches(to_jsonb(description),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint dishes_aliases_shape check (aliases is null or gm06_private.json_matches(to_jsonb(aliases),'{"type":"array","items":{"type":"string","minLength":1,"pattern":"\\S"},"uniqueItems":true}'::jsonb)),
  constraint dishes_cuisine_ids_shape check (cuisine_ids is null or gm06_private.json_matches(to_jsonb(cuisine_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  constraint dishes_category_ids_shape check (category_ids is null or gm06_private.json_matches(to_jsonb(category_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  constraint dishes_meal_slots_shape check (meal_slots is null or gm06_private.json_matches(to_jsonb(meal_slots),'{"type":"array","items":{"type":"string","enum":["breakfast","lunch","dinner","snack"]},"uniqueItems":true}'::jsonb)),
  constraint dishes_time_hints_shape check (time_hints is null or gm06_private.json_matches(to_jsonb(time_hints),'{"type":"array","items":{"type":"string","enum":["late_night"]},"uniqueItems":true}'::jsonb)),
  constraint dishes_classification_status_shape check (classification_status is null or gm06_private.json_matches(to_jsonb(classification_status),'{"type":"string","enum":["unknown","needs_review","reviewed"]}'::jsonb)),
  constraint dishes_origin_shape check (origin is null or gm06_private.json_matches(to_jsonb(origin),'{"type":"string","enum":["north","central","south","unknown","not_applicable"]}'::jsonb)),
  constraint dishes_ingredient_tags_shape check (ingredient_tags is null or gm06_private.json_matches(to_jsonb(ingredient_tags),'{"type":"array","items":{"type":"string","minLength":1,"pattern":"\\S"},"uniqueItems":true}'::jsonb)),
  constraint dishes_temperature_shape check (temperature is null or gm06_private.json_matches(to_jsonb(temperature),'{"type":"string","enum":["hot","warm","cold","ambient","unknown"]}'::jsonb)),
  constraint dishes_flavor_shape check (flavor is null or gm06_private.json_matches(flavor,'{"type":"object","properties":{"spicy":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"salty":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"sweet":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"sour":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false}},"required":["spicy","salty","sweet","sour"],"additionalProperties":false}'::jsonb)),
  constraint dishes_artwork_shape check (artwork is null or gm06_private.json_matches(artwork,'{"type":"object","properties":{"url":{"type":"string","pattern":"^https?://[^\\s]+$"},"sourceRef":{"anyOf":[{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},{"type":"null"}]},"usageRights":{"type":"string","enum":["unknown","granted","licensed","public_domain","denied"]},"license":{"anyOf":[{"type":"string","minLength":1,"pattern":"\\S"},{"type":"null"}]},"attribution":{"anyOf":[{"type":"string","minLength":1,"pattern":"\\S"},{"type":"null"}]}},"required":["url","sourceRef","usageRights","license","attribution"],"additionalProperties":false}'::jsonb)),
  constraint dishes_source_dish_ids_shape check (source_dish_ids is null or gm06_private.json_matches(to_jsonb(source_dish_ids),'{"type":"array","items":{"type":"string","minLength":1,"pattern":"\\S"},"uniqueItems":true}'::jsonb)),
  constraint dishes_status_shape check (status is null or gm06_private.json_matches(to_jsonb(status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint dishes_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint dishes_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint dishes_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint dishes_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint dishes_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check (status=review_status),
  check (gm06_private.flavor_valid(flavor)),
  check (review_status='draft' or (classification_status='reviewed' and cardinality(cuisine_ids)>0 and cardinality(category_ids)>0 and cardinality(meal_slots)>0))
);
comment on table public.dishes is 'food.dishes GM-06.1 / GM-04.2; trusted publisher only';
create trigger dishes_version_guard before update on public.dishes for each row execute function gm06_private.version_guard('id');
create index dishes_aliases_gin on public.dishes using gin(aliases);
create index dishes_cuisine_ids_gin on public.dishes using gin(cuisine_ids);
create index dishes_category_ids_gin on public.dishes using gin(category_ids);
create index dishes_meal_slots_gin on public.dishes using gin(meal_slots);
create index dishes_time_hints_gin on public.dishes using gin(time_hints);
create index dishes_ingredient_tags_gin on public.dishes using gin(ingredient_tags);
create index dishes_source_dish_ids_gin on public.dishes using gin(source_dish_ids);
create index dishes_source_ref_idx on public.dishes(source_ref);
create index dishes_valid_until_idx on public.dishes(valid_until);

-- food.venues: dictionary columns; no implicit business defaults.
create table public.venues (
  id uuid not null,
  branch_name text not null,
  address text,
  admin_area_id text,
  lat numeric,
  lng numeric,
  timezone text not null,
  status text not null,
  service_modes text[] not null,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  schedule_id uuid,
  primary key (id),
  fixture_only boolean not null default true,
  _schedule_owner_type text generated always as ('venue'::text) stored,
  constraint venues_branch_name_shape check (branch_name is null or gm06_private.json_matches(to_jsonb(branch_name),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint venues_address_shape check (address is null or gm06_private.json_matches(to_jsonb(address),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint venues_admin_area_id_shape check (admin_area_id is null or gm06_private.json_matches(to_jsonb(admin_area_id),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint venues_lat_shape check (lat is null or gm06_private.json_matches(to_jsonb(lat),'{"type":"number","minimum":-90,"maximum":90}'::jsonb)),
  check (lat::text not in ('NaN','Infinity','-Infinity')),
  constraint venues_lng_shape check (lng is null or gm06_private.json_matches(to_jsonb(lng),'{"type":"number","minimum":-180,"maximum":180}'::jsonb)),
  check (lng::text not in ('NaN','Infinity','-Infinity')),
  constraint venues_timezone_shape check (timezone is null or gm06_private.json_matches(to_jsonb(timezone),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (gm06_private.timezone_valid(timezone)),
  constraint venues_status_shape check (status is null or gm06_private.json_matches(to_jsonb(status),'{"type":"string","enum":["active","closed","unknown"]}'::jsonb)),
  constraint venues_service_modes_shape check (service_modes is null or gm06_private.json_matches(to_jsonb(service_modes),'{"type":"array","items":{"type":"string","enum":["dine_in","takeaway","delivery"]},"uniqueItems":true}'::jsonb)),
  constraint venues_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint venues_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint venues_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint venues_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint venues_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check ((lat is null)=(lng is null)),
  check (review_status='draft' or (address is not null and admin_area_id is not null and lat is not null and lng is not null and schedule_id is not null)),
  check (review_status<>'published' or (status='active' and cardinality(service_modes)>0))
);
comment on table public.venues is 'food.venues GM-06.1 / GM-04.2; trusted publisher only';
create trigger venues_version_guard before update on public.venues for each row execute function gm06_private.version_guard('id');
create index venues_service_modes_gin on public.venues using gin(service_modes);
create index venues_source_ref_idx on public.venues(source_ref);
create index venues_schedule_id_idx on public.venues(schedule_id);
create index venues_valid_until_idx on public.venues(valid_until);

-- food.venueDishes: dictionary columns; no implicit business defaults.
create table public.venue_dishes (
  offering_id uuid not null,
  venue_id uuid not null,
  dish_id uuid not null,
  variant text,
  menu_name text not null,
  menu_source uuid,
  schedule_id uuid,
  service_mode text,
  price_min numeric,
  price_max numeric,
  unit text,
  currency text,
  serving_size text,
  profile_overrides jsonb,
  artwork jsonb,
  status text not null,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  primary key (offering_id),
  constraint venue_dishes_unique_1 unique nulls not distinct (venue_id,dish_id,variant,service_mode),
  fixture_only boolean not null default true,
  _schedule_owner_type text generated always as ('offering'::text) stored,
  constraint venue_dishes_variant_shape check (variant is null or gm06_private.json_matches(to_jsonb(variant),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint venue_dishes_menu_name_shape check (menu_name is null or gm06_private.json_matches(to_jsonb(menu_name),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint venue_dishes_service_mode_shape check (service_mode is null or gm06_private.json_matches(to_jsonb(service_mode),'{"type":"string","enum":["dine_in","takeaway","delivery"]}'::jsonb)),
  constraint venue_dishes_price_min_shape check (price_min is null or gm06_private.json_matches(to_jsonb(price_min),'{"type":"number","minimum":0}'::jsonb)),
  check (price_min::text not in ('NaN','Infinity','-Infinity')),
  constraint venue_dishes_price_max_shape check (price_max is null or gm06_private.json_matches(to_jsonb(price_max),'{"type":"number","minimum":0}'::jsonb)),
  check (price_max::text not in ('NaN','Infinity','-Infinity')),
  constraint venue_dishes_unit_shape check (unit is null or gm06_private.json_matches(to_jsonb(unit),'{"type":"string","enum":["portion","item","person","group","kg","menu_item_unspecified"]}'::jsonb)),
  constraint venue_dishes_currency_shape check (currency is null or gm06_private.json_matches(to_jsonb(currency),'{"type":"string","enum":["VND","USD","THB","KRW","JPY","CNY","EUR","other"]}'::jsonb)),
  constraint venue_dishes_serving_size_shape check (serving_size is null or gm06_private.json_matches(to_jsonb(serving_size),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint venue_dishes_profile_overrides_shape check (profile_overrides is null or gm06_private.json_matches(profile_overrides,'{"type":"object","properties":{"cuisineIds":{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true},"categoryIds":{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true},"mealSlots":{"type":"array","items":{"type":"string","enum":["breakfast","lunch","dinner","snack"]},"uniqueItems":true},"timeHints":{"type":"array","items":{"type":"string","enum":["late_night"]},"uniqueItems":true},"temperature":{"anyOf":[{"type":"string","enum":["hot","warm","cold","ambient","unknown"]},{"type":"null"}]},"flavor":{"anyOf":[{"type":"object","properties":{"spicy":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"salty":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"sweet":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"sour":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false}},"required":["spicy","salty","sweet","sour"],"additionalProperties":false},{"type":"null"}]},"origin":{"anyOf":[{"type":"string","enum":["north","central","south","unknown","not_applicable"]},{"type":"null"}]}},"required":[],"additionalProperties":false,"minProperties":1}'::jsonb)),
  constraint venue_dishes_artwork_shape check (artwork is null or gm06_private.json_matches(artwork,'{"type":"object","properties":{"url":{"type":"string","pattern":"^https?://[^\\s]+$"},"sourceRef":{"anyOf":[{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},{"type":"null"}]},"usageRights":{"type":"string","enum":["unknown","granted","licensed","public_domain","denied"]},"license":{"anyOf":[{"type":"string","minLength":1,"pattern":"\\S"},{"type":"null"}]},"attribution":{"anyOf":[{"type":"string","minLength":1,"pattern":"\\S"},{"type":"null"}]}},"required":["url","sourceRef","usageRights","license","attribution"],"additionalProperties":false}'::jsonb)),
  constraint venue_dishes_status_shape check (status is null or gm06_private.json_matches(to_jsonb(status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint venue_dishes_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint venue_dishes_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint venue_dishes_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint venue_dishes_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint venue_dishes_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check (status=review_status),
  check (price_min is null or price_max is null or price_min<=price_max),
  check ((price_min is null and price_max is null) or (unit is not null and currency is not null)),
  check (gm06_private.flavor_valid(profile_overrides->'flavor')),
  check (review_status='draft' or (menu_source is not null and schedule_id is not null and service_mode is not null))
);
comment on table public.venue_dishes is 'food.venueDishes GM-06.1 / GM-04.2; trusted publisher only';
create trigger venue_dishes_version_guard before update on public.venue_dishes for each row execute function gm06_private.version_guard('offering_id');
create index venue_dishes_venue_id_idx on public.venue_dishes(venue_id);
create index venue_dishes_dish_id_idx on public.venue_dishes(dish_id);
create index venue_dishes_menu_source_idx on public.venue_dishes(menu_source);
create index venue_dishes_schedule_id_idx on public.venue_dishes(schedule_id);
create index venue_dishes_source_ref_idx on public.venue_dishes(source_ref);
create index venue_dishes_valid_until_idx on public.venue_dishes(valid_until);

-- food.weeklySchedules: dictionary columns; no implicit business defaults.
create table public.weekly_schedules (
  id uuid not null,
  schedule_id uuid not null,
  owner_type text not null,
  owner_id uuid not null,
  day_of_week bigint not null,
  start_time text,
  end_time text,
  end_day_offset bigint,
  is24_hours boolean not null,
  timezone text not null,
  status text not null,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  last_order text,
  last_order_day_offset bigint,
  primary key (id),
  fixture_only boolean not null default true,
  constraint weekly_schedules_owner_type_shape check (owner_type is null or gm06_private.json_matches(to_jsonb(owner_type),'{"type":"string","enum":["venue","offering"]}'::jsonb)),
  constraint weekly_schedules_day_of_week_shape check (day_of_week is null or gm06_private.json_matches(to_jsonb(day_of_week),'{"type":"integer","minimum":1,"maximum":7}'::jsonb)),
  constraint weekly_schedules_start_time_shape check (start_time is null or gm06_private.json_matches(to_jsonb(start_time),'{"type":"string","pattern":"^([01]\\d|2[0-3]):[0-5]\\d$"}'::jsonb)),
  constraint weekly_schedules_end_time_shape check (end_time is null or gm06_private.json_matches(to_jsonb(end_time),'{"type":"string","pattern":"^([01]\\d|2[0-3]):[0-5]\\d$"}'::jsonb)),
  constraint weekly_schedules_end_day_offset_shape check (end_day_offset is null or gm06_private.json_matches(to_jsonb(end_day_offset),'{"type":"integer","minimum":0,"maximum":1}'::jsonb)),
  constraint weekly_schedules_timezone_shape check (timezone is null or gm06_private.json_matches(to_jsonb(timezone),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (gm06_private.timezone_valid(timezone)),
  constraint weekly_schedules_status_shape check (status is null or gm06_private.json_matches(to_jsonb(status),'{"type":"string","enum":["open","closed","unknown"]}'::jsonb)),
  constraint weekly_schedules_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint weekly_schedules_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint weekly_schedules_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint weekly_schedules_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint weekly_schedules_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint weekly_schedules_last_order_shape check (last_order is null or gm06_private.json_matches(to_jsonb(last_order),'{"type":"string","pattern":"^([01]\\d|2[0-3]):[0-5]\\d$"}'::jsonb)),
  constraint weekly_schedules_last_order_day_offset_shape check (last_order_day_offset is null or gm06_private.json_matches(to_jsonb(last_order_day_offset),'{"type":"integer","minimum":0,"maximum":1}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check ((status='open' and gm06_private.interval_valid(start_time,end_time,end_day_offset,is24_hours)) or (status<>'open' and start_time is null and end_time is null and end_day_offset is null and not is24_hours)),
  check ((last_order is null)=(last_order_day_offset is null)),
  check (last_order is null or (status='open' and field_sources ? 'hours' and gm06_private.minute_of_day(last_order)+last_order_day_offset*1440 >= gm06_private.minute_of_day(start_time) and gm06_private.minute_of_day(last_order)+last_order_day_offset*1440 < gm06_private.minute_of_day(end_time)+end_day_offset*1440))
);
comment on table public.weekly_schedules is 'food.weeklySchedules GM-06.1 / GM-04.2; trusted publisher only';
create trigger weekly_schedules_version_guard before update on public.weekly_schedules for each row execute function gm06_private.version_guard('id');
create index weekly_schedules_source_ref_idx on public.weekly_schedules(source_ref);
create index weekly_schedules_valid_until_idx on public.weekly_schedules(valid_until);

-- food.dateExceptions: dictionary columns; no implicit business defaults.
create table public.date_exceptions (
  id uuid not null,
  schedule_id uuid not null,
  local_date date not null,
  status text not null,
  intervals jsonb not null,
  last_order text,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  last_order_day_offset bigint,
  primary key (id),
  constraint date_exceptions_unique_1 unique nulls not distinct (schedule_id,local_date),
  fixture_only boolean not null default true,
  constraint date_exceptions_status_shape check (status is null or gm06_private.json_matches(to_jsonb(status),'{"type":"string","enum":["open","closed","unknown"]}'::jsonb)),
  constraint date_exceptions_intervals_shape check (intervals is null or gm06_private.json_matches(intervals,'{"type":"array","items":{"type":"object","properties":{"startTime":{"type":"string","pattern":"^([01]\\d|2[0-3]):[0-5]\\d$"},"endTime":{"type":"string","pattern":"^([01]\\d|2[0-3]):[0-5]\\d$"},"endDayOffset":{"type":"integer","minimum":0,"maximum":1},"is24Hours":{"type":"boolean"}},"required":["startTime","endTime","endDayOffset","is24Hours"],"additionalProperties":false}}'::jsonb)),
  constraint date_exceptions_last_order_shape check (last_order is null or gm06_private.json_matches(to_jsonb(last_order),'{"type":"string","pattern":"^([01]\\d|2[0-3]):[0-5]\\d$"}'::jsonb)),
  constraint date_exceptions_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint date_exceptions_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint date_exceptions_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint date_exceptions_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint date_exceptions_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint date_exceptions_last_order_day_offset_shape check (last_order_day_offset is null or gm06_private.json_matches(to_jsonb(last_order_day_offset),'{"type":"integer","minimum":0,"maximum":1}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check (gm06_private.exception_valid(intervals,status,last_order,last_order_day_offset)),
  check (last_order is null or field_sources ? 'hours')
);
comment on table public.date_exceptions is 'food.dateExceptions GM-06.1 / GM-04.2; trusted publisher only';
create trigger date_exceptions_version_guard before update on public.date_exceptions for each row execute function gm06_private.version_guard('id');
create index date_exceptions_schedule_id_idx on public.date_exceptions(schedule_id);
create index date_exceptions_source_ref_idx on public.date_exceptions(source_ref);
create index date_exceptions_valid_until_idx on public.date_exceptions(valid_until);

-- food.availabilityOverrides: dictionary columns; no implicit business defaults.
create table public.availability_overrides (
  id uuid not null,
  offering_id uuid not null,
  state text not null,
  source uuid,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  primary key (id),
  fixture_only boolean not null default true,
  constraint availability_overrides_state_shape check (state is null or gm06_private.json_matches(to_jsonb(state),'{"type":"string","enum":["available","sold_out","paused","unknown"]}'::jsonb)),
  check (isfinite(observed_at)),
  check (isfinite(expires_at)),
  constraint availability_overrides_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint availability_overrides_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint availability_overrides_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint availability_overrides_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint availability_overrides_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check (expires_at > observed_at)
);
comment on table public.availability_overrides is 'food.availabilityOverrides GM-06.1 / GM-04.2; trusted publisher only';
create trigger availability_overrides_version_guard before update on public.availability_overrides for each row execute function gm06_private.version_guard('id');
create index availability_overrides_offering_id_idx on public.availability_overrides(offering_id);
create index availability_overrides_source_idx on public.availability_overrides(source);
create index availability_overrides_source_ref_idx on public.availability_overrides(source_ref);
create index availability_overrides_expires_at_idx on public.availability_overrides(expires_at);
create index availability_overrides_valid_until_idx on public.availability_overrides(valid_until);

-- food.coverageAreas: dictionary columns; no implicit business defaults.
create table public.coverage_areas (
  area_id uuid not null,
  name text not null,
  boundary jsonb,
  dataset_version text not null,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  primary key (area_id),
  fixture_only boolean not null default true,
  constraint coverage_areas_name_shape check (name is null or gm06_private.json_matches(to_jsonb(name),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint coverage_areas_boundary_shape check (boundary is null or gm06_private.json_matches(boundary,'{"type":"object","properties":{"type":{"const":"Polygon"},"coordinates":{"type":"array","items":{"type":"array","items":{"type":"array","items":{"type":"number"},"minItems":2,"maxItems":2},"minItems":4},"minItems":1}},"required":["type","coordinates"],"additionalProperties":false}'::jsonb)),
  constraint coverage_areas_dataset_version_shape check (dataset_version is null or gm06_private.json_matches(to_jsonb(dataset_version),'{"type":"string","pattern":"^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"}'::jsonb)),
  constraint coverage_areas_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint coverage_areas_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint coverage_areas_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint coverage_areas_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint coverage_areas_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check (gm06_private.polygon_valid(boundary)),
  check (review_status='draft' or boundary is not null)
);
comment on table public.coverage_areas is 'food.coverageAreas GM-06.1 / GM-04.2; trusted publisher only';
create trigger coverage_areas_version_guard before update on public.coverage_areas for each row execute function gm06_private.version_guard('area_id');
create index coverage_areas_source_ref_idx on public.coverage_areas(source_ref);
create index coverage_areas_valid_until_idx on public.coverage_areas(valid_until);

-- food.publicAnchors: dictionary columns; no implicit business defaults.
create table public.public_anchors (
  anchor_id uuid not null,
  name text not null,
  lat numeric not null,
  lng numeric not null,
  coverage_id uuid not null,
  is_public boolean not null,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  primary key (anchor_id),
  fixture_only boolean not null default true,
  constraint public_anchors_name_shape check (name is null or gm06_private.json_matches(to_jsonb(name),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint public_anchors_lat_shape check (lat is null or gm06_private.json_matches(to_jsonb(lat),'{"type":"number","minimum":-90,"maximum":90}'::jsonb)),
  check (lat::text not in ('NaN','Infinity','-Infinity')),
  constraint public_anchors_lng_shape check (lng is null or gm06_private.json_matches(to_jsonb(lng),'{"type":"number","minimum":-180,"maximum":180}'::jsonb)),
  check (lng::text not in ('NaN','Infinity','-Infinity')),
  constraint public_anchors_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint public_anchors_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint public_anchors_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint public_anchors_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint public_anchors_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check (is_public)
);
comment on table public.public_anchors is 'food.publicAnchors GM-06.1 / GM-04.2; trusted publisher only';
create trigger public_anchors_version_guard before update on public.public_anchors for each row execute function gm06_private.version_guard('anchor_id');
create index public_anchors_coverage_id_idx on public.public_anchors(coverage_id);
create index public_anchors_source_ref_idx on public.public_anchors(source_ref);
create index public_anchors_valid_until_idx on public.public_anchors(valid_until);

-- food.dataSources: dictionary columns; no implicit business defaults.
create table public.data_sources (
  source_ref uuid not null,
  locator text not null,
  usage_rights text not null,
  license text,
  attribution text,
  status text not null,
  version bigint not null,
  review_status text not null,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  primary key (source_ref),
  fixture_only boolean not null default true,
  constraint data_sources_locator_shape check (locator is null or gm06_private.json_matches(to_jsonb(locator),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint data_sources_usage_rights_shape check (usage_rights is null or gm06_private.json_matches(to_jsonb(usage_rights),'{"type":"string","enum":["unknown","granted","licensed","public_domain","denied"]}'::jsonb)),
  constraint data_sources_license_shape check (license is null or gm06_private.json_matches(to_jsonb(license),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint data_sources_attribution_shape check (attribution is null or gm06_private.json_matches(to_jsonb(attribution),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint data_sources_status_shape check (status is null or gm06_private.json_matches(to_jsonb(status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint data_sources_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint data_sources_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint data_sources_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint data_sources_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint data_sources_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (status=review_status),
  check (usage_rights not in ('granted','licensed','public_domain') or license is not null)
);
comment on table public.data_sources is 'food.dataSources GM-06.1 / GM-04.2; trusted publisher only';
create trigger data_sources_version_guard before update on public.data_sources for each row execute function gm06_private.version_guard('source_ref');
create index data_sources_valid_until_idx on public.data_sources(valid_until);

-- food.datasetVersions: dictionary columns; no implicit business defaults.
create table public.dataset_versions (
  id uuid not null,
  dataset_version text not null,
  contract_version text not null,
  status text not null,
  checksum text,
  artifact_locator text,
  previous_version_id uuid,
  quality_report text,
  rollback_locator text,
  version bigint not null,
  review_status text not null,
  source_ref uuid,
  field_sources jsonb not null,
  checked_at timestamptz,
  valid_until timestamptz,
  entered_by text not null,
  reviewed_by text,
  primary key (id),
  constraint dataset_versions_unique_1 unique nulls not distinct (dataset_version),
  fixture_only boolean not null default true,
  constraint dataset_versions_dataset_version_shape check (dataset_version is null or gm06_private.json_matches(to_jsonb(dataset_version),'{"type":"string","pattern":"^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"}'::jsonb)),
  constraint dataset_versions_contract_version_shape check (contract_version is null or gm06_private.json_matches(to_jsonb(contract_version),'{"type":"string","pattern":"^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"}'::jsonb)),
  constraint dataset_versions_status_shape check (status is null or gm06_private.json_matches(to_jsonb(status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint dataset_versions_checksum_shape check (checksum is null or gm06_private.json_matches(to_jsonb(checksum),'{"type":"string","pattern":"^[0-9a-f]{64}$"}'::jsonb)),
  constraint dataset_versions_artifact_locator_shape check (artifact_locator is null or gm06_private.json_matches(to_jsonb(artifact_locator),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint dataset_versions_quality_report_shape check (quality_report is null or gm06_private.json_matches(to_jsonb(quality_report),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint dataset_versions_rollback_locator_shape check (rollback_locator is null or gm06_private.json_matches(to_jsonb(rollback_locator),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint dataset_versions_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint dataset_versions_review_status_shape check (review_status is null or gm06_private.json_matches(to_jsonb(review_status),'{"type":"string","enum":["draft","verified","published"]}'::jsonb)),
  constraint dataset_versions_field_sources_shape check (field_sources is null or gm06_private.json_matches(field_sources,'{"type":"object","properties":{"name":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"taxonomy":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"image":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"menu":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"price":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coordinates":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"address":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"hours":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"availability":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"coverage":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"}},"additionalProperties":false}'::jsonb)),
  check (isfinite(checked_at)),
  check (isfinite(valid_until)),
  constraint dataset_versions_entered_by_shape check (entered_by is null or gm06_private.json_matches(to_jsonb(entered_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint dataset_versions_reviewed_by_shape check (reviewed_by is null or gm06_private.json_matches(to_jsonb(reviewed_by),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (not fixture_only or review_status <> 'published'),
  check (reviewed_by is null or reviewed_by <> entered_by),
  check (valid_until is null or checked_at is null or valid_until > checked_at),
  check (review_status='draft' or (checked_at is not null and valid_until is not null and reviewed_by is not null)),
  check (review_status='draft' or source_ref is not null),
  check (status=review_status),
  check (contract_version='1.1.0'),
  check (review_status<>'published' or (checksum is not null and artifact_locator is not null and quality_report is not null and rollback_locator is not null))
);
comment on table public.dataset_versions is 'food.datasetVersions GM-06.1 / GM-04.2; trusted publisher only';
create trigger dataset_versions_version_guard before update on public.dataset_versions for each row execute function gm06_private.version_guard('id');
create index dataset_versions_previous_version_id_idx on public.dataset_versions(previous_version_id);
create index dataset_versions_source_ref_idx on public.dataset_versions(source_ref);
create index dataset_versions_valid_until_idx on public.dataset_versions(valid_until);

-- core.profiles: dictionary columns; no implicit business defaults.
create table public.profiles (
  id uuid not null,
  user_id uuid not null,
  display_name text not null,
  created_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint profiles_unique_1 unique nulls not distinct (user_id),
  constraint profiles_display_name_shape check (display_name is null or gm06_private.json_matches(to_jsonb(display_name),'{"type":"string","minLength":1,"maxLength":24,"pattern":"\\S"}'::jsonb)),
  check (isfinite(created_at)),
  constraint profiles_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb))
);
comment on table public.profiles is 'core.profiles GM-06.1 / GM-04.2; self';
create trigger profiles_version_guard before update on public.profiles for each row execute function gm06_private.version_guard('id');
create index profiles_user_id_idx on public.profiles(user_id);

-- core.rooms: dictionary columns; no implicit business defaults.
create table public.rooms (
  id uuid not null,
  code text not null,
  host_user_id uuid not null,
  state text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  expires_at timestamptz not null,
  meal_slot text not null,
  time_hint text,
  budget jsonb,
  avoid_recent boolean not null,
  anchor_id uuid not null,
  coverage_id uuid not null,
  radius_m numeric not null,
  desired_at timestamptz not null,
  timezone text not null,
  service_mode text not null,
  catalogue_version text not null,
  dataset_version text not null,
  eligibility_version text not null,
  context_version bigint not null,
  pool_version bigint not null,
  policy_version text not null,
  pool_seed text not null,
  roster_user_ids uuid[] not null,
  consent_snapshot jsonb not null,
  evaluated_at timestamptz,
  locked_at timestamptz,
  version bigint not null,
  primary key (id),
  constraint rooms_unique_1 unique nulls not distinct (code),
  constraint rooms_code_shape check (code is null or gm06_private.json_matches(to_jsonb(code),'{"type":"string","pattern":"^[A-HJ-NP-Z2-9]{6}$"}'::jsonb)),
  constraint rooms_state_shape check (state is null or gm06_private.json_matches(to_jsonb(state),'{"type":"string","enum":["LOBBY","ROUND_1","ROUND_2","DECIDED","NO_CONSENSUS","CANCELLED","EXPIRED"]}'::jsonb)),
  check (isfinite(created_at)),
  check (isfinite(updated_at)),
  check (isfinite(expires_at)),
  constraint rooms_meal_slot_shape check (meal_slot is null or gm06_private.json_matches(to_jsonb(meal_slot),'{"type":"string","enum":["breakfast","lunch","dinner","snack"]}'::jsonb)),
  constraint rooms_time_hint_shape check (time_hint is null or gm06_private.json_matches(to_jsonb(time_hint),'{"type":"string","enum":["late_night"]}'::jsonb)),
  constraint rooms_budget_shape check (budget is null or gm06_private.json_matches(budget,'{"type":"object","properties":{"min":{"anyOf":[{"type":"number","minimum":0},{"type":"null"}]},"max":{"anyOf":[{"type":"number","minimum":0},{"type":"null"}]},"currency":{"const":"VND"},"unit":{"const":"person"}},"required":["min","max","currency","unit"],"additionalProperties":false}'::jsonb)),
  constraint rooms_radius_m_shape check (radius_m is null or gm06_private.json_matches(to_jsonb(radius_m),'{"type":"number","minimum":0}'::jsonb)),
  check (radius_m::text not in ('NaN','Infinity','-Infinity')),
  check (isfinite(desired_at)),
  constraint rooms_timezone_shape check (timezone is null or gm06_private.json_matches(to_jsonb(timezone),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (gm06_private.timezone_valid(timezone)),
  constraint rooms_service_mode_shape check (service_mode is null or gm06_private.json_matches(to_jsonb(service_mode),'{"type":"string","enum":["dine_in","takeaway","delivery"]}'::jsonb)),
  constraint rooms_catalogue_version_shape check (catalogue_version is null or gm06_private.json_matches(to_jsonb(catalogue_version),'{"type":"string","pattern":"^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"}'::jsonb)),
  constraint rooms_dataset_version_shape check (dataset_version is null or gm06_private.json_matches(to_jsonb(dataset_version),'{"type":"string","pattern":"^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"}'::jsonb)),
  constraint rooms_eligibility_version_shape check (eligibility_version is null or gm06_private.json_matches(to_jsonb(eligibility_version),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint rooms_context_version_shape check (context_version is null or gm06_private.json_matches(to_jsonb(context_version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint rooms_pool_version_shape check (pool_version is null or gm06_private.json_matches(to_jsonb(pool_version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint rooms_policy_version_shape check (policy_version is null or gm06_private.json_matches(to_jsonb(policy_version),'{"type":"string","enum":["decision-v2"]}'::jsonb)),
  constraint rooms_pool_seed_shape check (pool_seed is null or gm06_private.json_matches(to_jsonb(pool_seed),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint rooms_roster_user_ids_shape check (roster_user_ids is null or gm06_private.json_matches(to_jsonb(roster_user_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  constraint rooms_consent_snapshot_shape check (consent_snapshot is null or gm06_private.json_matches(consent_snapshot,'{"type":"array","items":{"type":"object","properties":{"userId":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"historyConsent":{"type":"boolean"}},"required":["userId","historyConsent"],"additionalProperties":false}}'::jsonb)),
  check (isfinite(evaluated_at)),
  check (isfinite(locked_at)),
  constraint rooms_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (expires_at > created_at),
  check (updated_at >= created_at),
  check (locked_at is null or gm06_private.roster_valid(roster_user_ids,consent_snapshot)),
  check (radius_m>0),
  check (budget is null or budget->'min'='null'::jsonb or budget->'max'='null'::jsonb or (budget->>'min')::numeric <= (budget->>'max')::numeric),
  check (state not in ('ROUND_1','ROUND_2','DECIDED','NO_CONSENSUS') or (locked_at is not null and evaluated_at is not null and desired_at>=locked_at and cardinality(roster_user_ids) between 2 and 8 and jsonb_array_length(consent_snapshot)=cardinality(roster_user_ids))),
  check (state<>'LOBBY' or locked_at is null)
);
comment on table public.rooms is 'core.rooms GM-06.1 / GM-04.2; member snapshot via RPC; consent/roster lock server_only';
create trigger rooms_version_guard before update on public.rooms for each row execute function gm06_private.version_guard('id');
create index rooms_host_user_id_idx on public.rooms(host_user_id);
create index rooms_anchor_id_idx on public.rooms(anchor_id);
create index rooms_coverage_id_idx on public.rooms(coverage_id);
create index rooms_roster_user_ids_gin on public.rooms using gin(roster_user_ids);
create index rooms_expires_at_idx on public.rooms(expires_at);
create index rooms_desired_at_idx on public.rooms(desired_at);

-- core.members: dictionary columns; no implicit business defaults.
create table public.members (
  id uuid not null,
  room_id uuid not null,
  user_id uuid not null,
  nickname text not null,
  ready boolean not null,
  history_consent boolean not null,
  joined_at timestamptz not null,
  left_at timestamptz,
  version bigint not null,
  primary key (id),
  constraint members_unique_1 unique nulls not distinct (room_id,user_id),
  constraint members_nickname_shape check (nickname is null or gm06_private.json_matches(to_jsonb(nickname),'{"type":"string","minLength":1,"maxLength":24,"pattern":"\\S"}'::jsonb)),
  check (isfinite(joined_at)),
  check (isfinite(left_at)),
  constraint members_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (left_at >= joined_at)
);
comment on table public.members is 'core.members GM-06.1 / GM-04.2; member roster; own mutation RPC';
create trigger members_version_guard before update on public.members for each row execute function gm06_private.version_guard('id');
create index members_room_id_idx on public.members(room_id);
create index members_user_id_idx on public.members(user_id);

-- core.preferences: dictionary columns; no implicit business defaults.
create table public.preferences (
  id uuid not null,
  room_id uuid not null,
  user_id uuid not null,
  cuisine_ids uuid[] not null,
  category_ids uuid[] not null,
  temperature text,
  flavor jsonb,
  updated_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint preferences_unique_1 unique nulls not distinct (room_id,user_id),
  constraint preferences_cuisine_ids_shape check (cuisine_ids is null or gm06_private.json_matches(to_jsonb(cuisine_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  constraint preferences_category_ids_shape check (category_ids is null or gm06_private.json_matches(to_jsonb(category_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  constraint preferences_temperature_shape check (temperature is null or gm06_private.json_matches(to_jsonb(temperature),'{"type":"string","enum":["hot","warm","cold","ambient","unknown"]}'::jsonb)),
  constraint preferences_flavor_shape check (flavor is null or gm06_private.json_matches(flavor,'{"type":"object","properties":{"spicy":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"salty":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"sweet":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"sour":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false}},"required":["spicy","salty","sweet","sour"],"additionalProperties":false}'::jsonb)),
  check (isfinite(updated_at)),
  constraint preferences_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (gm06_private.flavor_valid(flavor))
);
comment on table public.preferences is 'core.preferences GM-06.1 / GM-04.2; self only; host cannot read others';
create trigger preferences_version_guard before update on public.preferences for each row execute function gm06_private.version_guard('id');
create index preferences_room_id_idx on public.preferences(room_id);
create index preferences_user_id_idx on public.preferences(user_id);
create index preferences_cuisine_ids_gin on public.preferences using gin(cuisine_ids);
create index preferences_category_ids_gin on public.preferences using gin(category_ids);

-- core.roundDishes: dictionary columns; no implicit business defaults.
create table public.round_dishes (
  id uuid not null,
  room_id uuid not null,
  round bigint not null,
  choice_id uuid not null,
  dish_id uuid not null,
  variant text,
  offering_id uuid not null,
  venue_id uuid not null,
  ordinal bigint not null,
  dataset_version text not null,
  schedule_id uuid not null,
  schedule_version bigint not null,
  effective_profile jsonb,
  price jsonb not null,
  pool_version bigint not null,
  version bigint not null,
  primary key (id),
  constraint round_dishes_unique_1 unique nulls not distinct (room_id,round,choice_id),
  constraint round_dishes_unique_2 unique nulls not distinct (room_id,round,dish_id,variant),
  constraint round_dishes_unique_3 unique nulls not distinct (room_id,round,ordinal),
  constraint round_dishes_round_shape check (round is null or gm06_private.json_matches(to_jsonb(round),'{"type":"integer","minimum":1,"maximum":2}'::jsonb)),
  constraint round_dishes_variant_shape check (variant is null or gm06_private.json_matches(to_jsonb(variant),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint round_dishes_ordinal_shape check (ordinal is null or gm06_private.json_matches(to_jsonb(ordinal),'{"type":"integer","minimum":0,"maximum":7}'::jsonb)),
  constraint round_dishes_dataset_version_shape check (dataset_version is null or gm06_private.json_matches(to_jsonb(dataset_version),'{"type":"string","pattern":"^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$"}'::jsonb)),
  constraint round_dishes_schedule_version_shape check (schedule_version is null or gm06_private.json_matches(to_jsonb(schedule_version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint round_dishes_effective_profile_shape check (effective_profile is null or gm06_private.json_matches(effective_profile,'{"type":"object","properties":{"cuisineIds":{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true},"categoryIds":{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true},"mealSlots":{"type":"array","items":{"type":"string","enum":["breakfast","lunch","dinner","snack"]},"uniqueItems":true},"timeHints":{"type":"array","items":{"type":"string","enum":["late_night"]},"uniqueItems":true},"temperature":{"anyOf":[{"type":"string","enum":["hot","warm","cold","ambient","unknown"]},{"type":"null"}]},"flavor":{"anyOf":[{"type":"object","properties":{"spicy":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"salty":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"sweet":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false},"sour":{"type":"object","properties":{"present":{"type":["boolean","null"]},"intensity":{"type":"string","enum":["none","low","medium","high","unknown"]}},"required":["present","intensity"],"additionalProperties":false}},"required":["spicy","salty","sweet","sour"],"additionalProperties":false},{"type":"null"}]},"origin":{"anyOf":[{"type":"string","enum":["north","central","south","unknown","not_applicable"]},{"type":"null"}]}},"required":[],"additionalProperties":false,"minProperties":1}'::jsonb)),
  constraint round_dishes_price_shape check (price is null or gm06_private.json_matches(price,'{"type":"object","properties":{"priceMin":{"anyOf":[{"type":"number","minimum":0},{"type":"null"}]},"priceMax":{"anyOf":[{"type":"number","minimum":0},{"type":"null"}]},"unit":{"anyOf":[{"type":"string","enum":["portion","item","person","group","kg","menu_item_unspecified"]},{"type":"null"}]},"currency":{"anyOf":[{"type":"string","enum":["VND","USD","THB","KRW","JPY","CNY","EUR","other"]},{"type":"null"}]},"servingSize":{"anyOf":[{"type":"string","minLength":1,"pattern":"\\S"},{"type":"null"}]},"sourceRef":{"anyOf":[{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},{"type":"null"}]}},"required":["priceMin","priceMax","unit","currency","servingSize","sourceRef"],"additionalProperties":false}'::jsonb)),
  constraint round_dishes_pool_version_shape check (pool_version is null or gm06_private.json_matches(to_jsonb(pool_version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint round_dishes_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (gm06_private.flavor_valid(effective_profile->'flavor')),
  check (price->'priceMin'='null'::jsonb or price->'priceMax'='null'::jsonb or (price->>'priceMin')::numeric <= (price->>'priceMax')::numeric),
  check ((price->'priceMin'='null'::jsonb and price->'priceMax'='null'::jsonb) or (price->>'unit' is not null and price->>'currency' is not null and price->>'sourceRef' is not null))
);
comment on table public.round_dishes is 'core.roundDishes GM-06.1 / GM-04.2; member locked pool via snapshot';
create trigger round_dishes_version_guard before update on public.round_dishes for each row execute function gm06_private.version_guard('id');
create index round_dishes_room_id_idx on public.round_dishes(room_id);
create index round_dishes_dish_id_idx on public.round_dishes(dish_id);
create index round_dishes_offering_id_idx on public.round_dishes(offering_id);
create index round_dishes_venue_id_idx on public.round_dishes(venue_id);
create index round_dishes_schedule_id_idx on public.round_dishes(schedule_id);

-- core.submissions: dictionary columns; no implicit business defaults.
create table public.submissions (
  id uuid not null,
  room_id uuid not null,
  member_id uuid not null,
  round bigint not null,
  intent_id uuid not null,
  request_id uuid not null,
  payload_hash text not null,
  pool_version bigint not null,
  accepted_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint submissions_unique_1 unique nulls not distinct (room_id,round,member_id),
  constraint submissions_unique_2 unique nulls not distinct (member_id,intent_id),
  constraint submissions_round_shape check (round is null or gm06_private.json_matches(to_jsonb(round),'{"type":"integer","minimum":1,"maximum":2}'::jsonb)),
  constraint submissions_payload_hash_shape check (payload_hash is null or gm06_private.json_matches(to_jsonb(payload_hash),'{"type":"string","pattern":"^[0-9a-f]{64}$"}'::jsonb)),
  constraint submissions_pool_version_shape check (pool_version is null or gm06_private.json_matches(to_jsonb(pool_version),'{"type":"integer","minimum":1}'::jsonb)),
  check (isfinite(accepted_at)),
  constraint submissions_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb))
);
comment on table public.submissions is 'core.submissions GM-06.1 / GM-04.2; self/trusted finalize only; host no raw ballot';
create trigger submissions_version_guard before update on public.submissions for each row execute function gm06_private.version_guard('id');
create index submissions_room_id_idx on public.submissions(room_id);
create index submissions_member_id_idx on public.submissions(member_id);

-- core.votes: dictionary columns; no implicit business defaults.
create table public.votes (
  id uuid not null,
  submission_id uuid not null,
  round_dish_id uuid not null,
  value text not null,
  version bigint not null,
  primary key (id),
  constraint votes_unique_1 unique nulls not distinct (submission_id,round_dish_id),
  constraint votes_value_shape check (value is null or gm06_private.json_matches(to_jsonb(value),'{"type":"string","enum":["WANT","OK","NO","KEEP","REMOVE"]}'::jsonb)),
  constraint votes_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb))
);
comment on table public.votes is 'core.votes GM-06.1 / GM-04.2; self/trusted finalize only';
create trigger votes_version_guard before update on public.votes for each row execute function gm06_private.version_guard('id');
create index votes_submission_id_idx on public.votes(submission_id);
create index votes_round_dish_id_idx on public.votes(round_dish_id);

-- core.results: dictionary columns; no implicit business defaults.
create table public.results (
  id uuid not null,
  room_id uuid not null,
  winner_round_dish_id uuid,
  reason_code text not null,
  match_tier text not null,
  policy_version text not null,
  tied_choice_ids uuid[] not null,
  finalized_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint results_unique_1 unique nulls not distinct (room_id),
  constraint results_reason_code_shape check (reason_code is null or gm06_private.json_matches(to_jsonb(reason_code),'{"type":"string","enum":["UNANIMOUS_WANT","ACCEPTABLE_FINAL","EMPTY_INTERSECTION","ALL_REMOVED"]}'::jsonb)),
  constraint results_match_tier_shape check (match_tier is null or gm06_private.json_matches(to_jsonb(match_tier),'{"type":"string","enum":["PERFECT","CONSENSUS","COMPROMISE","NO_CONSENSUS"]}'::jsonb)),
  constraint results_policy_version_shape check (policy_version is null or gm06_private.json_matches(to_jsonb(policy_version),'{"type":"string","enum":["decision-v2"]}'::jsonb)),
  constraint results_tied_choice_ids_shape check (tied_choice_ids is null or gm06_private.json_matches(to_jsonb(tied_choice_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  check (isfinite(finalized_at)),
  constraint results_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check ((reason_code='UNANIMOUS_WANT' and match_tier='PERFECT' and winner_round_dish_id is not null) or (reason_code='ACCEPTABLE_FINAL' and match_tier in ('CONSENSUS','COMPROMISE') and winner_round_dish_id is not null) or (reason_code in ('EMPTY_INTERSECTION','ALL_REMOVED') and match_tier='NO_CONSENSUS' and winner_round_dish_id is null and cardinality(tied_choice_ids)=0))
);
comment on table public.results is 'core.results GM-06.1 / GM-04.2; member result via RPC; ties server_only';
create trigger results_version_guard before update on public.results for each row execute function gm06_private.version_guard('id');
create index results_room_id_idx on public.results(room_id);
create index results_winner_round_dish_id_idx on public.results(winner_round_dish_id);
create index results_tied_choice_ids_gin on public.results using gin(tied_choice_ids);
create index results_finalized_at_idx on public.results(finalized_at);

-- core.consents: dictionary columns; no implicit business defaults.
create table public.consents (
  id uuid not null,
  user_id uuid not null,
  room_id uuid,
  scope text not null,
  enabled boolean not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  version bigint not null,
  primary key (id),
  constraint consents_unique_1 unique nulls not distinct (user_id,room_id,scope),
  constraint consents_scope_shape check (scope is null or gm06_private.json_matches(to_jsonb(scope),'{"type":"string","enum":["personal_history","group_history","notifications"]}'::jsonb)),
  check (isfinite(granted_at)),
  check (isfinite(revoked_at)),
  check (isfinite(expires_at)),
  constraint consents_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (not enabled or (granted_at is not null and revoked_at is null)),
  check (revoked_at is null or granted_at is null or revoked_at>=granted_at)
);
comment on table public.consents is 'core.consents GM-06.1 / GM-04.2; self only; group snapshot trusted server';
create trigger consents_version_guard before update on public.consents for each row execute function gm06_private.version_guard('id');
create index consents_user_id_idx on public.consents(user_id);
create index consents_room_id_idx on public.consents(room_id);
create index consents_expires_at_idx on public.consents(expires_at);

-- core.histories: dictionary columns; no implicit business defaults.
create table public.histories (
  id uuid not null,
  scope text not null,
  owner_user_id uuid,
  member_user_ids uuid[] not null,
  group_key text not null,
  result_id uuid not null,
  dish_id uuid not null,
  dish_name text not null,
  meal_slot text not null,
  match_tier text not null,
  finalized_at timestamptz not null,
  expires_at timestamptz not null,
  consent_ids uuid[] not null,
  version bigint not null,
  primary key (id),
  constraint histories_unique_1 unique nulls not distinct (scope,owner_user_id,group_key,result_id),
  constraint histories_scope_shape check (scope is null or gm06_private.json_matches(to_jsonb(scope),'{"type":"string","enum":["personal","group"]}'::jsonb)),
  constraint histories_member_user_ids_shape check (member_user_ids is null or gm06_private.json_matches(to_jsonb(member_user_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  constraint histories_group_key_shape check (group_key is null or gm06_private.json_matches(to_jsonb(group_key),'{"type":"string","pattern":"^[0-9a-f]{64}$"}'::jsonb)),
  constraint histories_dish_name_shape check (dish_name is null or gm06_private.json_matches(to_jsonb(dish_name),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint histories_meal_slot_shape check (meal_slot is null or gm06_private.json_matches(to_jsonb(meal_slot),'{"type":"string","enum":["breakfast","lunch","dinner","snack"]}'::jsonb)),
  constraint histories_match_tier_shape check (match_tier is null or gm06_private.json_matches(to_jsonb(match_tier),'{"type":"string","enum":["PERFECT","CONSENSUS","COMPROMISE"]}'::jsonb)),
  check (isfinite(finalized_at)),
  check (isfinite(expires_at)),
  constraint histories_consent_ids_shape check (consent_ids is null or gm06_private.json_matches(to_jsonb(consent_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  constraint histories_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (expires_at > finalized_at),
  check ((scope='personal' and owner_user_id is not null and member_user_ids=array[owner_user_id]) or (scope='group' and owner_user_id is null and cardinality(member_user_ids) between 2 and 8))
);
comment on table public.histories is 'core.histories GM-06.1 / GM-04.2; personal owner; group exact roster and all opted in';
create trigger histories_version_guard before update on public.histories for each row execute function gm06_private.version_guard('id');
create index histories_owner_user_id_idx on public.histories(owner_user_id);
create index histories_member_user_ids_gin on public.histories using gin(member_user_ids);
create index histories_result_id_idx on public.histories(result_id);
create index histories_dish_id_idx on public.histories(dish_id);
create index histories_consent_ids_gin on public.histories using gin(consent_ids);
create index histories_expires_at_idx on public.histories(expires_at);
create index histories_finalized_at_idx on public.histories(finalized_at);

-- core.friendInvitations: dictionary columns; no implicit business defaults.
create table public.friend_invitations (
  id uuid not null,
  sender_user_id uuid not null,
  recipient_user_id uuid not null,
  state text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  responded_at timestamptz,
  version bigint not null,
  primary key (id),
  constraint friend_invitations_state_shape check (state is null or gm06_private.json_matches(to_jsonb(state),'{"type":"string","enum":["pending","accepted","rejected","cancelled","expired"]}'::jsonb)),
  check (isfinite(created_at)),
  check (isfinite(expires_at)),
  check (isfinite(responded_at)),
  constraint friend_invitations_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (expires_at > created_at),
  check (sender_user_id<>recipient_user_id),
  check (state not in ('accepted','rejected') or responded_at is not null),
  check (responded_at is null or (responded_at>=created_at and responded_at<expires_at))
);
comment on table public.friend_invitations is 'core.friendInvitations GM-06.1 / GM-04.2; sender/recipient only; accept recipient';
create trigger friend_invitations_version_guard before update on public.friend_invitations for each row execute function gm06_private.version_guard('id');
create index friend_invitations_sender_user_id_idx on public.friend_invitations(sender_user_id);
create index friend_invitations_recipient_user_id_idx on public.friend_invitations(recipient_user_id);
create index friend_invitations_expires_at_idx on public.friend_invitations(expires_at);

-- core.friends: dictionary columns; no implicit business defaults.
create table public.friends (
  id uuid not null,
  low_user_id uuid not null,
  high_user_id uuid not null,
  accepted_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint friends_unique_1 unique nulls not distinct (low_user_id,high_user_id),
  check (isfinite(accepted_at)),
  constraint friends_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (low_user_id<high_user_id)
);
comment on table public.friends is 'core.friends GM-06.1 / GM-04.2; two parties only';
create trigger friends_version_guard before update on public.friends for each row execute function gm06_private.version_guard('id');
create index friends_low_user_id_idx on public.friends(low_user_id);
create index friends_high_user_id_idx on public.friends(high_user_id);

-- core.roomInvitations: dictionary columns; no implicit business defaults.
create table public.room_invitations (
  id uuid not null,
  room_id uuid not null,
  friend_id uuid not null,
  sender_user_id uuid not null,
  recipient_user_id uuid not null,
  state text not null,
  event_id uuid not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  responded_at timestamptz,
  version bigint not null,
  primary key (id),
  constraint room_invitations_unique_1 unique nulls not distinct (event_id),
  constraint room_invitations_state_shape check (state is null or gm06_private.json_matches(to_jsonb(state),'{"type":"string","enum":["pending","accepted","rejected","cancelled","expired"]}'::jsonb)),
  check (isfinite(created_at)),
  check (isfinite(expires_at)),
  check (isfinite(responded_at)),
  constraint room_invitations_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (expires_at > created_at),
  check (sender_user_id<>recipient_user_id),
  check (state not in ('accepted','rejected') or responded_at is not null),
  check (responded_at is null or (responded_at>=created_at and responded_at<expires_at))
);
comment on table public.room_invitations is 'core.roomInvitations GM-06.1 / GM-04.2; sender/recipient only; no automatic join/ready';
create trigger room_invitations_version_guard before update on public.room_invitations for each row execute function gm06_private.version_guard('id');
create index room_invitations_room_id_idx on public.room_invitations(room_id);
create index room_invitations_friend_id_idx on public.room_invitations(friend_id);
create index room_invitations_sender_user_id_idx on public.room_invitations(sender_user_id);
create index room_invitations_recipient_user_id_idx on public.room_invitations(recipient_user_id);
create index room_invitations_event_id_idx on public.room_invitations(event_id);
create index room_invitations_expires_at_idx on public.room_invitations(expires_at);

-- core.inbox: dictionary columns; no implicit business defaults.
create table public.inbox (
  id uuid not null,
  owner_user_id uuid not null,
  event_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint inbox_unique_1 unique nulls not distinct (owner_user_id,event_id),
  check (isfinite(read_at)),
  check (isfinite(created_at)),
  check (isfinite(expires_at)),
  constraint inbox_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (expires_at > created_at)
);
comment on table public.inbox is 'core.inbox GM-06.1 / GM-04.2; owner only';
create trigger inbox_version_guard before update on public.inbox for each row execute function gm06_private.version_guard('id');
create index inbox_owner_user_id_idx on public.inbox(owner_user_id);
create index inbox_event_id_idx on public.inbox(event_id);
create index inbox_expires_at_idx on public.inbox(expires_at);

-- core.devices: dictionary columns; no implicit business defaults.
create table public.devices (
  id uuid not null,
  user_id uuid not null,
  device_key text not null,
  platform text not null,
  push_token text,
  permission text not null,
  active boolean not null,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint devices_unique_1 unique nulls not distinct (user_id,device_key),
  constraint devices_device_key_shape check (device_key is null or gm06_private.json_matches(to_jsonb(device_key),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint devices_platform_shape check (platform is null or gm06_private.json_matches(to_jsonb(platform),'{"type":"string","enum":["android"]}'::jsonb)),
  constraint devices_push_token_shape check (push_token is null or gm06_private.json_matches(to_jsonb(push_token),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint devices_permission_shape check (permission is null or gm06_private.json_matches(to_jsonb(permission),'{"type":"string","enum":["granted","denied","unknown"]}'::jsonb)),
  check (isfinite(created_at)),
  check (isfinite(last_seen_at)),
  constraint devices_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (last_seen_at >= created_at),
  check (not active or (permission='granted' and push_token is not null))
);
comment on table public.devices is 'core.devices GM-06.1 / GM-04.2; owner/trusted sender only';
create trigger devices_version_guard before update on public.devices for each row execute function gm06_private.version_guard('id');
create index devices_user_id_idx on public.devices(user_id);

-- core.events: dictionary columns; no implicit business defaults.
create table public.events (
  id uuid not null,
  kind text not null,
  room_id uuid not null,
  invitation_id uuid,
  result_id uuid,
  recipient_user_ids uuid[] not null,
  dedupe_key text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint events_unique_1 unique nulls not distinct (dedupe_key),
  constraint events_kind_shape check (kind is null or gm06_private.json_matches(to_jsonb(kind),'{"type":"string","enum":["ROOM_INVITED","ROOM_RESULT_READY"]}'::jsonb)),
  constraint events_recipient_user_ids_shape check (recipient_user_ids is null or gm06_private.json_matches(to_jsonb(recipient_user_ids),'{"type":"array","items":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},"uniqueItems":true}'::jsonb)),
  constraint events_dedupe_key_shape check (dedupe_key is null or gm06_private.json_matches(to_jsonb(dedupe_key),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (isfinite(created_at)),
  check (isfinite(expires_at)),
  constraint events_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (expires_at > created_at),
  check ((kind='ROOM_INVITED' and invitation_id is not null and result_id is null) or (kind='ROOM_RESULT_READY' and invitation_id is null and result_id is not null)),
  check (cardinality(recipient_user_ids)>0)
);
comment on table public.events is 'core.events GM-06.1 / GM-04.2; trusted sender only; minimal ref payload';
create trigger events_version_guard before update on public.events for each row execute function gm06_private.version_guard('id');
create index events_room_id_idx on public.events(room_id);
create index events_invitation_id_idx on public.events(invitation_id);
create index events_result_id_idx on public.events(result_id);
create index events_recipient_user_ids_gin on public.events using gin(recipient_user_ids);
create index events_expires_at_idx on public.events(expires_at);

-- core.deliveries: dictionary columns; no implicit business defaults.
create table public.deliveries (
  id uuid not null,
  event_id uuid not null,
  recipient_user_id uuid not null,
  device_id uuid,
  state text not null,
  attempts bigint not null,
  ticket_id text,
  receipt_id text,
  last_attempt_at timestamptz,
  expires_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint deliveries_unique_1 unique nulls not distinct (event_id,recipient_user_id,device_id),
  constraint deliveries_state_shape check (state is null or gm06_private.json_matches(to_jsonb(state),'{"type":"string","enum":["pending","sent","failed","expired"]}'::jsonb)),
  constraint deliveries_attempts_shape check (attempts is null or gm06_private.json_matches(to_jsonb(attempts),'{"type":"integer","minimum":0}'::jsonb)),
  constraint deliveries_ticket_id_shape check (ticket_id is null or gm06_private.json_matches(to_jsonb(ticket_id),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  constraint deliveries_receipt_id_shape check (receipt_id is null or gm06_private.json_matches(to_jsonb(receipt_id),'{"type":"string","minLength":1,"pattern":"\\S"}'::jsonb)),
  check (isfinite(last_attempt_at)),
  check (isfinite(expires_at)),
  constraint deliveries_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (attempts>0 or (ticket_id is null and receipt_id is null and last_attempt_at is null))
);
comment on table public.deliveries is 'core.deliveries GM-06.1 / GM-04.2; trusted sender only';
create trigger deliveries_version_guard before update on public.deliveries for each row execute function gm06_private.version_guard('id');
create index deliveries_event_id_idx on public.deliveries(event_id);
create index deliveries_recipient_user_id_idx on public.deliveries(recipient_user_id);
create index deliveries_device_id_idx on public.deliveries(device_id);
create index deliveries_expires_at_idx on public.deliveries(expires_at);

-- core.idempotency: dictionary columns; no implicit business defaults.
create table public.idempotency (
  id uuid not null,
  user_id uuid not null,
  operation text not null,
  request_id uuid not null,
  payload_hash text not null,
  expected_version bigint,
  response jsonb not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  version bigint not null,
  primary key (id),
  constraint idempotency_unique_1 unique nulls not distinct (user_id,operation,request_id),
  constraint idempotency_operation_shape check (operation is null or gm06_private.json_matches(to_jsonb(operation),'{"type":"string","enum":["create_room","join_room","update_preferences","update_context","set_ready","start_room","submit_ballot","cancel_room","leave_room","create_friend_invite","accept_friend_invite","reject_friend_invite","unfriend","create_room_invite","accept_room_invite","reject_room_invite","register_push_device","unregister_push_device","delete_history","update_history_consent"]}'::jsonb)),
  constraint idempotency_payload_hash_shape check (payload_hash is null or gm06_private.json_matches(to_jsonb(payload_hash),'{"type":"string","pattern":"^[0-9a-f]{64}$"}'::jsonb)),
  constraint idempotency_expected_version_shape check (expected_version is null or gm06_private.json_matches(to_jsonb(expected_version),'{"type":"integer","minimum":1}'::jsonb)),
  constraint idempotency_response_shape check (response is null or gm06_private.json_matches(response,'{"type":"object","properties":{"roomId":{"anyOf":[{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},{"type":"null"}]},"resultId":{"anyOf":[{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},{"type":"null"}]},"serverVersion":{"type":"integer","minimum":1}},"required":["roomId","resultId","serverVersion"],"additionalProperties":false}'::jsonb)),
  check (isfinite(created_at)),
  check (isfinite(expires_at)),
  constraint idempotency_version_shape check (version is null or gm06_private.json_matches(to_jsonb(version),'{"type":"integer","minimum":1}'::jsonb)),
  check (expires_at > created_at),
  check (operation not in ('update_preferences','update_context','set_ready','start_room','submit_ballot','cancel_room','leave_room','create_room_invite') or expected_version is not null)
);
comment on table public.idempotency is 'core.idempotency GM-06.1 / GM-04.2; trusted RPC only; caller receives own ACK';
create trigger idempotency_version_guard before update on public.idempotency for each row execute function gm06_private.version_guard('id');
create index idempotency_user_id_idx on public.idempotency(user_id);
create index idempotency_expires_at_idx on public.idempotency(expires_at);
alter table public.taxonomy add constraint taxonomy_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.dishes add constraint dishes_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.venues add constraint venues_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.venues add constraint venues_schedule_id_fk foreign key (schedule_id) references public.schedule_groups(schedule_id) deferrable initially deferred;
alter table public.venue_dishes add constraint venue_dishes_venue_id_fk foreign key (venue_id) references public.venues(id) deferrable initially deferred;
alter table public.venue_dishes add constraint venue_dishes_dish_id_fk foreign key (dish_id) references public.dishes(id) deferrable initially deferred;
alter table public.venue_dishes add constraint venue_dishes_menu_source_fk foreign key (menu_source) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.venue_dishes add constraint venue_dishes_schedule_id_fk foreign key (schedule_id) references public.schedule_groups(schedule_id) deferrable initially deferred;
alter table public.venue_dishes add constraint venue_dishes_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.weekly_schedules add constraint weekly_schedules_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.date_exceptions add constraint date_exceptions_schedule_id_fk foreign key (schedule_id) references public.schedule_groups(schedule_id) deferrable initially deferred;
alter table public.date_exceptions add constraint date_exceptions_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.availability_overrides add constraint availability_overrides_offering_id_fk foreign key (offering_id) references public.venue_dishes(offering_id) deferrable initially deferred;
alter table public.availability_overrides add constraint availability_overrides_source_fk foreign key (source) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.availability_overrides add constraint availability_overrides_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.coverage_areas add constraint coverage_areas_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.public_anchors add constraint public_anchors_coverage_id_fk foreign key (coverage_id) references public.coverage_areas(area_id) deferrable initially deferred;
alter table public.public_anchors add constraint public_anchors_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.dataset_versions add constraint dataset_versions_previous_version_id_fk foreign key (previous_version_id) references public.dataset_versions(id) deferrable initially deferred;
alter table public.dataset_versions add constraint dataset_versions_source_ref_fk foreign key (source_ref) references public.data_sources(source_ref) deferrable initially deferred;
alter table public.profiles add constraint profiles_user_id_fk foreign key (user_id) references auth.users(id) deferrable initially deferred;
alter table public.rooms add constraint rooms_host_user_id_fk foreign key (host_user_id) references auth.users(id) deferrable initially deferred;
alter table public.rooms add constraint rooms_anchor_id_fk foreign key (anchor_id) references public.public_anchors(anchor_id) deferrable initially deferred;
alter table public.rooms add constraint rooms_coverage_id_fk foreign key (coverage_id) references public.coverage_areas(area_id) deferrable initially deferred;
alter table public.members add constraint members_room_id_fk foreign key (room_id) references public.rooms(id) deferrable initially deferred;
alter table public.members add constraint members_user_id_fk foreign key (user_id) references auth.users(id) deferrable initially deferred;
alter table public.preferences add constraint preferences_room_id_fk foreign key (room_id) references public.rooms(id) deferrable initially deferred;
alter table public.preferences add constraint preferences_user_id_fk foreign key (user_id) references auth.users(id) deferrable initially deferred;
alter table public.round_dishes add constraint round_dishes_room_id_fk foreign key (room_id) references public.rooms(id) deferrable initially deferred;
alter table public.round_dishes add constraint round_dishes_dish_id_fk foreign key (dish_id) references public.dishes(id) deferrable initially deferred;
alter table public.round_dishes add constraint round_dishes_offering_id_fk foreign key (offering_id) references public.venue_dishes(offering_id) deferrable initially deferred;
alter table public.round_dishes add constraint round_dishes_venue_id_fk foreign key (venue_id) references public.venues(id) deferrable initially deferred;
alter table public.round_dishes add constraint round_dishes_schedule_id_fk foreign key (schedule_id) references public.schedule_groups(schedule_id) deferrable initially deferred;
alter table public.submissions add constraint submissions_room_id_fk foreign key (room_id) references public.rooms(id) deferrable initially deferred;
alter table public.submissions add constraint submissions_member_id_fk foreign key (member_id) references public.members(id) deferrable initially deferred;
alter table public.votes add constraint votes_submission_id_fk foreign key (submission_id) references public.submissions(id) deferrable initially deferred;
alter table public.votes add constraint votes_round_dish_id_fk foreign key (round_dish_id) references public.round_dishes(id) deferrable initially deferred;
alter table public.results add constraint results_room_id_fk foreign key (room_id) references public.rooms(id) deferrable initially deferred;
alter table public.results add constraint results_winner_round_dish_id_fk foreign key (winner_round_dish_id) references public.round_dishes(id) deferrable initially deferred;
alter table public.consents add constraint consents_user_id_fk foreign key (user_id) references auth.users(id) deferrable initially deferred;
alter table public.consents add constraint consents_room_id_fk foreign key (room_id) references public.rooms(id) deferrable initially deferred;
alter table public.histories add constraint histories_owner_user_id_fk foreign key (owner_user_id) references auth.users(id) deferrable initially deferred;
alter table public.histories add constraint histories_result_id_fk foreign key (result_id) references public.results(id) deferrable initially deferred;
alter table public.histories add constraint histories_dish_id_fk foreign key (dish_id) references public.dishes(id) deferrable initially deferred;
alter table public.friend_invitations add constraint friend_invitations_sender_user_id_fk foreign key (sender_user_id) references auth.users(id) deferrable initially deferred;
alter table public.friend_invitations add constraint friend_invitations_recipient_user_id_fk foreign key (recipient_user_id) references auth.users(id) deferrable initially deferred;
alter table public.friends add constraint friends_low_user_id_fk foreign key (low_user_id) references auth.users(id) deferrable initially deferred;
alter table public.friends add constraint friends_high_user_id_fk foreign key (high_user_id) references auth.users(id) deferrable initially deferred;
alter table public.room_invitations add constraint room_invitations_room_id_fk foreign key (room_id) references public.rooms(id) deferrable initially deferred;
alter table public.room_invitations add constraint room_invitations_friend_id_fk foreign key (friend_id) references public.friends(id) deferrable initially deferred;
alter table public.room_invitations add constraint room_invitations_sender_user_id_fk foreign key (sender_user_id) references auth.users(id) deferrable initially deferred;
alter table public.room_invitations add constraint room_invitations_recipient_user_id_fk foreign key (recipient_user_id) references auth.users(id) deferrable initially deferred;
alter table public.room_invitations add constraint room_invitations_event_id_fk foreign key (event_id) references public.events(id) deferrable initially deferred;
alter table public.inbox add constraint inbox_owner_user_id_fk foreign key (owner_user_id) references auth.users(id) deferrable initially deferred;
alter table public.inbox add constraint inbox_event_id_fk foreign key (event_id) references public.events(id) deferrable initially deferred;
alter table public.devices add constraint devices_user_id_fk foreign key (user_id) references auth.users(id) deferrable initially deferred;
alter table public.events add constraint events_room_id_fk foreign key (room_id) references public.rooms(id) deferrable initially deferred;
alter table public.events add constraint events_invitation_id_fk foreign key (invitation_id) references public.room_invitations(id) deferrable initially deferred;
alter table public.events add constraint events_result_id_fk foreign key (result_id) references public.results(id) deferrable initially deferred;
alter table public.deliveries add constraint deliveries_event_id_fk foreign key (event_id) references public.events(id) deferrable initially deferred;
alter table public.deliveries add constraint deliveries_recipient_user_id_fk foreign key (recipient_user_id) references auth.users(id) deferrable initially deferred;
alter table public.deliveries add constraint deliveries_device_id_fk foreign key (device_id) references public.devices(id) deferrable initially deferred;
alter table public.idempotency add constraint idempotency_user_id_fk foreign key (user_id) references auth.users(id) deferrable initially deferred;
alter table public.schedule_groups add foreign key(venue_id) references public.venues(id) deferrable initially deferred;
alter table public.schedule_groups add foreign key(offering_id) references public.venue_dishes(offering_id) deferrable initially deferred;
alter table public.weekly_schedules add foreign key(schedule_id,owner_type,owner_id,timezone,review_status) references public.schedule_groups(schedule_id,owner_type,owner_id,timezone,review_status) deferrable initially deferred;
alter table public.venues add foreign key(schedule_id,_schedule_owner_type,id,timezone) references public.schedule_groups(schedule_id,owner_type,owner_id,timezone) deferrable initially deferred;
alter table public.venue_dishes add foreign key(schedule_id,_schedule_owner_type,offering_id) references public.schedule_groups(schedule_id,owner_type,owner_id) deferrable initially deferred;
alter table public.coverage_areas add foreign key(dataset_version) references public.dataset_versions(dataset_version) deferrable initially deferred;
alter table public.rooms add foreign key(dataset_version) references public.dataset_versions(dataset_version) deferrable initially deferred;
create trigger schedule_groups_version_guard before update on public.schedule_groups for each row execute function gm06_private.version_guard('schedule_id');
create constraint trigger gm06_taxonomy_nested_fk after insert or update or delete on public.taxonomy deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"taxonomy","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"dishes","path":["cuisine_ids","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"dishes","path":["category_ids","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"venue_dishes","path":["profile_overrides","cuisineIds","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"venue_dishes","path":["profile_overrides","categoryIds","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"preferences","path":["cuisine_ids","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"preferences","path":["category_ids","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"round_dishes","path":["effective_profile","cuisineIds","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"round_dishes","path":["effective_profile","categoryIds","[]"],"target_schema":"public","target":"taxonomy","key":"id"}]');
create constraint trigger gm06_dishes_nested_fk after insert or update or delete on public.dishes deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"dishes","path":["cuisine_ids","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"dishes","path":["category_ids","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"dishes","path":["artwork","sourceRef"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"dishes","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_venues_nested_fk after insert or update or delete on public.venues deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"venues","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_venue_dishes_nested_fk after insert or update or delete on public.venue_dishes deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"venue_dishes","path":["profile_overrides","cuisineIds","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"venue_dishes","path":["profile_overrides","categoryIds","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"venue_dishes","path":["artwork","sourceRef"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"venue_dishes","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_weekly_schedules_nested_fk after insert or update or delete on public.weekly_schedules deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"weekly_schedules","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_date_exceptions_nested_fk after insert or update or delete on public.date_exceptions deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"date_exceptions","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_availability_overrides_nested_fk after insert or update or delete on public.availability_overrides deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"availability_overrides","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_coverage_areas_nested_fk after insert or update or delete on public.coverage_areas deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"coverage_areas","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_public_anchors_nested_fk after insert or update or delete on public.public_anchors deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"public_anchors","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_data_sources_nested_fk after insert or update or delete on public.data_sources deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"taxonomy","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"dishes","path":["artwork","sourceRef"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"dishes","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"venues","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"venue_dishes","path":["artwork","sourceRef"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"venue_dishes","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"weekly_schedules","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"date_exceptions","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"availability_overrides","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"coverage_areas","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"public_anchors","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"data_sources","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"dataset_versions","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"},{"table":"round_dishes","path":["price","sourceRef"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_dataset_versions_nested_fk after insert or update or delete on public.dataset_versions deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"dataset_versions","path":["field_sources","*"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_rooms_nested_fk after insert or update or delete on public.rooms deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"rooms","path":["roster_user_ids","[]"],"target_schema":"auth","target":"users","key":"id"},{"table":"rooms","path":["consent_snapshot","[]","userId"],"target_schema":"auth","target":"users","key":"id"},{"table":"idempotency","path":["response","roomId"],"target_schema":"public","target":"rooms","key":"id"}]');
create constraint trigger gm06_preferences_nested_fk after insert or update or delete on public.preferences deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"preferences","path":["cuisine_ids","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"preferences","path":["category_ids","[]"],"target_schema":"public","target":"taxonomy","key":"id"}]');
create constraint trigger gm06_round_dishes_nested_fk after insert or update or delete on public.round_dishes deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"round_dishes","path":["effective_profile","cuisineIds","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"round_dishes","path":["effective_profile","categoryIds","[]"],"target_schema":"public","target":"taxonomy","key":"id"},{"table":"round_dishes","path":["price","sourceRef"],"target_schema":"public","target":"data_sources","key":"source_ref"}]');
create constraint trigger gm06_results_nested_fk after insert or update or delete on public.results deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"idempotency","path":["response","resultId"],"target_schema":"public","target":"results","key":"id"}]');
create constraint trigger gm06_consents_nested_fk after insert or update or delete on public.consents deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"histories","path":["consent_ids","[]"],"target_schema":"public","target":"consents","key":"id"}]');
create constraint trigger gm06_histories_nested_fk after insert or update or delete on public.histories deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"histories","path":["member_user_ids","[]"],"target_schema":"auth","target":"users","key":"id"},{"table":"histories","path":["consent_ids","[]"],"target_schema":"public","target":"consents","key":"id"}]');
create constraint trigger gm06_events_nested_fk after insert or update or delete on public.events deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"events","path":["recipient_user_ids","[]"],"target_schema":"auth","target":"users","key":"id"}]');
create constraint trigger gm06_idempotency_nested_fk after insert or update or delete on public.idempotency deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"idempotency","path":["response","roomId"],"target_schema":"public","target":"rooms","key":"id"},{"table":"idempotency","path":["response","resultId"],"target_schema":"public","target":"results","key":"id"}]');
create constraint trigger gm06_users_nested_fk after insert or update or delete on auth.users deferrable initially deferred for each row execute function gm06_private.reference_guard('[{"table":"rooms","path":["roster_user_ids","[]"],"target_schema":"auth","target":"users","key":"id"},{"table":"rooms","path":["consent_snapshot","[]","userId"],"target_schema":"auth","target":"users","key":"id"},{"table":"histories","path":["member_user_ids","[]"],"target_schema":"auth","target":"users","key":"id"},{"table":"events","path":["recipient_user_ids","[]"],"target_schema":"auth","target":"users","key":"id"}]');
-- Install the same serialization boundary on both sides of every nested FK.
-- Derive this from the already-installed guards so no source/parent can be omitted.
do $$ declare r record; begin
  for r in select distinct tgrelid::regclass as tbl from pg_trigger
    where tgfoid='gm06_private.reference_guard()'::regprocedure loop
    execute format('create trigger gm06_reference_lock before insert or update or delete on %s for each statement execute function gm06_private.lock_references()',r.tbl);
  end loop;
end $$;
-- SQL integrity only. Selection, membership permission, publish pipeline, consent
-- withdrawal/cleanup and transaction state transitions belong to later API tasks.
alter table public.members add unique(id,room_id);
alter table public.submissions add foreign key(member_id,room_id)
  references public.members(id,room_id) deferrable initially deferred;
alter table public.public_anchors add unique(anchor_id,coverage_id);
alter table public.rooms add foreign key(anchor_id,coverage_id)
  references public.public_anchors(anchor_id,coverage_id) deferrable initially deferred;

-- Weekly ranges can wrap Sunday -> Monday. Pairwise overlap check locks their
-- group row before examining committed intervals, including the cyclic boundary.
-- The lock is acquired before row insertion/update to serialize competing writers.
create function gm06_private.lock_schedule_group() returns trigger
language plpgsql security definer set search_path = pg_catalog as $$
declare group_id uuid;
begin
  -- A real tuple update also rejects write skew under REPEATABLE READ (40001);
  -- a lock alone would leave the second writer's old snapshot unchanged.
  for group_id in select schedule_id from public.schedule_groups
      where schedule_id in (new.schedule_id,old.schedule_id) order by schedule_id loop
    update public.schedule_groups set version=version+1 where schedule_id=group_id;
  end loop;
  if TG_OP='DELETE' then return old; else return new; end if;
end $$;
create trigger weekly_schedules_group_lock before insert or update or delete on public.weekly_schedules
  for each row execute function gm06_private.lock_schedule_group();

create function gm06_private.relation_guard() returns trigger
language plpgsql security definer set search_path = pg_catalog, gm06_private as $$
begin
  if exists(select 1 from public.venue_dishes o join public.venues v on v.id=o.venue_id
    join public.schedule_groups g on g.schedule_id=o.schedule_id
    where g.timezone<>v.timezone or (o.service_mode is not null and not o.service_mode=any(v.service_modes))) then
    raise exception using errcode='23514',message='GM06_OFFERING_CONTEXT';
  end if;
  if exists(select 1 from public.weekly_schedules a join public.weekly_schedules b
       on a.schedule_id=b.schedule_id and a.id<b.id
       cross join (values(-10080),(0),(10080)) w(shift)
       where a.status='open' and b.status='open' and
       greatest((a.day_of_week-1)*1440+gm06_private.minute_of_day(a.start_time),
         (b.day_of_week-1)*1440+gm06_private.minute_of_day(b.start_time)+w.shift) <
       least((a.day_of_week-1+a.end_day_offset)*1440+gm06_private.minute_of_day(a.end_time),
         (b.day_of_week-1+b.end_day_offset)*1440+gm06_private.minute_of_day(b.end_time)+w.shift)) then
    raise exception using errcode='23514',message='GM06_SCHEDULE_OVERLAP';
  end if;
  if exists(select 1 from public.votes v join public.submissions s on s.id=v.submission_id
    join public.round_dishes p on p.id=v.round_dish_id where
    s.room_id<>p.room_id or s.round<>p.round or
    (s.round=1 and v.value not in ('WANT','OK','NO')) or
    (s.round=2 and v.value not in ('KEEP','REMOVE'))) then
    raise exception using errcode='23514',message='GM06_VOTE_ROOM_ROUND';
  end if;
  if exists(select 1 from public.results r join public.round_dishes p on p.id=r.winner_round_dish_id
    where r.room_id<>p.room_id or not p.choice_id=any(r.tied_choice_ids) or
    (r.reason_code='UNANIMOUS_WANT' and p.round<>1) or
    (r.reason_code='ACCEPTABLE_FINAL' and p.round<>2)) then
    raise exception using errcode='23514',message='GM06_RESULT_REFERENCE';
  end if;
  -- Wrong taxonomy type is invalid even when the UUID exists.
  if exists(select 1 from public.dishes d cross join lateral unnest(d.cuisine_ids) x(id)
       join public.taxonomy t on t.id=x.id where t.type<>'cuisine') or
     exists(select 1 from public.dishes d cross join lateral unnest(d.category_ids) x(id)
       join public.taxonomy t on t.id=x.id where t.type<>'category') or
     exists(select 1 from public.preferences d cross join lateral unnest(d.cuisine_ids) x(id)
       join public.taxonomy t on t.id=x.id where t.type<>'cuisine') or
     exists(select 1 from public.preferences d cross join lateral unnest(d.category_ids) x(id)
       join public.taxonomy t on t.id=x.id where t.type<>'category') then
    raise exception using errcode='23514',message='GM06_TAXONOMY_TYPE';
  end if;
  if exists(select 1 from public.schedule_groups g where not exists(
       select 1 from public.weekly_schedules w where w.schedule_id=g.schedule_id)) then
    raise exception using errcode='23514',message='GM06_EMPTY_SCHEDULE_GROUP';
  end if;
  if exists(select 1 from (
       select profile_overrides profile from public.venue_dishes
       union all select effective_profile from public.round_dishes) d
       cross join lateral jsonb_array_elements_text(d.profile->'cuisineIds') x(id)
       join public.taxonomy t on t.id=x.id::uuid where t.type<>'cuisine') or
     exists(select 1 from (
       select profile_overrides profile from public.venue_dishes
       union all select effective_profile from public.round_dishes) d
       cross join lateral jsonb_array_elements_text(d.profile->'categoryIds') x(id)
       join public.taxonomy t on t.id=x.id::uuid where t.type<>'category') then
    raise exception using errcode='23514',message='GM06_PROFILE_TAXONOMY_TYPE';
  end if;
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['venues','venue_dishes','schedule_groups','weekly_schedules',
    'votes','submissions','round_dishes','results','taxonomy','dishes','preferences'] loop
    execute format('create constraint trigger %I after insert or update or delete on public.%I deferrable initially deferred for each row execute function gm06_private.relation_guard()', t||'_relation_guard',t);
  end loop;
end $$;

alter table public.taxonomy enable row level security;
alter table public.taxonomy force row level security;
revoke all on public.taxonomy from public, anon, authenticated;
grant select,insert,update,delete on public.taxonomy to gm06_publisher;
create policy taxonomy_internal_publisher on public.taxonomy to gm06_publisher using(true) with check(true);
alter table public.dishes enable row level security;
alter table public.dishes force row level security;
revoke all on public.dishes from public, anon, authenticated;
grant select,insert,update,delete on public.dishes to gm06_publisher;
create policy dishes_internal_publisher on public.dishes to gm06_publisher using(true) with check(true);
alter table public.venues enable row level security;
alter table public.venues force row level security;
revoke all on public.venues from public, anon, authenticated;
grant select,insert,update,delete on public.venues to gm06_publisher;
create policy venues_internal_publisher on public.venues to gm06_publisher using(true) with check(true);
alter table public.venue_dishes enable row level security;
alter table public.venue_dishes force row level security;
revoke all on public.venue_dishes from public, anon, authenticated;
grant select,insert,update,delete on public.venue_dishes to gm06_publisher;
create policy venue_dishes_internal_publisher on public.venue_dishes to gm06_publisher using(true) with check(true);
alter table public.weekly_schedules enable row level security;
alter table public.weekly_schedules force row level security;
revoke all on public.weekly_schedules from public, anon, authenticated;
grant select,insert,update,delete on public.weekly_schedules to gm06_publisher;
create policy weekly_schedules_internal_publisher on public.weekly_schedules to gm06_publisher using(true) with check(true);
alter table public.date_exceptions enable row level security;
alter table public.date_exceptions force row level security;
revoke all on public.date_exceptions from public, anon, authenticated;
grant select,insert,update,delete on public.date_exceptions to gm06_publisher;
create policy date_exceptions_internal_publisher on public.date_exceptions to gm06_publisher using(true) with check(true);
alter table public.availability_overrides enable row level security;
alter table public.availability_overrides force row level security;
revoke all on public.availability_overrides from public, anon, authenticated;
grant select,insert,update,delete on public.availability_overrides to gm06_publisher;
create policy availability_overrides_internal_publisher on public.availability_overrides to gm06_publisher using(true) with check(true);
alter table public.coverage_areas enable row level security;
alter table public.coverage_areas force row level security;
revoke all on public.coverage_areas from public, anon, authenticated;
grant select,insert,update,delete on public.coverage_areas to gm06_publisher;
create policy coverage_areas_internal_publisher on public.coverage_areas to gm06_publisher using(true) with check(true);
alter table public.public_anchors enable row level security;
alter table public.public_anchors force row level security;
revoke all on public.public_anchors from public, anon, authenticated;
grant select,insert,update,delete on public.public_anchors to gm06_publisher;
create policy public_anchors_internal_publisher on public.public_anchors to gm06_publisher using(true) with check(true);
alter table public.data_sources enable row level security;
alter table public.data_sources force row level security;
revoke all on public.data_sources from public, anon, authenticated;
grant select,insert,update,delete on public.data_sources to gm06_publisher;
create policy data_sources_internal_publisher on public.data_sources to gm06_publisher using(true) with check(true);
alter table public.dataset_versions enable row level security;
alter table public.dataset_versions force row level security;
revoke all on public.dataset_versions from public, anon, authenticated;
grant select,insert,update,delete on public.dataset_versions to gm06_publisher;
create policy dataset_versions_internal_publisher on public.dataset_versions to gm06_publisher using(true) with check(true);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on public.profiles from public, anon, authenticated;
alter table public.rooms enable row level security;
alter table public.rooms force row level security;
revoke all on public.rooms from public, anon, authenticated;
alter table public.members enable row level security;
alter table public.members force row level security;
revoke all on public.members from public, anon, authenticated;
alter table public.preferences enable row level security;
alter table public.preferences force row level security;
revoke all on public.preferences from public, anon, authenticated;
alter table public.round_dishes enable row level security;
alter table public.round_dishes force row level security;
revoke all on public.round_dishes from public, anon, authenticated;
alter table public.submissions enable row level security;
alter table public.submissions force row level security;
revoke all on public.submissions from public, anon, authenticated;
alter table public.votes enable row level security;
alter table public.votes force row level security;
revoke all on public.votes from public, anon, authenticated;
alter table public.results enable row level security;
alter table public.results force row level security;
revoke all on public.results from public, anon, authenticated;
alter table public.consents enable row level security;
alter table public.consents force row level security;
revoke all on public.consents from public, anon, authenticated;
alter table public.histories enable row level security;
alter table public.histories force row level security;
revoke all on public.histories from public, anon, authenticated;
alter table public.friend_invitations enable row level security;
alter table public.friend_invitations force row level security;
revoke all on public.friend_invitations from public, anon, authenticated;
alter table public.friends enable row level security;
alter table public.friends force row level security;
revoke all on public.friends from public, anon, authenticated;
alter table public.room_invitations enable row level security;
alter table public.room_invitations force row level security;
revoke all on public.room_invitations from public, anon, authenticated;
alter table public.inbox enable row level security;
alter table public.inbox force row level security;
revoke all on public.inbox from public, anon, authenticated;
alter table public.devices enable row level security;
alter table public.devices force row level security;
revoke all on public.devices from public, anon, authenticated;
alter table public.events enable row level security;
alter table public.events force row level security;
revoke all on public.events from public, anon, authenticated;
alter table public.deliveries enable row level security;
alter table public.deliveries force row level security;
revoke all on public.deliveries from public, anon, authenticated;
alter table public.idempotency enable row level security;
alter table public.idempotency force row level security;
revoke all on public.idempotency from public, anon, authenticated;
alter table public.schedule_groups enable row level security;
alter table public.schedule_groups force row level security;
revoke all on public.schedule_groups from public, anon, authenticated;
grant select,insert,update,delete on public.schedule_groups to gm06_publisher;
create policy schedule_groups_internal_publisher on public.schedule_groups to gm06_publisher using(true) with check(true);
alter table public.schema_versions enable row level security;
alter table public.schema_versions force row level security;
revoke all on public.schema_versions from public, anon, authenticated;
grant usage on schema public,gm06_private to gm06_publisher;
revoke execute on all functions in schema gm06_private from public,anon,authenticated;
grant execute on all functions in schema gm06_private to gm06_publisher;
commit;
