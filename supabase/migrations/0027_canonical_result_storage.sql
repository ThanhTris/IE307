-- GM06.2 storage producer only. Does not enable/change v2/v3/v4 routing or writers.
begin;
create schema gm06_canonical;
revoke all on schema gm06_canonical from public,anon,authenticated,service_role,gm06_publisher;
alter default privileges in schema gm06_canonical revoke all on tables from public,anon,authenticated,service_role,gm06_publisher;
alter default privileges in schema gm06_canonical revoke execute on functions from public,anon,authenticated,service_role,gm06_publisher;

create function gm06_canonical.unique_uuids(ids uuid[]) returns boolean
language sql immutable set search_path=pg_catalog as $$
 select ids is not null and array_position(ids,null) is null
 and cardinality(ids)=(select count(distinct x) from unnest(ids) x)
$$;
create function gm06_canonical.valid_price(p jsonb) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
begin
 if p='null'::jsonb then return true; end if;
 if jsonb_typeof(p) is distinct from 'object' or
 (select array_agg(k order by k) from jsonb_object_keys(p) k) <>
 array['amount','currency','observedAt','servingSize','sourceRef','unit'] then return false; end if;
 if p->'amount'<>'null'::jsonb and (jsonb_typeof(p->'amount')<>'number' or (p->>'amount')::numeric<0) then return false; end if;
 if p->'currency'<>'null'::jsonb and (jsonb_typeof(p->'currency')<>'string' or p->>'currency'!~'^[A-Z]{3}$') then return false; end if;
 if p->'unit'<>'null'::jsonb and (jsonb_typeof(p->'unit')<>'string' or p->>'unit' not in('portion','item','person','group','kg','menu_item_unspecified')) then return false; end if;
 if p->'sourceRef'<>'null'::jsonb and (jsonb_typeof(p->'sourceRef')<>'string' or length(btrim(p->>'sourceRef')) not between 1 and 500) then return false; end if;
 if p->'servingSize'<>'null'::jsonb and (jsonb_typeof(p->'servingSize')<>'string' or length(p->>'servingSize')>160) then return false; end if;
 return jsonb_typeof(p->'observedAt')='string' and p->>'observedAt'~'^\d{4}-\d\d-\d\dT.*(Z|[+-]\d\d:\d\d)$'
 and isfinite((p->>'observedAt')::timestamptz);
exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then return false;
end $$;
create function gm06_canonical.valid_card(c jsonb) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare k text; a jsonb; v jsonb;
begin
 if jsonb_typeof(c) is distinct from 'object' or
 (select array_agg(key order by key) from jsonb_object_keys(c) key) <>
 array['artwork','categoryIds','categoryLabels','cuisineIds','cuisineLabels','description','dishId','flavor','mealSlots','name','priceReference','roundDishId','temperature'] then return false; end if;
 if jsonb_typeof(c->'dishId')<>'string' or gm19_private.uuid_or_null(c->>'dishId') is null or (c->>'dishId')::uuid::text<>c->>'dishId' or
 jsonb_typeof(c->'roundDishId')<>'string' or gm19_private.uuid_or_null(c->>'roundDishId') is null or (c->>'roundDishId')::uuid::text<>c->>'roundDishId' or
 jsonb_typeof(c->'name')<>'string' or length(btrim(c->>'name')) not between 1 and 256 then return false; end if;
 if c->'description'<>'null'::jsonb and (jsonb_typeof(c->'description')<>'string' or length(c->>'description')>2000) then return false; end if;
 foreach k in array array['categoryIds','categoryLabels','cuisineIds','cuisineLabels','mealSlots'] loop
  a:=c->k;
  if jsonb_typeof(a)<>'array' or jsonb_array_length(a)>100 or
    (select count(*)<>count(distinct value) from jsonb_array_elements(a)) then return false; end if;
  for v in select * from jsonb_array_elements(a) loop
   if jsonb_typeof(v)<>'string' then return false; end if;
   if k in('categoryIds','cuisineIds') and gm19_private.uuid_or_null(v#>>'{}') is null then return false; end if;
   if k in('categoryLabels','cuisineLabels') and length(btrim(v#>>'{}')) not between 1 and 80 then return false; end if;
   if k='mealSlots' and v#>>'{}' not in('breakfast','lunch','dinner','snack') then return false; end if;
  end loop;
 end loop;
 if c->'temperature'<>'null'::jsonb and c->>'temperature' not in('hot','warm','cold','ambient','unknown') then return false; end if;
 -- Closed nested display objects. No raw evidence, location, seed or ballot data.
 if c->'flavor'<>'null'::jsonb and not gm06_private.json_matches(c->'flavor',
 '{"type":"object","required":["spicy","salty","sweet","sour"],"properties":{"spicy":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"salty":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"sweet":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"sour":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false}},"additionalProperties":false}'::jsonb) then return false; end if;
 if not gm06_private.flavor_valid(nullif(c->'flavor','null'::jsonb)) then return false; end if;
 if c->'artwork'<>'null'::jsonb and not gm06_private.json_matches(c->'artwork',
 '{"type":"object","properties":{"uri":{"type":"string","minLength":1,"maxLength":2000},"altText":{"type":"string","minLength":1,"maxLength":300},"attribution":{"type":["string","null"],"maxLength":500}},"required":["uri","altText","attribution"],"additionalProperties":false}'::jsonb) then return false; end if;
 return gm06_canonical.valid_price(c->'priceReference');
end $$;

create function gm06_canonical.valid_terminal(pool jsonb,podium jsonb,winner uuid,status text,reason text,round_no int,scored int) returns boolean
language plpgsql immutable set search_path=pg_catalog as $$
declare c jsonb; p jsonb; previous_score int; dense int:=0; score int; winners int:=0;
begin
 if jsonb_typeof(pool) is distinct from 'array' or jsonb_array_length(pool) not between 10 and 20 or
    jsonb_typeof(podium) is distinct from 'array' then return false; end if;
 for c in select * from jsonb_array_elements(pool) loop
  if not gm06_canonical.valid_card(c) then return false; end if;
 end loop;
 if (select count(*)<>count(distinct value->>'dishId') or count(*)<>count(distinct value->>'roundDishId') from jsonb_array_elements(pool)) then return false; end if;
 if status='NO_CONSENSUS' then
  return winner is null and jsonb_array_length(podium)=0 and
   ((reason='EMPTY_INTERSECTION' and round_no=1) or (reason='ALL_REMOVED' and round_no=2));
 end if;
 if status<>'DECIDED' or winner is null or jsonb_array_length(podium) not between 1 and 3 or
 not ((reason='UNANIMOUS_WANT' and round_no=1) or (reason='ACCEPTABLE_FINAL' and round_no=2)) then return false; end if;
 if (select count(*)<>count(distinct value->>'dishId') from jsonb_array_elements(podium)) then return false; end if;
 for p in select * from jsonb_array_elements(podium) loop
  if jsonb_typeof(p)<>'object' or (select array_agg(k order by k) from jsonb_object_keys(p) k)<>array['dishId','isWinner','rank','score'] or
    jsonb_typeof(p->'dishId')<>'string' or gm19_private.uuid_or_null(p->>'dishId') is null or
    jsonb_typeof(p->'isWinner')<>'boolean' or jsonb_typeof(p->'score')<>'number' or
    p->>'score'!~'^(0|[1-9][0-9]*)$' or length(p->>'score')>2 or
    jsonb_typeof(p->'rank')<>'number' or p->>'rank'!~'^[1-3]$' then return false; end if;
  score:=(p->>'score')::int;
  if score>2*scored or (previous_score is not null and score>previous_score) then return false; end if;
  if previous_score is null or score<previous_score then dense:=dense+1; end if;
  if (p->>'rank')::int<>dense or not exists(select 1 from jsonb_array_elements(pool) d where d->>'dishId'=p->>'dishId') then return false; end if;
  if (p->>'isWinner')::boolean then
   if (p->>'dishId')::uuid<>winner or dense<>1 then return false; end if;
   winners:=winners+1;
  elsif (p->>'dishId')::uuid=winner then return false;
  end if;
  previous_score:=score;
 end loop;
 return winners=1;
end $$;

-- Registry IDs, not an FK that cascades through operational rooms/sessions.
create table gm06_canonical.results (
 result_id uuid primary key references gm17_private.result_refs(id) deferrable initially deferred,
 write_xid xid8 not null default pg_current_xact_id(),
 room_ref_id uuid not null unique references gm17_private.room_refs(id),
 catalogue_id text not null references dish_v3_private.catalogues(id),
 catalogue_sha text not null check(catalogue_sha~'^[a-f0-9]{64}$'),
 storage_version text not null check(storage_version='GM06.2'),
 policy_version text not null check(policy_version='dish-decision-v4/ADR-019-30PCT-MIN1'),
 score_version text not null check(score_version='want2-ok1-round1-v1'),
 ranking_version text not null check(ranking_version='score-desc-dense-rank-v1'),
 status text not null check(status in('DECIDED','NO_CONSENSUS')),
 reason text not null, terminal_round int not null check(terminal_round in(1,2)),
 winner_dish_id uuid, locked_pool jsonb not null, top_dishes jsonb not null,
 member_count int not null check(member_count between 2 and 20),
 member_fingerprint text not null check(member_fingerprint~'^[a-f0-9]{64}$'),
 scored_r1_count int not null check(scored_r1_count between 1 and member_count),
 meal_slot text not null check(meal_slot in('breakfast','lunch','dinner','snack')),
 planned_meal_at timestamptz check(isfinite(planned_meal_at)),
 finalized_at timestamptz not null check(isfinite(finalized_at)),
 retain_until timestamptz not null check(isfinite(retain_until)),
 check(retain_until>finalized_at and retain_until<=finalized_at+interval '30 days'),
 check(gm06_canonical.valid_terminal(locked_pool,top_dishes,winner_dish_id,status,reason,terminal_round,scored_r1_count))
);
create index gm06_canonical_result_retention on gm06_canonical.results(retain_until);
create function gm06_canonical.register_result() returns trigger language plpgsql set search_path=pg_catalog as $$
declare release dish_v3_private.catalogues%rowtype;
begin
 new.write_xid:=pg_current_xact_id();
 select * into release from dish_v3_private.catalogues where id=new.catalogue_id for key share;
 if not found or release.source_sha<>new.catalogue_sha or exists(
  select 1 from jsonb_array_elements(new.locked_pool) d where not exists(
   select 1 from jsonb_array_elements(release.cards) c where c->>'dishId'=d->>'dishId' and c->>'name'=d->>'name')) then
  raise sqlstate '23514' using message='GM06_CANONICAL_CATALOGUE_MISMATCH';
 end if;
 -- The shared PK rejects collision with any legacy result reference, atomically.
 insert into gm17_private.result_refs values(new.result_id);
 return new;
end $$;
create trigger gm06_canonical_register before insert on gm06_canonical.results for each row execute function gm06_canonical.register_result();
create function gm06_canonical.immutable() returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise sqlstate '23514' using message='GM06_CANONICAL_IMMUTABLE'; end $$;
create trigger gm06_canonical_result_frozen before update on gm06_canonical.results for each row execute function gm06_canonical.immutable();

-- Private identities are separate from the display projection and purge on account deletion.
create table gm06_canonical.result_members (
 result_id uuid not null references gm06_canonical.results(result_id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 r1_accepted boolean not null,
 primary key(result_id,user_id)
);
create trigger gm06_canonical_members_frozen before update on gm06_canonical.result_members for each row execute function gm06_canonical.immutable();
create function gm06_canonical.check_member_count() returns trigger language plpgsql set search_path=pg_catalog as $$
declare key uuid; expected int; scored int; fingerprint text; actual text;
begin
 key:=new.result_id;
 select member_count,scored_r1_count,member_fingerprint into expected,scored,fingerprint from gm06_canonical.results where result_id=key for update;
 select encode(sha256(convert_to(key::text||':'||coalesce(string_agg(user_id::text,',' order by user_id),''),'UTF8')),'hex')
 into actual from gm06_canonical.result_members where result_id=key;
 if found and ((select count(*) from gm06_canonical.result_members where result_id=key)<>expected or actual<>fingerprint or (select count(*) from gm06_canonical.result_members where result_id=key and r1_accepted)<>scored) then
  raise sqlstate '23514' using message='GM06_CANONICAL_MEMBER_COUNT';
 end if;
 return null;
end $$;
create constraint trigger gm06_canonical_result_members after insert on gm06_canonical.results deferrable initially deferred for each row execute function gm06_canonical.check_member_count();
create constraint trigger gm06_canonical_members_count after insert on gm06_canonical.result_members deferrable initially deferred for each row execute function gm06_canonical.check_member_count();

-- A history entry references the SAME immutable result, no catalogue lookup/copy.
create table gm06_canonical.history_receipts (
 result_id uuid not null references gm06_canonical.results(result_id) on delete cascade,
 scope text not null check(scope in('personal','group')), owner_user_id uuid,
 unique nulls not distinct(result_id,scope,owner_user_id),
 check((scope='personal' and owner_user_id is not null) or (scope='group' and owner_user_id is null))
);
create table gm06_canonical.histories (
 history_id uuid primary key, result_id uuid not null references gm06_canonical.results(result_id),
 write_xid xid8 not null default pg_current_xact_id(),
 scope text not null check(scope in('personal','group')), owner_user_id uuid references auth.users(id) on delete cascade,
 expires_at timestamptz not null check(isfinite(expires_at)),
 unique nulls not distinct(result_id,scope,owner_user_id),
 check((scope='personal' and owner_user_id is not null) or (scope='group' and owner_user_id is null)),
 unique(history_id,result_id)
);
create index gm06_canonical_history_expiry on gm06_canonical.histories(expires_at);
create table gm06_canonical.history_audience (
 history_id uuid not null, result_id uuid not null, user_id uuid not null,
 consent_id uuid not null references public.consents(id) on delete cascade,
 primary key(history_id,user_id),
 foreign key(history_id,result_id) references gm06_canonical.histories(history_id,result_id) on delete cascade,
 foreign key(result_id,user_id) references gm06_canonical.result_members(result_id,user_id) on delete cascade
);
create trigger gm06_canonical_audience_frozen before update on gm06_canonical.history_audience for each row execute function gm06_canonical.immutable();
create trigger gm06_canonical_history_frozen before update on gm06_canonical.histories for each row execute function gm06_canonical.immutable();
create function gm06_canonical.history_receipt() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 new.write_xid:=pg_current_xact_id();
 insert into gm06_canonical.history_receipts values(new.result_id,new.scope,new.owner_user_id);
 return new;
end $$;
create trigger gm06_canonical_history_receipt before insert on gm06_canonical.histories for each row execute function gm06_canonical.history_receipt();

-- Internal predicate only: GM17/21 must use live consent/ACL before exposing DTOs.
create function gm06_canonical.same_transaction() returns trigger language plpgsql set search_path=pg_catalog as $$
declare parent_xid xid8;
begin
 if tg_table_name='result_members' then
  select write_xid into parent_xid from gm06_canonical.results where result_id=new.result_id;
 else
  select write_xid into parent_xid from gm06_canonical.histories where history_id=new.history_id;
 end if;
 if parent_xid is distinct from pg_current_xact_id() then
  raise sqlstate '23514' using message='GM06_CANONICAL_ATOMIC_CHILD';
 end if;
 return new;
end $$;
create trigger gm06_canonical_member_atomic before insert on gm06_canonical.result_members for each row execute function gm06_canonical.same_transaction();
create trigger gm06_canonical_audience_atomic before insert on gm06_canonical.history_audience for each row execute function gm06_canonical.same_transaction();

create function gm06_canonical.history_visible(key uuid,viewer uuid,at_time timestamptz) returns boolean
language sql stable set search_path=pg_catalog as $$
 select exists(select 1 from gm06_canonical.histories h join gm06_canonical.results r using(result_id)
 where h.history_id=key and isfinite(at_time) and at_time>=r.finalized_at
 and h.expires_at>at_time and r.retain_until>at_time and h.expires_at<=r.retain_until
 and exists(select 1 from gm06_canonical.history_audience a where a.history_id=h.history_id and a.user_id=viewer)
 and (select count(*) from gm06_canonical.history_audience a where a.history_id=h.history_id)=
   case when h.scope='personal' then 1 else r.member_count end
 and not exists(select 1 from gm06_canonical.history_audience a
  left join public.consents c on c.id=a.consent_id
  where a.history_id=h.history_id and (c.id is null or c.user_id<>a.user_id or
   c.scope<>h.scope||'_history' or not c.enabled or c.revoked_at is not null or
   c.granted_at is null or c.granted_at>r.finalized_at or
   (c.room_id is not null and c.room_id<>r.room_ref_id) or
   (c.expires_at is not null and (c.expires_at<=at_time or c.expires_at<h.expires_at)) or
   (h.scope='personal' and a.user_id<>h.owner_user_id) or
   exists(select 1 from gm21_private.settings s where s.user_id=a.user_id and s.scope=h.scope and not s.enabled))))
$$;
create function gm06_canonical.check_history() returns trigger language plpgsql set search_path=pg_catalog as $$
declare h gm06_canonical.histories%rowtype; at_time timestamptz; viewer uuid;
begin
 select * into h from gm06_canonical.histories where history_id=new.history_id;
 if not found then return null; end if;
 select finalized_at into at_time from gm06_canonical.results where result_id=h.result_id;
 select user_id into viewer from gm06_canonical.history_audience where history_id=h.history_id limit 1;
 if not gm06_canonical.history_visible(h.history_id,viewer,at_time) then
  raise sqlstate '23514' using message='GM06_CANONICAL_HISTORY_CONSENT';
 end if;
 return null;
end $$;
create constraint trigger gm06_canonical_history_consent after insert on gm06_canonical.histories deferrable initially deferred for each row execute function gm06_canonical.check_history();
create constraint trigger gm06_canonical_audience_consent after insert on gm06_canonical.history_audience deferrable initially deferred for each row execute function gm06_canonical.check_history();

-- Account defaults and per-room copies: never implicitly opt in to ranking/history.
create function gm06_canonical.valid_preferences(cuisines uuid[],categories uuid[],temperature text,flavor jsonb,budget jsonb) returns boolean
language sql immutable set search_path=pg_catalog as $$
 select gm06_canonical.unique_uuids(cuisines) and cardinality(cuisines)<=100
 and gm06_canonical.unique_uuids(categories) and cardinality(categories)<=100
 and (temperature is null or temperature in('hot','warm','cold','ambient','unknown'))
 and (flavor='null'::jsonb or gm06_private.json_matches(flavor,
 '{"type":"object","required":["spicy","salty","sweet","sour"],"properties":{"spicy":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"salty":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"sweet":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false},"sour":{"type":"object","required":["present","intensity"],"properties":{"present":{"type":["boolean","null"]},"intensity":{"enum":["none","low","medium","high","unknown"]}},"additionalProperties":false}},"additionalProperties":false}'::jsonb))
 and gm06_private.flavor_valid(nullif(flavor,'null'::jsonb))
 and (budget='null'::jsonb or gm06_private.json_matches(budget,
 '{"type":"object","properties":{"maximum":{"type":"number","minimum":0},"currency":{"type":"string","pattern":"^[A-Z]{3}$"},"unit":{"type":"string","enum":["portion","item","person","group","kg","menu_item_unspecified"]}},"required":["maximum","currency","unit"],"additionalProperties":false}'::jsonb))
$$;
create table gm06_canonical.account_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 cuisine_ids uuid[] not null, category_ids uuid[] not null, temperature text,
 flavor jsonb not null, budget jsonb not null, avoid_recent boolean not null,
 version bigint not null check(version>0), updated_at timestamptz not null check(isfinite(updated_at)),
 check(gm06_canonical.valid_preferences(cuisine_ids,category_ids,temperature,flavor,budget))
);
create table gm06_canonical.room_preferences (
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 cuisine_ids uuid[] not null, category_ids uuid[] not null, temperature text,
 flavor jsonb not null, budget jsonb not null, avoid_recent boolean not null,
 source_account_version bigint check(source_account_version>0),
 version bigint not null check(version>0), updated_at timestamptz not null check(isfinite(updated_at)),
 primary key(room_id,user_id),
 foreign key(room_id,user_id) references public.members(room_id,user_id) on delete cascade,
 check(gm06_canonical.valid_preferences(cuisine_ids,category_ids,temperature,flavor,budget))
);
create function gm06_canonical.preference_guard() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if tg_op='UPDATE' and (new.user_id<>old.user_id or new.version<>old.version+1 or new.updated_at<old.updated_at) then
  raise sqlstate '23514' using message='GM06_CANONICAL_PREFERENCE_VERSION';
 end if;
 if tg_table_name='room_preferences' then
  if tg_op='UPDATE' and new.room_id<>old.room_id then raise sqlstate '23514' using message='GM06_CANONICAL_PREFERENCE_ID'; end if;
  perform 1 from public.rooms where id=new.room_id and state='LOBBY' for update;
  if not found or not exists(select 1 from public.members where room_id=new.room_id and user_id=new.user_id and left_at is null) then
   raise sqlstate '23514' using message='GM06_CANONICAL_PREFERENCE_ROOM';
  end if;
 end if;
 return new;
end $$;
create trigger gm06_canonical_account_preference before update on gm06_canonical.account_preferences for each row execute function gm06_canonical.preference_guard();
create trigger gm06_canonical_room_preference before insert or update on gm06_canonical.room_preferences for each row execute function gm06_canonical.preference_guard();

-- No new importer authority: GM40 owns installation into existing catalogues.
-- These rows preserve nullable observations for its forthcoming richer projection.
create table gm06_canonical.price_observations (
 observation_id uuid primary key, catalogue_id text not null references dish_v3_private.catalogues(id),
 dish_id uuid not null, amount numeric check(amount>=0 and amount<='1000000000'::numeric),
 currency text check(currency~'^[A-Z]{3}$'),
 unit text check(unit in('portion','item','person','group','kg','menu_item_unspecified')),
 source_ref text check(length(btrim(source_ref)) between 1 and 500),
 serving_size text check(length(serving_size)<=160),
 observed_at timestamptz check(isfinite(observed_at))
);
create index gm06_canonical_price_lookup on gm06_canonical.price_observations(catalogue_id,dish_id,observed_at desc);
create function gm06_canonical.price_guard() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 perform 1 from dish_v3_private.catalogues c where c.id=new.catalogue_id and exists(
  select 1 from jsonb_array_elements(c.cards) d where d->>'dishId'=new.dish_id::text) for key share;
 if not found then raise sqlstate '23503' using message='GM06_CANONICAL_PRICE_DISH'; end if;
 return new;
end $$;
create trigger gm06_canonical_price_insert before insert on gm06_canonical.price_observations for each row execute function gm06_canonical.price_guard();
create trigger gm06_canonical_price_frozen before update on gm06_canonical.price_observations for each row execute function gm06_canonical.immutable();
create function gm06_canonical.latest_price(release_id text,dish uuid) returns jsonb
language sql stable set search_path=pg_catalog as $$
 with latest as (select * from gm06_canonical.price_observations where catalogue_id=release_id and dish_id=dish
  and observed_at=(select max(observed_at) from gm06_canonical.price_observations where catalogue_id=release_id and dish_id=dish))
 select case when count(*)=1 then (select case when amount is null then null else
  jsonb_build_object('amount',amount,'currency',currency,'unit',unit,'sourceRef',source_ref,'servingSize',serving_size,'observedAt',observed_at) end from latest limit 1) else null end from latest
$$;

-- Additive retention bridge: preserve legacy cleanup body under its own name.
-- No live API/producer writes these tables yet. GM17 reviews the new bridge.
create function gm06_canonical.keep_reference() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if (tg_table_name='result_refs' and exists(select 1 from gm06_canonical.results where result_id=old.id)) or
    (tg_table_name='room_refs' and exists(select 1 from gm06_canonical.results where room_ref_id=old.id)) then return null; end if;
 return old;
end $$;
create trigger gm06_canonical_keep_result_ref before delete on gm17_private.result_refs for each row execute function gm06_canonical.keep_reference();
create trigger gm06_canonical_keep_room_ref before delete on gm17_private.room_refs for each row execute function gm06_canonical.keep_reference();
create function gm06_canonical.keep_consent() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if exists(select 1 from auth.users where id=old.user_id) and exists(select 1 from gm06_canonical.history_audience a where a.consent_id=old.id and
  gm06_canonical.history_visible(a.history_id,a.user_id,statement_timestamp())) then return null; end if;
 return old;
end $$;
create trigger gm06_canonical_keep_consent before delete on public.consents for each row execute function gm06_canonical.keep_consent();
alter function gm17_private.cleanup() rename to cleanup_before_gm06_canonical;
revoke all on function gm17_private.cleanup_before_gm06_canonical() from public,anon,authenticated,service_role,gm06_publisher;
create function gm17_private.cleanup() returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare now_at timestamptz:=statement_timestamp(); answer jsonb;
begin
 if not pg_try_advisory_xact_lock(170017) then return jsonb_build_object('skipped',true); end if;
 update gm06_private.reference_epoch set epoch=epoch+1 where singleton;
 set constraints all deferred;
 delete from gm06_canonical.histories h where not exists(
  select 1 from gm06_canonical.history_audience a where a.history_id=h.history_id and
  gm06_canonical.history_visible(h.history_id,a.user_id,now_at));
 delete from gm06_canonical.results r where r.retain_until<=now_at and not exists(
  select 1 from gm06_canonical.histories h where h.result_id=r.result_id);
 update public.consents c set room_id=null,retention_detached=true,version=version+1
 where room_id in(select id from public.rooms where least(coalesce(terminal_at,expires_at),expires_at)+interval '24 hours'<=now_at)
 and exists(select 1 from gm06_canonical.history_audience a where a.consent_id=c.id);
 answer:=gm17_private.cleanup_before_gm06_canonical();
 return answer;
end $$;
revoke all on function gm17_private.cleanup() from public,anon,authenticated,service_role,gm06_publisher;

-- Default-deny even for service_role: APIs must be separately reviewed in GM17/21.
do $$ declare t text; begin
 foreach t in array array['results','result_members','histories','history_audience','history_receipts','account_preferences','room_preferences','price_observations'] loop
  execute format('alter table gm06_canonical.%I enable row level security',t);
  execute format('alter table gm06_canonical.%I force row level security',t);
  execute format('revoke all on gm06_canonical.%I from public,anon,authenticated,service_role,gm06_publisher',t);
 end loop;
end $$;
revoke all on all functions in schema gm06_canonical from public,anon,authenticated,service_role,gm06_publisher;
comment on schema gm06_canonical is 'GM06.2 canonical storage only; no v4 runtime/ACL/API enabled. Review producer integration separately.';
insert into public.schema_versions(schema_version,contract_id,food_contract_version,core_contract_version,upstream_revision)
values('0.9.0','GM06.2-canonical-storage','1.1.0','1.1.0','a31f403fbcdc4cfdb03e03fe77506ccdd9a4cbea');
commit;
