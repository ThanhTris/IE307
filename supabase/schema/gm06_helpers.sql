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
