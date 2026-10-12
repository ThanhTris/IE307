-- GM-18 independent eligibility kernel. App permissions/RPC auth remain GM-17.
-- No existing migration, RLS policy or role is changed.
begin;
create schema gm18_private;
revoke all on schema gm18_private from public, anon, authenticated, service_role;

create function gm18_private.fresh(row_value jsonb, evaluated_at timestamptz, until_at timestamptz)
returns boolean language sql immutable set search_path=pg_catalog as $$
 select coalesce(row_value->>'reviewStatus' in ('verified','published')
   and (row_value->>'checkedAt')::timestamptz <= evaluated_at
   and (row_value->>'validUntil')::timestamptz > until_at,false)
$$;
create function gm18_private.sourced(bundle jsonb, row_value jsonb, evaluated_at timestamptz, until_at timestamptz)
returns boolean language plpgsql immutable set search_path=pg_catalog,gm18_private as $$
declare ref text; source_value jsonb; refs jsonb;
begin
 if not gm18_private.fresh(row_value,evaluated_at,until_at) then return false; end if;
 refs:=jsonb_build_array(row_value->>'sourceRef');
 if row_value->>'menuSource' is not null then refs:=refs||jsonb_build_array(row_value->>'menuSource'); end if;
 for ref in select value from jsonb_each_text(coalesce(row_value->'fieldSources','{}')) loop
   refs:=refs||jsonb_build_array(ref);
 end loop;
 for ref in select jsonb_array_elements_text(refs) loop
   select value into source_value from jsonb_array_elements(bundle#>'{entities,dataSources}')
     where value->>'sourceRef'=ref;
   if not gm18_private.fresh(source_value,evaluated_at,until_at)
      or coalesce(source_value->>'usageRights','unknown') not in ('granted','licensed','public_domain') then return false; end if;
 end loop;
 return true;
end$$;
create function gm18_private.inside_polygon(boundary jsonb, lat double precision, lng double precision)
returns boolean language plpgsql immutable set search_path=pg_catalog as $$
declare ring jsonb; point jsonb; previous jsonb; inside boolean; edge boolean;
 x double precision; y double precision; px double precision; py double precision; ring_index int:=0;
begin
 if boundary->>'type'<>'Polygon' or lat is null or lng is null then return false; end if;
 for ring in select value from jsonb_array_elements(boundary->'coordinates') loop
   inside:=false;edge:=false; previous:=ring->(jsonb_array_length(ring)-1);
   for point in select value from jsonb_array_elements(ring) loop
     x:=(point->>0)::float8;y:=(point->>1)::float8;px:=(previous->>0)::float8;py:=(previous->>1)::float8;
     if abs((lng-x)*(py-y)-(lat-y)*(px-x))<1e-12 and lng between least(x,px) and greatest(x,px)
       and lat between least(y,py) and greatest(y,py) then edge:=true;exit;end if;
     if (y>lat)<>(py>lat) then
       if lng<(px-x)*(lat-y)/(py-y)+x then inside:=not inside;end if;
     end if;
     previous:=point;
   end loop;
   if ring_index=0 and not(inside or edge) then return false;end if;
   if ring_index>0 and inside and not edge then return false;end if;
   ring_index:=ring_index+1;
 end loop;
 return ring_index>0;
end$$;
create function gm18_private.distance_m(lat1 float8,lng1 float8,lat2 float8,lng2 float8)
returns float8 language sql immutable strict set search_path=pg_catalog as $$
 select 6371000*2*asin(sqrt(least(1.0,greatest(0.0,
   power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2)))))
$$;
create function gm18_private.seed_hash(value text) returns bigint
language plpgsql immutable strict set search_path=pg_catalog as $$
declare result bigint:=0;i int;
begin for i in 1..length(value) loop result:=(result*31+ascii(substr(value,i,1)))%2147483647;end loop;return result;end$$;
create function gm18_private.seconds(value text) returns numeric
language sql immutable strict set search_path=pg_catalog as $$
 select substr(value,1,2)::numeric*3600+substr(value,4,2)::numeric*60
$$;
create function gm18_private.schedule_state(bundle jsonb,schedule_id text,timezone_name text,
 desired_at timestamptz,evaluated_at timestamptz,owner_type text,owner_id text)
returns text language plpgsql stable set search_path=pg_catalog,gm18_private as $$
declare local_at timestamp; current_date_value date; actual_date date; day int; offset_seconds int;
 exception_value jsonb; today jsonb; period jsonb; row_value jsonb; periods jsonb; intervals jsonb;
 clock_seconds numeric; known boolean:=false; start_seconds numeric; end_seconds numeric; last_order text;
begin
 if schedule_id is null then return 'unknown';end if;
 local_at:=desired_at at time zone timezone_name;current_date_value:=local_at::date;
 select value into today from jsonb_array_elements(bundle#>'{entities,dateExceptions}')
 where value->>'scheduleId'=schedule_id and (value->>'localDate')::date=current_date_value;
 if today is not null and (not gm18_private.sourced(bundle,today,evaluated_at,desired_at) or today->>'status'='unknown') then return 'unknown';end if;
 if today->>'status'='closed' then return 'closed';end if;
 for offset_seconds in select v from (values(0),(86400)) v(v) loop
   actual_date:=current_date_value-offset_seconds/86400;day:=extract(isodow from actual_date)::int;
   select value into exception_value from jsonb_array_elements(bundle#>'{entities,dateExceptions}')
     where value->>'scheduleId'=schedule_id and (value->>'localDate')::date=actual_date;
   if exception_value is not null then periods:=jsonb_build_array(exception_value);
   else
     select coalesce(jsonb_agg(value),'[]') into periods from jsonb_array_elements(bundle#>'{entities,weeklySchedules}')
     where value->>'scheduleId'=schedule_id and value->>'ownerType'=owner_type and value->>'ownerId'=owner_id
       and value->>'timezone'=timezone_name and (value->>'dayOfWeek')::int=day;
   end if;
   for row_value in select value from jsonb_array_elements(periods) loop
     if offset_seconds>0 and exception_value is null and coalesce((row_value->>'endDayOffset')::int,0)<>1 then continue;end if;
     if not gm18_private.sourced(bundle,row_value,evaluated_at,desired_at) or row_value->>'status'='unknown' then continue;end if;
     if offset_seconds=0 then known:=true;end if;
     if row_value->>'status'<>'open' then continue;end if;
     intervals:=case when exception_value is null then jsonb_build_array(row_value) else row_value->'intervals' end;
     for period in select value from jsonb_array_elements(intervals) loop
       if offset_seconds>0 and coalesce((period->>'endDayOffset')::int,0)<>1 then continue;end if;
       start_seconds:=gm18_private.seconds(period->>'startTime');
       end_seconds:=gm18_private.seconds(period->>'endTime')+coalesce((period->>'endDayOffset')::int,0)*86400;
       clock_seconds:=extract(epoch from local_at::time)+offset_seconds;
       last_order:=coalesce(row_value->>'lastOrder',period->>'lastOrder');
       if clock_seconds>=start_seconds and clock_seconds<end_seconds and (last_order is null or
         clock_seconds<=gm18_private.seconds(last_order)+coalesce((row_value->>'lastOrderDayOffset')::int,(period->>'lastOrderDayOffset')::int,0)*86400) then return 'open';end if;
     end loop;
   end loop;
 end loop;
 return case when known then 'closed' else 'unknown' end;
end$$;

create function gm18_private.evaluate(bundle jsonb, input jsonb, evaluated_at timestamptz, policy jsonb)
returns jsonb language plpgsql stable set search_path=pg_catalog,gm18_private as $$
declare ctx jsonb:=input->'context'; desired_at timestamptz:=(ctx->>'desiredAt')::timestamptz;
 until_at timestamptz:=greatest(evaluated_at,desired_at);radius_m float8:=(ctx->>'radiusM')::float8;
 anchor jsonb;coverage jsonb;dataset jsonb;has_context boolean;offering jsonb;venue jsonb;dish jsonb;profile jsonb;
 reason text;confirmation boolean;venue_state text;offer_state text;active jsonb;artwork jsonb;price jsonb;
 choice_id text;candidate jsonb;eligible jsonb:='[]';excluded jsonb:='[]';needs_confirmation jsonb:='[]';
 categories jsonb;category text;participants jsonb;budget jsonb;affinity int;budget_fit int;recent int;
 sorted jsonb;grouped jsonb:='[]';pool jsonb:='[]';seen text[]:='{}';eligible_ids jsonb;reason_codes jsonb;total int;
begin
 if evaluated_at is null or desired_at is null or not isfinite(evaluated_at) or not isfinite(desired_at)
   or radius_m is null or radius_m::text in ('NaN','Infinity','-Infinity') or radius_m<=0
   or coalesce((policy->>'maxRadiusM')::float8,0)<=0 or coalesce((policy->>'maxFutureSeconds')::float8,0)<=0
   or (policy->>'maxRadiusM')::float8::text in ('NaN','Infinity','-Infinity')
   or (policy->>'maxFutureSeconds')::float8::text in ('NaN','Infinity','-Infinity')
   or radius_m>(policy->>'maxRadiusM')::float8
   or desired_at>evaluated_at+make_interval(secs=>(policy->>'maxFutureSeconds')::float8)
   or coalesce(ctx->>'mealSlot','') not in ('breakfast','lunch','dinner','snack')
   or coalesce(ctx->>'serviceMode','') not in ('dine_in','takeaway','delivery')
   or (ctx->>'timeHint' is not null and ctx->>'timeHint'<>'late_night')
   or coalesce(input->>'poolSeed','')='' then raise exception using errcode='22023',message='INVALID_INPUT';end if;
 if not coalesce((policy->>'fixtureMode')::boolean,false) and (
   (bundle->>'fixtureOnly')::boolean or exists(select 1 from jsonb_each(bundle->'entities') e,
     lateral jsonb_array_elements(e.value) r where coalesce((r.value->>'fixtureOnly')::boolean,false))) then
   raise exception using errcode='22023',message='FIXTURE_NOT_ALLOWED';end if;
 select value into anchor from jsonb_array_elements(bundle#>'{entities,publicAnchors}') where value->>'anchorId'=ctx->>'anchorId';
 select value into coverage from jsonb_array_elements(bundle#>'{entities,coverageAreas}') where value->>'areaId'=anchor->>'coverageId';
 select case when count(*)=1 then jsonb_agg(value)->0 else null end into dataset
   from jsonb_array_elements(bundle#>'{entities,datasetVersions}') where value->>'datasetVersion'=bundle->>'datasetVersion';
 has_context:=gm18_private.sourced(bundle,dataset,evaluated_at,until_at)
   and gm18_private.sourced(bundle,anchor,evaluated_at,until_at) and gm18_private.sourced(bundle,coverage,evaluated_at,until_at)
   and coverage->>'datasetVersion'=bundle->>'datasetVersion' and coalesce((anchor->>'isPublic')::boolean,false)
   and (ctx->>'coverageId' is null or ctx->>'coverageId'=anchor->>'coverageId')
   and gm18_private.inside_polygon(coverage->'boundary',(anchor->>'lat')::float8,(anchor->>'lng')::float8);
 for offering in select value from jsonb_array_elements(bundle#>'{entities,venueDishes}') order by value->>'offeringId' collate "C" loop
   select value into venue from jsonb_array_elements(bundle#>'{entities,venues}') where value->>'id'=offering->>'venueId';
   select value into dish from jsonb_array_elements(bundle#>'{entities,dishes}') where value->>'id'=offering->>'dishId';
   reason:='';confirmation:=false;
   if desired_at<evaluated_at then reason:='DESIRED_TIME_PASSED';confirmation:=true;
   elsif not coalesce(has_context,false) then reason:='OUT_OF_COVERAGE';
   elsif venue is null or dish is null then reason:='BROKEN_REFERENCE';confirmation:=true;
   elsif venue->>'lat' is null or venue->>'lng' is null then reason:='COORDINATES_UNKNOWN';confirmation:=true;
   elsif not gm18_private.inside_polygon(coverage->'boundary',(venue->>'lat')::float8,(venue->>'lng')::float8) then reason:='OUT_OF_COVERAGE';
   elsif gm18_private.distance_m((anchor->>'lat')::float8,(anchor->>'lng')::float8,(venue->>'lat')::float8,(venue->>'lng')::float8)>radius_m+1e-7 then reason:='OUTSIDE_RADIUS';
   elsif venue->>'status'<>'active' then reason:='VENUE_UNAVAILABLE';confirmation:=true;
   elsif offering->>'menuSource' is null then reason:='MENU_UNKNOWN';confirmation:=true;
   elsif not(gm18_private.sourced(bundle,venue,evaluated_at,until_at) and gm18_private.sourced(bundle,dish,evaluated_at,until_at)
     and gm18_private.sourced(bundle,offering,evaluated_at,until_at)) then reason:='SOURCE_OR_ROW_UNVERIFIED';confirmation:=true;
   elsif jsonb_array_length(dish->'mealSlots')=0 or dish->>'classificationStatus'<>'reviewed' then reason:='MEAL_UNKNOWN';confirmation:=true;
   elsif not(dish->'mealSlots' ? (ctx->>'mealSlot')) then reason:='MEAL_MISMATCH';
   elsif offering->>'serviceMode' is distinct from ctx->>'serviceMode' or not(venue->'serviceModes' ? (ctx->>'serviceMode')) then reason:='SERVICE_MODE_UNAVAILABLE';confirmation:=true;
   else
     venue_state:=gm18_private.schedule_state(bundle,venue->>'scheduleId',venue->>'timezone',desired_at,evaluated_at,'venue',venue->>'id');
     offer_state:=gm18_private.schedule_state(bundle,offering->>'scheduleId',venue->>'timezone',desired_at,evaluated_at,'offering',offering->>'offeringId');
     if venue_state='unknown' or offer_state='unknown' then reason:='SCHEDULE_UNKNOWN';confirmation:=true;
     elsif venue_state<>'open' or offer_state<>'open' then reason:='OUTSIDE_SCHEDULE';
     elsif exists(select 1 from jsonb_array_elements(bundle#>'{entities,availabilityOverrides}') r where
       r.value->>'offeringId'=offering->>'offeringId' and r.value->>'state' in ('sold_out','paused')
       and (r.value->>'observedAt')::timestamptz<=evaluated_at and (r.value->>'expiresAt')::timestamptz>until_at
       and gm18_private.sourced(bundle,r.value,evaluated_at,until_at)) then reason:='SOLD_OUT_OR_PAUSED';end if;
   end if;
   if reason<>'' then
     candidate:=jsonb_build_object('offeringId',offering->>'offeringId','reason',reason);
     if confirmation then needs_confirmation:=needs_confirmation||jsonb_build_array(candidate);
     else excluded:=excluded||jsonb_build_array(candidate);end if;
     continue;
   end if;
   profile:=dish||coalesce(nullif(offering->'profileOverrides','null'),'{}');
   choice_id:=(offering->>'dishId')||':'||coalesce(offering->>'variant','');
   price:=jsonb_build_object('priceMin',offering->'priceMin','priceMax',offering->'priceMax','unit',offering->'unit',
     'currency',offering->'currency','servingSize',offering->'servingSize','sourceRef',offering#>'{fieldSources,price}');
   artwork:=coalesce(nullif(offering->'artwork','null'),dish->'artwork');
   if coalesce(artwork->>'usageRights','unknown') not in ('granted','licensed','public_domain') then artwork:='null';end if;
   candidate:=jsonb_build_object('roundDishId',choice_id,'choiceId',choice_id,'dishId',offering->>'dishId','variant',offering->'variant',
     'name',dish->>'name','description',dish->'description','cuisineIds',profile->'cuisineIds','categoryIds',profile->'categoryIds',
     'origin',dish->'origin','temperature',profile->'temperature','flavor',profile->'flavor','artwork',artwork,
     'venueId',venue->>'id','venueName',venue->>'branchName','venueAddress',venue->'address',
     'distanceM',floor(gm18_private.distance_m((anchor->>'lat')::float8,(anchor->>'lng')::float8,(venue->>'lat')::float8,(venue->>'lng')::float8)+0.5),
     'representativeOfferingId',offering->>'offeringId','offeringIds',jsonb_build_array(offering->>'offeringId'),'price',price,
     'availability',case when exists(select 1 from jsonb_array_elements(bundle#>'{entities,availabilityOverrides}') r where
       r.value->>'offeringId'=offering->>'offeringId' and r.value->>'state'='available'
       and (r.value->>'observedAt')::timestamptz<=evaluated_at and (r.value->>'expiresAt')::timestamptz>until_at
       and gm18_private.sourced(bundle,r.value,evaluated_at,until_at)) then 'confirmed' else 'scheduled' end)|| (price-'sourceRef');
   eligible:=eligible||jsonb_build_array(candidate);
 end loop;
 select coalesce(jsonb_agg(value->>'representativeOfferingId' order by value->>'representativeOfferingId' collate "C"),'[]') into eligible_ids from jsonb_array_elements(eligible);
 participants:=coalesce(input->'preferencesByParticipant','{}');
 select coalesce(jsonb_agg(cat order by cat collate "C"),'[]') into categories from
   (select distinct jsonb_array_elements_text(coalesce(value->'categoryIds','[]')) cat from jsonb_each(participants)) cats;
 if jsonb_typeof(ctx->'budget')='number' then budget:=jsonb_build_object('max',ctx->'budget','currency','VND','unit','person');
 else budget:=ctx->'budget';end if;
 sorted:='[]';
 for candidate in select value from jsonb_array_elements(eligible) loop
   select count(*) into affinity from jsonb_each(participants) p,
     lateral (select value from jsonb_array_elements_text(coalesce(p.value->'categoryIds','[]'))
              where candidate->'categoryIds' ? value
       union all select value from jsonb_array_elements_text(coalesce(p.value->'cuisineIds','[]')) where candidate->'cuisineIds' ? value) matches;
   select affinity + coalesce(sum(
     case when p.value->>'temperature' is not null and p.value->>'temperature'<>'unknown'
       and candidate->>'temperature'=p.value->>'temperature' then 1 else 0 end
     + (select coalesce(sum(
       case when f.value->>'present' is not null and candidate#>>array['flavor',f.key,'present']=f.value->>'present' then 1 else 0 end
       + case when f.value->>'intensity' is not null and f.value->>'intensity'<>'unknown'
         and candidate#>>array['flavor',f.key,'intensity']=f.value->>'intensity' then 1 else 0 end),0)
       from jsonb_each(coalesce(nullif(p.value->'flavor','null'),'{}')) f)),0)
     into affinity from jsonb_each(participants) p;
   budget_fit:=case when candidate->>'currency'=budget->>'currency' and candidate->>'unit'=budget->>'unit'
     and (candidate->>'priceMax')::numeric<=(budget->>'max')::numeric then 1 else 0 end;
   recent:=case when coalesce((ctx->>'avoidRecent')::boolean,false) and coalesce(input->'recentDishIds','[]') ? (candidate->>'dishId') then 1 else 0 end;
   sorted:=sorted||jsonb_build_array(candidate||jsonb_build_object('_affinity',affinity,'_budget',budget_fit,'_recent',recent,
     '_hash',gm18_private.seed_hash((input->>'poolSeed')||(candidate->>'choiceId'))));
 end loop;
 for candidate in select value from jsonb_array_elements(sorted) order by
   (value->>'_affinity')::int desc,(value->>'_budget')::int desc,(value->>'_recent')::int,
   (value->>'distanceM')::int,(value->>'_hash')::bigint,value->>'representativeOfferingId' collate "C" loop
   choice_id:=candidate->>'choiceId';
   if choice_id=any(seen) then
     select coalesce(jsonb_agg(case when value->>'choiceId'=choice_id then jsonb_set(value,'{offeringIds}',
       (value->'offeringIds')||(candidate->'offeringIds')) else value end),'[]') into grouped from jsonb_array_elements(grouped);
   else grouped:=grouped||jsonb_build_array(candidate-'_affinity'-'_budget'-'_recent'-'_hash');seen:=array_append(seen,choice_id);end if;
 end loop;
 total:=jsonb_array_length(grouped);seen:='{}';
 for category in select jsonb_array_elements_text(categories) loop
   if exists(select 1 from jsonb_array_elements(pool) p where p.value->'categoryIds' ? category) then continue;end if;
   select value into candidate from jsonb_array_elements(grouped) where value->'categoryIds' ? category and not(value->>'choiceId'=any(seen)) limit 1;
   if candidate is not null and jsonb_array_length(pool)<8 then pool:=pool||jsonb_build_array(candidate);seen:=array_append(seen,candidate->>'choiceId');end if;
 end loop;
 for candidate in select value from jsonb_array_elements(grouped) loop
   if jsonb_array_length(pool)<8 and not(candidate->>'choiceId'=any(seen)) then pool:=pool||jsonb_build_array(candidate);seen:=array_append(seen,candidate->>'choiceId');end if;
 end loop;
 select coalesce(jsonb_agg(jsonb_set(value,'{offeringIds}',(select jsonb_agg(ids order by ids collate "C") from jsonb_array_elements_text(value->'offeringIds') ids))),'[]') into pool from jsonb_array_elements(pool);
 if jsonb_array_length(pool)>0 then reason_codes:='[]';
 elsif jsonb_array_length(excluded)+jsonb_array_length(needs_confirmation)=0 then reason_codes:='["NO_ELIGIBLE_FOOD"]';
 else select jsonb_agg(reasons.reason_value order by reasons.reason_value collate "C") into reason_codes from
   (select distinct value->>'reason' reason_value from jsonb_array_elements(excluded||needs_confirmation)) reasons;end if;
 return jsonb_build_object('pool',pool,'datasetVersion',bundle->>'datasetVersion','eligibilityVersion','gm18-eligibility-1.0.0',
   'evaluatedAt',to_char(evaluated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'poolSeed',input->>'poolSeed',
   'totalCandidateCount',total,'eligibleOfferingIds',eligible_ids,'excludedOfferings',excluded,
   'needsConfirmationOfferings',needs_confirmation,'reasonCodes',reason_codes);
end$$;

-- Trusted caller supplies the immutable winner identity; GM-19/17 handle member/result ACL.
create function gm18_private.refetch_winner(bundle jsonb,input jsonb,evaluated_at timestamptz,policy jsonb,
 winner_dish_id uuid,winner_variant text) returns jsonb language sql stable set search_path=pg_catalog,gm18_private as $$
 select gm18_private.evaluate(jsonb_set(bundle,'{entities,venueDishes}',
   (select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(bundle#>'{entities,venueDishes}')
    where value->>'dishId'=winner_dish_id::text and value->>'variant' is not distinct from winner_variant)),
   input,evaluated_at,policy)->'pool'
$$;
create function gm18_private.snapshot(dataset_version text) returns jsonb
language sql stable set search_path=pg_catalog,public as $$
 select jsonb_build_object('contractVersion','1.1.0','datasetVersion',dataset_version,
 'fixtureOnly',coalesce((select bool_or(fixture_only) from public.dataset_versions where dataset_versions.dataset_version=$1),true),
 'entities',jsonb_build_object(
 'dataSources',(select coalesce(jsonb_agg(jsonb_build_object('sourceRef',r.source_ref,'locator',r.locator,'usageRights',r.usage_rights,'license',r.license,'attribution',r.attribution,'status',r.status,'version',r.version,'reviewStatus',r.review_status,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'fixtureOnly',r.fixture_only)),'[]') from public.data_sources r),
 'taxonomy',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'type',r.type,'code',r.code,'label',r.label,'description',r.description,'status',r.status,'origin',r.origin,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'fixtureOnly',r.fixture_only)),'[]') from public.taxonomy r),
 'datasetVersions',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'datasetVersion',r.dataset_version,'contractVersion',r.contract_version,'status',r.status,'checksum',r.checksum,'artifactLocator',r.artifact_locator,'previousVersionId',r.previous_version_id,'qualityReport',r.quality_report,'rollbackLocator',r.rollback_locator,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'fixtureOnly',r.fixture_only)),'[]') from public.dataset_versions r where r.dataset_version=$1),
 'coverageAreas',(select coalesce(jsonb_agg(jsonb_build_object('areaId',r.area_id,'name',r.name,'boundary',r.boundary,'datasetVersion',r.dataset_version,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'fixtureOnly',r.fixture_only)),'[]') from public.coverage_areas r),
 'dishes',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'description',r.description,'aliases',r.aliases,'cuisineIds',r.cuisine_ids,'categoryIds',r.category_ids,'mealSlots',r.meal_slots,'timeHints',r.time_hints,'classificationStatus',r.classification_status,'origin',r.origin,'ingredientTags',r.ingredient_tags,'temperature',r.temperature,'flavor',r.flavor,'artwork',r.artwork,'sourceDishIds',r.source_dish_ids,'status',r.status,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'fixtureOnly',r.fixture_only)),'[]') from public.dishes r),
 'venues',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'branchName',r.branch_name,'address',r.address,'adminAreaId',r.admin_area_id,'lat',r.lat,'lng',r.lng,'timezone',r.timezone,'status',r.status,'serviceModes',r.service_modes,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'scheduleId',r.schedule_id,'fixtureOnly',r.fixture_only)),'[]') from public.venues r),
 'venueDishes',(select coalesce(jsonb_agg(jsonb_build_object('offeringId',r.offering_id,'venueId',r.venue_id,'dishId',r.dish_id,'variant',r.variant,'menuName',r.menu_name,'menuSource',r.menu_source,'scheduleId',r.schedule_id,'serviceMode',r.service_mode,'priceMin',r.price_min,'priceMax',r.price_max,'unit',r.unit,'currency',r.currency,'servingSize',r.serving_size,'profileOverrides',r.profile_overrides,'artwork',r.artwork,'status',r.status,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'fixtureOnly',r.fixture_only)),'[]') from public.venue_dishes r),
 'weeklySchedules',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'scheduleId',r.schedule_id,'ownerType',r.owner_type,'ownerId',r.owner_id,'dayOfWeek',r.day_of_week,'startTime',r.start_time,'endTime',r.end_time,'endDayOffset',r.end_day_offset,'is24Hours',r.is24_hours,'timezone',r.timezone,'status',r.status,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'lastOrder',r.last_order,'lastOrderDayOffset',r.last_order_day_offset,'fixtureOnly',r.fixture_only)),'[]') from public.weekly_schedules r),
 'dateExceptions',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'scheduleId',r.schedule_id,'localDate',r.local_date,'status',r.status,'intervals',r.intervals,'lastOrder',r.last_order,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'lastOrderDayOffset',r.last_order_day_offset,'fixtureOnly',r.fixture_only)),'[]') from public.date_exceptions r),
 'availabilityOverrides',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'offeringId',r.offering_id,'state',r.state,'source',r.source,'observedAt',r.observed_at,'expiresAt',r.expires_at,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'fixtureOnly',r.fixture_only)),'[]') from public.availability_overrides r),
 'publicAnchors',(select coalesce(jsonb_agg(jsonb_build_object('anchorId',r.anchor_id,'name',r.name,'lat',r.lat,'lng',r.lng,'coverageId',r.coverage_id,'isPublic',r.is_public,'version',r.version,'reviewStatus',r.review_status,'sourceRef',r.source_ref,'fieldSources',r.field_sources,'checkedAt',r.checked_at,'validUntil',r.valid_until,'enteredBy',r.entered_by,'reviewedBy',r.reviewed_by,'fixtureOnly',r.fixture_only)),'[]') from public.public_anchors r) ))
$$;
create function gm18_private.preview(input jsonb,dataset_version text,evaluated_at timestamptz,policy jsonb)
returns jsonb language sql stable set search_path=pg_catalog,gm18_private as $$
 select gm18_private.evaluate(gm18_private.snapshot(dataset_version),input,evaluated_at,policy)
$$;
create function gm18_private.discovery(bundle jsonb,evaluated_at timestamptz) returns jsonb
language sql stable set search_path=pg_catalog,gm18_private as $$
 with dataset as (
   select value from jsonb_array_elements(bundle#>'{entities,datasetVersions}')
   where value->>'datasetVersion'=bundle->>'datasetVersion'
     and gm18_private.sourced(bundle,value,evaluated_at,evaluated_at)
     and not coalesce((value->>'fixtureOnly')::boolean,false)
 ), areas as (
   select value from jsonb_array_elements(bundle#>'{entities,coverageAreas}')
   where gm18_private.sourced(bundle,value,evaluated_at,evaluated_at)
     and value->>'datasetVersion'=bundle->>'datasetVersion'
     and (select count(*) from dataset)=1
     and not coalesce((bundle->>'fixtureOnly')::boolean,true)
     and not coalesce((value->>'fixtureOnly')::boolean,false)
 ), anchors as (
   select a.value from jsonb_array_elements(bundle#>'{entities,publicAnchors}') a join areas c on c.value->>'areaId'=a.value->>'coverageId'
   where gm18_private.sourced(bundle,a.value,evaluated_at,evaluated_at)
     and (a.value->>'isPublic')::boolean and not coalesce((a.value->>'fixtureOnly')::boolean,false)
     and gm18_private.inside_polygon(c.value->'boundary',(a.value->>'lat')::float8,(a.value->>'lng')::float8)
 ) select jsonb_build_object(
   'coverageAreas',(select coalesce(jsonb_agg(jsonb_build_object('id',value->>'areaId','name',value->>'name',
     'adminAreaId',coalesce(value->>'adminAreaId','')) order by value->>'areaId' collate "C"),'[]') from areas),
   'anchors',(select coalesce(jsonb_agg(jsonb_build_object('id',value->>'anchorId','coverageId',value->>'coverageId',
     'name',value->>'name','address',coalesce(value->>'address',''),'lat',value->'lat','lng',value->'lng')
     order by value->>'anchorId' collate "C"),'[]') from anchors),
   'serverTime',to_char(evaluated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
$$;
revoke all on all functions in schema gm18_private from public, anon, authenticated, service_role;
comment on schema gm18_private is 'GM-18.1 independent trusted read kernel; no app access before GM-17 integration';
commit;
