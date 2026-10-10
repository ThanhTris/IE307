#!/usr/bin/env python3
"""GM-08 offline staging and trusted local-admin atomic food import; no remote DB."""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import tomllib
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from gm04_contract_model import FOOD
from validate_field_contracts import load_json, validate_food

CONTRACT = 'food-v1/roadmap-v2/GM-08.1'
SCHEMA = '0.1.0'
CONTAINER = 'supabase_db_gi-cung-duoc-local'
ORDER = ['dataSources', 'taxonomy', 'datasetVersions', 'coverageAreas', 'dishes',
         'venues', 'venueDishes', 'weeklySchedules', 'dateExceptions',
         'availabilityOverrides', 'publicAnchors']
RIGHTS = {'granted', 'licensed', 'public_domain'}


def now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def utc(value):
    if not isinstance(value, str) or not value.endswith('Z'):
        raise ValueError('UTC instant ending Z required')
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.utcoffset() != timedelta(0):
        raise ValueError('UTC instant required')
    return result


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2,
                       allow_nan=False) + '\n').encode('utf-8')


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encode(value))


def snake(value):
    return re.sub(r'(?<!^)(?=[A-Z])', '_', value).lower()


def literal(value):
    # All data are literals; identifiers come exclusively from the frozen mapping.
    return "'" + str(value).replace("'", "''") + "'"


def error(code, path, message):
    return {'code': code, 'path': path, 'message': message}


def in_polygon(lng, lat, polygon):
    def ring_contains(ring):
        inside = False
        for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
            cross = (lng-x1)*(y2-y1) - (lat-y1)*(x2-x1)
            if abs(cross) < 1e-10 and min(x1,x2) <= lng <= max(x1,x2) and min(y1,y2) <= lat <= max(y1,y2):
                return True
            if (y1 > lat) != (y2 > lat) and lng < (x2-x1)*(lat-y1)/(y2-y1)+x1:
                inside = not inside
        return inside
    rings = polygon['coordinates']
    return ring_contains(rings[0]) and not any(ring_contains(r) for r in rings[1:])


def calendar_intervals(rows, exceptions, day):
    override = next((r for r in exceptions if r['localDate'] == day.isoformat()), None)
    if override:
        return [dict(s, lastOrder=override['lastOrder'], lastOrderDayOffset=override['lastOrderDayOffset'])
                for s in override['intervals']] if override['status'] == 'open' else []
    return [r for r in rows if r['dayOfWeek'] == day.isoweekday() and r['status'] == 'open']


def windows(rows, exceptions, day):
    """Half-open local intervals; actual-day closure suppresses previous overnight."""
    override = next((r for r in exceptions if r['localDate'] == day.isoformat()), None)
    if override and override['status'] != 'open':
        return []
    minute = lambda s: int(s[:2])*60 + int(s[3:])
    spans = []
    for previous in (True, False):
        date = day-timedelta(days=1) if previous else day
        for interval in calendar_intervals(rows, exceptions, date):
            shift = -1440 if previous else 0
            start = minute(interval['startTime']) + shift
            end = minute(interval['endTime']) + 1440*interval['endDayOffset'] + shift
            if interval.get('lastOrder') is not None:
                last = minute(interval['lastOrder'])+1440*interval['lastOrderDayOffset']+shift
                if start <= last < end:
                    end = last
            lo, hi = max(0, start), min(1440, end)
            if lo < hi:
                spans.append((lo, hi))
    return spans


def schedule_audit(bundle, as_of):
    """Structural intersection evidence, not eligibility/ranking/live stock."""
    data = bundle['entities']
    venues = {r['id']: r for r in data['venues']}
    report = []
    for offering in data['venueDishes']:
        venue = venues[offering['venueId']]
        local_day = utc(as_of).astimezone(ZoneInfo(venue['timezone'])).date()
        def group(schedule_id):
            return ([r for r in data['weeklySchedules'] if r['scheduleId'] == schedule_id],
                    [r for r in data['dateExceptions'] if r['scheduleId'] == schedule_id])
        vr, ve = group(venue['scheduleId'])
        dr, de = group(offering['scheduleId'])
        intersections = []
        # Weekly coverage plus every explicit exceptional date and its carry-over.
        dates = {local_day + timedelta(days=i) for i in range(8)}
        for e in ve + de:
            d = datetime.fromisoformat(e['localDate']).date()
            dates.update((d, d+timedelta(days=1)))
        for d in sorted(dates):
            spans = sorted(set((max(a,c), min(b,e)) for a,b in windows(vr,ve,d)
                               for c,e in windows(dr,de,d) if max(a,c)<min(b,e)))
            intersections.append({'localDate':d.isoformat(), 'minuteIntervals':[list(s) for s in spans]})
        report.append({'offeringId':offering['offeringId'], 'venueId':venue['id'],
                       'timezone':venue['timezone'], 'intersections':intersections,
                       'unknownHours':any(r['status']=='unknown' for r in vr+dr),
                       'availabilityClaim':'scheduled only; no live stock assertion'})
    return report


def preflight(bundle, as_of, publish=False):
    issues = validate_food(bundle, as_of)
    if issues:
        return {'valid':False, 'errors':issues, 'publicationPerformed':False}
    if bundle['fixtureOnly']:
        issues.append(error('FIXTURE', '$.fixtureOnly', 'Fixtures are never importable through this CLI'))
    data = bundle['entities']
    counts = {name:len(rows) for name,rows in data.items()}
    if len(data['datasetVersions']) != 1:
        issues.append(error('DATASET', '$.entities.datasetVersions', 'Exactly one dataset version required'))
    if publish:
        groups = {}
        for row in data['weeklySchedules']:
            groups.setdefault(row['scheduleId'], set()).add(row['dayOfWeek'])
        if any(days != set(range(1,8)) for days in groups.values()):
            issues.append(error('HOURS', '$.entities.weeklySchedules', 'Each reviewed schedule needs explicit status for all seven days'))
        for name, rows in data.items():
            for index, row in enumerate(rows):
                path = f'$.entities.{name}[{index}]'
                if row['reviewStatus'] not in ('verified','published'):
                    issues.append(error('UNREVIEWED', path+'.reviewStatus', 'Every row must be independently reviewed'))
                if row['checkedAt'] is None or row['validUntil'] is None or (row['validUntil'] and utc(row['validUntil'])<=utc(as_of)):
                    issues.append(error('STALE', path+'.validUntil', 'Every row requires current validity'))
                if not row['reviewedBy'] or not row['reviewedBy'].strip() or row['enteredBy'].strip().casefold() == row['reviewedBy'].strip().casefold():
                    issues.append(error('REVIEW', path+'.reviewedBy', 'Independent named reviewer required'))
                if name == 'dataSources':
                    host = (urlparse(row['locator']).hostname or '').lower()
                    if row['usageRights'] not in RIGHTS or not row['license']:
                        issues.append(error('RIGHTS', path+'.usageRights', 'License/agreement evidence required'))
                    if not host or host.endswith(('.invalid','.test','.localhost')) or host in ('localhost','example.com','example.org','example.net') or any(host.endswith('.'+h) for h in ('example.com','example.org','example.net')):
                        issues.append(error('SOURCE', path+'.locator', 'Real source locator required'))
        for required in ('venues','venueDishes','dishes','weeklySchedules','coverageAreas','publicAnchors'):
            if not data[required]:
                issues.append(error('COVERAGE', '$.entities.'+required, 'Pilot cannot publish without actual records'))
        polygons = [r['boundary'] for r in data['coverageAreas'] if r['boundary']]
        for name, key in (('venues','id'),('publicAnchors','anchorId')):
            for index,row in enumerate(data[name]):
                applicable = polygons if name=='venues' else [r['boundary'] for r in data['coverageAreas'] if r['areaId']==row['coverageId'] and r['boundary']]
                if row['lat'] is not None and not any(in_polygon(row['lng'],row['lat'],p) for p in applicable):
                    issues.append(error('COVERAGE',f'$.entities.{name}[{index}].{key}','Location outside surveyed polygon'))
        required_groups = {'venues':{'address','coordinates','hours'}, 'venueDishes':{'menu','hours'},
                           'weeklySchedules':{'hours'}, 'dateExceptions':{'hours'},
                           'coverageAreas':{'coverage'}, 'publicAnchors':{'coordinates'},
                           'availabilityOverrides':{'availability'}}
        for name, groups in required_groups.items():
            for index,row in enumerate(data[name]):
                if not groups <= set(row['fieldSources']):
                    issues.append(error('PROVENANCE',f'$.entities.{name}[{index}].fieldSources','Missing evidence for '+','.join(sorted(groups-set(row['fieldSources'])))))
    expired_overrides = [r['id'] for r in data['availabilityOverrides'] if utc(r['expiresAt'])<=utc(as_of)]
    if publish and any(utc(r['observedAt'])>utc(as_of) for r in data['availabilityOverrides']):
        issues.append(error('AVAILABILITY_TIME', '$.entities.availabilityOverrides', 'Observation cannot be in the future'))
    schedule = schedule_audit(bundle, as_of)
    if publish:
        for row in schedule:
            if row['unknownHours']:
                issues.append(error('HOURS', '$.entities.weeklySchedules', 'Unknown hours cannot be published'))
            if not any(day['minuteIntervals'] for day in row['intersections']):
                issues.append(error('HOURS', '$.entities.venueDishes', 'No evidenced venue/offering hours intersection'))
    return {'valid':not issues, 'errors':issues, 'publicationPerformed':False,
            'contractVersion':CONTRACT, 'foodContractVersion':bundle['contractVersion'],
            'schemaVersion':SCHEMA, 'datasetVersion':bundle['datasetVersion'], 'rowCounts':counts,
            'timezones':sorted({r['timezone'] for r in data['venues']}),
            'coverageIds':[r['areaId'] for r in data['coverageAreas']],
            'pilotTarget':{'venues':'20–30','dishes':'15–20','quotaMet':20<=counts['venues']<=30 and 15<=counts['dishes']<=20},
            'scheduleAudit':schedule, 'expiredAvailabilityOverrides':expired_overrides,
            'evaluatedAt':as_of}


def stage(input_path, directory, as_of):
    input_path, directory = Path(input_path), Path(directory)
    bundle = load_json(input_path)
    report = preflight(bundle, as_of)
    if not report['valid']:
        return report
    # No overwrite: reviewer must see exactly the bytes bound by this stage.
    directory.mkdir(parents=True, exist_ok=False)
    raw = input_path.read_bytes()
    (directory/'bundle.json').write_bytes(raw)
    manifest = {k:report[k] for k in ('contractVersion','foodContractVersion','schemaVersion',
                                    'datasetVersion','rowCounts','coverageIds','timezones','pilotTarget')}
    manifest.update({'state':'staged', 'fixtureOnly':False,'bundleSha256':digest(raw),
                     'stagedAt':now(), 'validationAt':as_of, 'publicationPerformed':False})
    write_json(directory/'manifest.json', manifest)
    write_json(directory/'preflight.json', report)
    write_json(directory/'review-template.json', {'decision':'Pending','bundleSha256':digest(raw),
        'reviewer':None,'reviewedAt':None,'evidence':[],
        'checks':{k:False for k in ('sourceRights','freshness','coverage','venueOfferingHours',
                                  'priceUnits','imageRights','noPersonalGPS')},
        'coverageShortfallAccepted':False,'coverageShortfallReason':None})
    return manifest


def reviewed(stage_dir, review_path, as_of):
    stage_dir, review_path = Path(stage_dir), Path(review_path)
    manifest = load_json(stage_dir/'manifest.json')
    raw = (stage_dir/'bundle.json').read_bytes()
    sha = digest(raw)
    if manifest.get('state') != 'staged' or manifest.get('bundleSha256') != sha:
        raise ValueError('STAGE_HASH: staged bundle changed')
    bundle = load_json(stage_dir/'bundle.json')
    review = load_json(review_path)
    if review.get('decision') != 'Approved' or review.get('bundleSha256') != sha:
        raise ValueError('REVIEW_HASH: independent approval must bind exact staged bytes')
    reviewer = review.get('reviewer')
    if not isinstance(reviewer,str) or not reviewer.strip() or utc(review['reviewedAt'])>utc(as_of):
        raise ValueError('REVIEW: named reviewer and non-future review time required')
    if utc(review['reviewedAt']) < utc(manifest['stagedAt']):
        raise ValueError('REVIEW: approval predates this stage')
    checks = ('sourceRights','freshness','coverage','venueOfferingHours','priceUnits','imageRights','noPersonalGPS')
    if any(review.get('checks',{}).get(k) is not True for k in checks):
        raise ValueError('REVIEW: all human review checks must be explicitly affirmed')
    if not review.get('evidence'):
        raise ValueError('REVIEW: independent evidence files required')
    for entry in review['evidence']:
        relative = Path(entry['path'])
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('REVIEW: evidence path must stay within review directory')
        evidence = (review_path.parent/relative).resolve()
        if not evidence.is_relative_to(review_path.parent.resolve()) or digest(evidence.read_bytes()) != entry['sha256']:
            raise ValueError('REVIEW: evidence hash/path mismatch')
    identity = lambda value: value.strip().casefold() if isinstance(value,str) else None
    for rows in bundle['entities'].values():
        if any(identity(r['reviewedBy']) != identity(reviewer) or identity(r['enteredBy']) == identity(reviewer) for r in rows):
            raise ValueError('REVIEW: row reviewer must match independent bundle reviewer')
    before_publish = preflight(bundle, as_of, publish=True)
    if not before_publish['valid']:
        raise ValueError('PUBLISH_PREFLIGHT: '+json.dumps(before_publish['errors'],ensure_ascii=False))
    published = deepcopy(bundle)
    for rows in published['entities'].values():
        for row in rows:
            row['reviewStatus'] = 'published'
            if row.get('status') in ('verified','published'):
                row['status'] = 'published'
    # Content checksum is the exact reviewed INPUT bytes, not a self-referential
    # hash of this metadata-enriched publish representation.
    for row in published['entities']['datasetVersions']:
        row.update(checksum=sha, artifactLocator=str((stage_dir/'bundle.json').resolve()),
                   rollbackLocator='gm08_private.import_receipts:'+sha,
                   qualityReport=str((stage_dir/'preflight.json').resolve()))
    report = preflight(published, as_of, publish=True)
    if not report['valid']:
        raise ValueError('PUBLISH_PREFLIGHT: '+json.dumps(report['errors'],ensure_ascii=False))
    if not report['pilotTarget']['quotaMet'] and review.get('coverageShortfallAccepted') is not True:
        raise ValueError('REVIEW: pilot quota shortfall must be explicitly accepted and documented')
    if not report['pilotTarget']['quotaMet'] and not str(review.get('coverageShortfallReason','')).strip():
        raise ValueError('REVIEW: document the actual coverage shortfall')
    if report['rowCounts'] != manifest['rowCounts'] or report['datasetVersion'] != manifest['datasetVersion']:
        raise ValueError('STAGE_MANIFEST: content/manifest differs')
    if digest((stage_dir/'bundle.json').read_bytes()) != sha:
        raise ValueError('STAGE_HASH: staged input changed during preflight')
    return published, sha, digest(review_path.read_bytes()), report


def mapping():
    fields = load_json(ROOT/'docs/data/database-mapping.json')['fields']
    tables = {}
    for entity in ORDER:
        definitions = FOOD[entity]
        columns = [snake(k) for k in definitions['fields']] + ['fixture_only']
        for key in definitions['fields']:
            f = next(f for f in fields if f['contract']=='food' and f['path']==entity+'.'+key)
            if f['target'].split(' → ')[0] != snake(entity)+'.'+snake(key):
                raise ValueError('Frozen mapping differs; importer must be reviewed')
        tables[snake(entity)] = (snake(definitions['primaryKey']), columns)
    tables = {'schedule_groups':('schedule_id',['schedule_id','owner_type','owner_id',
                  'timezone','review_status','fixture_only','version']), **tables}
    return tables


def records(bundle):
    data = {}
    groups = {}
    for row in bundle['entities']['weeklySchedules']:
        item = {snake(k):row[k] for k in ('scheduleId','ownerType','ownerId','timezone','reviewStatus')}
        item.update(version=1,fixture_only=bundle['fixtureOnly'])
        if row['scheduleId'] in groups and groups[row['scheduleId']] != item:
            raise ValueError('Conflicting group binding')
        groups[row['scheduleId']] = item
    data['schedule_groups'] = list(groups.values())
    for entity in ORDER:
        data[snake(entity)] = [dict({snake(k):v for k,v in row.items()}, fixture_only=bundle['fixtureOnly'])
                              for row in bundle['entities'][entity]]
    return data


def sql_prelude():
    """Temporary functions only, always inside guarded admin transaction."""
    tables = mapping()
    table_names = ','.join('public.'+name for name in tables)
    definition = {name:{'key':key,'columns':cols} for name,(key,cols) in tables.items()}
    return '''begin;
set local timezone='UTC';
set local standard_conforming_strings=on;
set local lock_timeout='10s';
set local statement_timeout='90s';
select pg_advisory_xact_lock(3070008);
''' + f'lock table {table_names} in share row exclusive mode;\n' + '''
do $$begin
 if not exists(select 1 from public.schema_versions where schema_version='0.1.0' and food_contract_version='1.1.0') then
  raise exception using errcode='23514',message='GM08_SCHEMA_VERSION';
 end if;
end$$;
create function pg_temp.gm08_spec(t text) returns jsonb language sql immutable as $f$
 select ''' + literal(json.dumps(definition)) + '''::jsonb -> t
$f$;
create function pg_temp.gm08_row(t text, k text) returns jsonb language plpgsql as $f$
declare result jsonb; spec jsonb; projection text;
begin
 spec:=pg_temp.gm08_spec(t);
 if spec is null then raise exception 'GM08_TABLE'; end if;
 select string_agg(format('%L,to_jsonb(r.%I)',c,c),',') into projection from jsonb_array_elements_text(spec->'columns') c;
 execute format('select jsonb_build_object(%s) from public.%I r where %I=$1::uuid',projection,t,spec->>'key') into result using k;
 return result;
end$f$;
create function pg_temp.gm08_put(t text, payload jsonb) returns void language plpgsql as $f$
declare spec jsonb; cols text; updates text; current_row jsonb; normalized jsonb; k text;
begin
 spec:=pg_temp.gm08_spec(t);
 if spec is null then raise exception 'GM08_TABLE'; end if;
 k:=payload->>(spec->>'key');
 current_row:=pg_temp.gm08_row(t,k);
 if t='schedule_groups' and current_row is not null then
  payload:=jsonb_set(payload,'{version}',current_row->'version');
  if (payload-'version')<>(current_row-'version') then
   payload:=jsonb_set(payload,'{version}',to_jsonb((current_row->>'version')::bigint+1));
  end if;
 end if;
 -- Normalize timestamptz/numeric/array values through the real PostgreSQL types.
 select string_agg(format('%I',c),',') into cols from jsonb_array_elements_text(spec->'columns') c;
 execute format('select to_jsonb(x) from (select %s from jsonb_populate_record(null::public.%I,$1)) x',cols,t) into normalized using payload;
 if current_row=normalized then return; end if;
 if current_row is not null and (normalized->>'version')::bigint <= (current_row->>'version')::bigint then
  raise exception using errcode='23514',message='GM08_VERSION_CONFLICT';
 end if;
 select string_agg(format('%I=excluded.%I',c,c),',') into updates from jsonb_array_elements_text(spec->'columns') c where c<>spec->>'key';
 execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) on conflict(%I) do update set %s',t,cols,cols,t,spec->>'key',updates) using normalized;
end$f$;
create function pg_temp.gm08_matches(expected jsonb) returns boolean language plpgsql as $f$
declare tbl record; r record;
begin
 for tbl in select * from jsonb_each(expected) loop
  for r in select * from jsonb_each(tbl.value) loop
   if pg_temp.gm08_row(tbl.key,r.key) is distinct from r.value then return false; end if;
  end loop;
 end loop;
 return true;
end$f$;
'''


def publish_sql(bundle, sha, review_sha, check_clock=True):
    incoming = records(bundle)
    input_sql = f'''create temp table gm08_input(payload jsonb, sha text, version_name text, review_sha text) on commit drop;
insert into gm08_input values({literal(json.dumps(incoming,ensure_ascii=False))}::jsonb,{literal(sha)},
 {literal(bundle['datasetVersion'])},{literal(review_sha)});
'''
    return sql_prelude() + input_sql + 'do $body$\ndeclare\n' + f'''payload jsonb := (select i.payload from gm08_input i);
sha text := (select i.sha from gm08_input i);
version_name text := (select i.version_name from gm08_input i);
review_sha text := (select i.review_sha from gm08_input i);
receipt gm08_private.import_receipts%rowtype;
before_values jsonb := '{{}}'; after_values jsonb := '{{}}';
tbl record; row_value jsonb; k text; prior jsonb;
begin
 select * into receipt from gm08_private.import_receipts where bundle_sha256=sha;
 if found then
  if receipt.state<>'published' or receipt.review_sha256<>review_sha or not pg_temp.gm08_matches(receipt.after_rows) then
   raise exception using errcode='23514',message='GM08_RECEIPT_DRIFT';
  end if;
  return;
 end if;
 if exists(select 1 from gm08_private.import_receipts where dataset_version=version_name) then
  raise exception using errcode='23505',message='GM08_DATASET_VERSION_CONFLICT';
 end if;
 for tbl in select unnest(ARRAY[{','.join(literal(t) for t in mapping())}]) as name loop
  before_values := before_values || jsonb_build_object(tbl.name,'{{}}'::jsonb);
  for row_value in select value from jsonb_array_elements(payload->tbl.name) loop
   k := row_value->>(pg_temp.gm08_spec(tbl.name)->>'key');
   prior := pg_temp.gm08_row(tbl.name,k);
   before_values := jsonb_set(before_values,ARRAY[tbl.name,k],coalesce(prior,'null'::jsonb));
   perform pg_temp.gm08_put(tbl.name,row_value);
  end loop;
 end loop;
 set constraints all immediate;
 for tbl in select * from jsonb_each(before_values) loop
  after_values := after_values || jsonb_build_object(tbl.key,'{{}}'::jsonb);
  for k in select jsonb_object_keys(tbl.value) loop
   prior := pg_temp.gm08_row(tbl.key,k);
''' + ('''   if prior->>'review_status'='published' and (
    (prior->>'valid_until')::timestamptz <= clock_timestamp() or
    (prior->>'checked_at')::timestamptz > clock_timestamp()) then
     raise exception using errcode='23514',message='GM08_EXPIRED_AT_COMMIT';
   end if;
''' if check_clock else '') + f'''
   after_values := jsonb_set(after_values,ARRAY[tbl.key,k],prior);
  end loop;
 end loop;
 insert into gm08_private.import_receipts(bundle_sha256,dataset_version,review_sha256,state,before_rows,after_rows)
 values(sha,version_name,review_sha,'published',before_values,after_values);
end$body$;
commit;
select json_build_object('state',state,'datasetVersion',dataset_version,'bundleSha256',bundle_sha256,
 'publicationPerformed',true) from gm08_private.import_receipts where bundle_sha256={literal(sha)};
'''


def rollback_sql(sha):
    return sql_prelude() + f'''do $body$
declare receipt gm08_private.import_receipts%rowtype; tbl record; r record; current_row jsonb; restored jsonb; spec jsonb;
begin
 select * into receipt from gm08_private.import_receipts where bundle_sha256={literal(sha)} for update;
 if not found then raise exception using errcode='23514',message='GM08_RECEIPT_MISSING'; end if;
 if receipt.state='rolled_back' then return; end if;
 if exists(select 1 from gm08_private.import_receipts where state='published' and published_at>receipt.published_at) then
  raise exception using errcode='23514',message='GM08_ROLLBACK_LATER_IMPORT';
 end if;
 if not pg_temp.gm08_matches(receipt.after_rows) then
  raise exception using errcode='23514',message='GM08_ROLLBACK_DRIFT';
 end if;
 for tbl in select * from jsonb_each(receipt.before_rows) loop
  spec:=pg_temp.gm08_spec(tbl.key);
  for r in select * from jsonb_each(tbl.value) loop
   current_row:=pg_temp.gm08_row(tbl.key,r.key);
   if r.value='null'::jsonb then
    execute format('delete from public.%I where %I=$1::uuid',tbl.key,spec->>'key') using r.key;
   else
    if current_row=r.value then continue; end if;
    restored:=jsonb_set(r.value,'{{version}}',to_jsonb((current_row->>'version')::bigint+1));
    perform pg_temp.gm08_put(tbl.key,restored);
   end if;
  end loop;
 end loop;
 set constraints all immediate;
 update gm08_private.import_receipts set state='rolled_back',rolled_back_at=clock_timestamp() where bundle_sha256={literal(sha)};
end$body$;
commit;
select json_build_object('state',state,'datasetVersion',dataset_version,'bundleSha256',bundle_sha256,
 'publicationPerformed',false) from gm08_private.import_receipts where bundle_sha256={literal(sha)};
'''


class LocalDB:
    def __init__(self, database='postgres'):
        if database!='postgres' and not re.fullmatch(r'gm08_check_[0-9a-f]{16}',database):
            raise ValueError('Process-created disposable test DB or local postgres only')
        self.database = database
        config = tomllib.loads((ROOT/'supabase/config.toml').read_text(encoding='utf-8'))
        if config.get('project_id')!='gi-cung-duoc-local' or config['db'].get('major_version')!=17 or config['db']['port']!=54322 or config['api']['port']!=54321:
            raise ValueError('Reviewed GM-03 config required')
        endpoint = self.run(['docker','context','inspect','--format','{{.Endpoints.docker.Host}}']).strip()
        override = os.environ.get('DOCKER_HOST','')
        if not endpoint.startswith(('unix://','npipe://')) or (override and not override.startswith(('unix://','npipe://'))):
            raise ValueError('Local Docker socket only')
        info = load_container(self.run(['docker','inspect',CONTAINER]))
        if info['Name']!='/'+CONTAINER or not info['State']['Running'] or not info['Config']['Image'].startswith(('public.ecr.aws/supabase/postgres:17','ghcr.io/supabase/postgres:17','supabase/postgres:17')):
            raise ValueError('Reviewed local Supabase PostgreSQL17 container required')
        if not self.psql("select current_setting('server_version');").strip().startswith('17.'):
            raise ValueError('PostgreSQL17 required')

    @staticmethod
    def run(args, sql=None):
        result = subprocess.run(args,input=sql,text=True,encoding='utf-8',capture_output=True,timeout=180)
        if result.returncode:
            # Do not print SQL context/payload containing dataset/provider data.
            code = re.search(r'ERROR:\s+([0-9A-Z]{5})(?:[:\s]|$)', result.stderr)
            message = re.search(r'GM08_[A-Z_]+', result.stderr)
            raise RuntimeError('DB_ERROR '+(code.group(1) if code else 'PROCESS')+' '+(message.group(0) if message else 'statement rejected; transaction rolled back'))
        return result.stdout

    def psql(self, sql):
        return self.run(['docker','exec','-i',CONTAINER,'psql','-X','-q','-U','postgres',
                         '-d',self.database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-At'],sql)

    def transaction(self, sql):
        for attempt in range(3):
            try:
                return self.psql(sql)
            except RuntimeError as exc:
                if not any(state in str(exc) for state in ('40001','40P01')) or attempt==2:
                    raise
                time.sleep(.1*(attempt+1))


def load_container(raw):
    return json.loads(raw)[0]


def query_sql(sha):
    # Only rows bound by the verified receipt; never an unscoped catalogue query.
    return sql_prelude() + f'''do $q$
declare receipt gm08_private.import_receipts%rowtype; tbl record; r record;
begin
 select * into receipt from gm08_private.import_receipts where bundle_sha256={literal(sha)};
 if not found or receipt.state<>'published' or not pg_temp.gm08_matches(receipt.after_rows) then
  raise exception using errcode='23514',message='GM08_QUERY_RECEIPT_DRIFT';
 end if;
 for tbl in select * from jsonb_each(receipt.after_rows) loop
  for r in select * from jsonb_each(tbl.value) loop
   if r.value->>'review_status'='published' and
       (r.value->>'valid_until')::timestamptz <= clock_timestamp() then
    raise exception using errcode='23514',message='GM08_QUERY_EXPIRED';
   end if;
  end loop;
 end loop;
end$q$;
select jsonb_build_object('datasetVersion',r.dataset_version,'state',r.state,
 'offeringCount',(select count(*) from public.venue_dishes o
   where r.after_rows->'venue_dishes' ? o.offering_id::text and o.review_status='published'),
 'offerings',coalesce((select jsonb_agg(jsonb_build_object('offeringId',o.offering_id,'dish',d.name,
   'venue',v.branch_name,'priceMin',o.price_min,'priceMax',o.price_max,'unit',o.unit,
   'currency',o.currency,'scheduleId',o.schedule_id,'timezone',v.timezone))
   from public.venue_dishes o join public.dishes d on d.id=o.dish_id join public.venues v on v.id=o.venue_id
   where r.after_rows->'venue_dishes' ? o.offering_id::text and o.review_status='published'),'[]'::jsonb))
 from gm08_private.import_receipts r where bundle_sha256={literal(sha)} and state='published';
commit;'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command',required=True)
    validate = sub.add_parser('validate',help='Offline preflight; no DB/network')
    validate.add_argument('--input',type=Path,required=True)
    validate.add_argument('--as-of',default=None)
    validate.add_argument('--publish-ready',action='store_true')
    staging = sub.add_parser('stage',help='New immutable staging directory; no DB')
    staging.add_argument('--input',type=Path,required=True)
    staging.add_argument('--output',type=Path,required=True)
    staging.add_argument('--as-of',default=None)
    publish = sub.add_parser('publish',help='Independent approved review required; local admin only')
    publish.add_argument('--stage',type=Path,required=True)
    publish.add_argument('--review',type=Path,required=True)
    publish.add_argument('--confirm-local',action='store_true',required=True)
    rollback = sub.add_parser('rollback',help='Refuse drift/later imports/FKs; local only')
    rollback.add_argument('--bundle-sha256',required=True)
    rollback.add_argument('--confirm-local',action='store_true',required=True)
    query = sub.add_parser('query',help='Read receipt-bound published offerings; admin local')
    query.add_argument('--bundle-sha256',required=True)
    for item in (validate,staging,publish,rollback,query):
        item.add_argument('--report',type=Path)
    args = parser.parse_args()
    if getattr(args,'bundle_sha256',None) and not re.fullmatch(r'[0-9a-f]{64}',args.bundle_sha256):
        parser.error('SHA256 must be 64 lowercase hex characters')
    try:
        report = dispatch(args)
    except (ValueError, KeyError, OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        uncertain = isinstance(exc, subprocess.TimeoutExpired) or (isinstance(exc,RuntimeError) and 'DB_ERROR PROCESS' in str(exc))
        report = {'valid': False, 'publicationPerformed': None if uncertain else False, 'error': str(exc)}
        if uncertain:
            report['recovery'] = 'Inspect the import receipt before retrying; process failure does not prove rollback'
    if args.report:
        write_json(args.report,report)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 1 if report.get('valid') is False else 0


def dispatch(args):
    if args.command=='validate':
        report = preflight(load_json(args.input), args.as_of or now(), args.publish_ready)
    elif args.command=='stage':
        report = stage(args.input,args.output,args.as_of or now())
    elif args.command=='publish':
        bundle, sha, review_sha, pre = reviewed(args.stage,args.review,now())
        result = LocalDB().transaction(publish_sql(bundle,sha,review_sha))
        report = json.loads(result.splitlines()[-1])
        report.update(rowCounts=pre['rowCounts'],schemaVersion=SCHEMA,foodContractVersion='1.1.0')
    elif args.command=='rollback':
        report = json.loads(LocalDB().transaction(rollback_sql(args.bundle_sha256)).splitlines()[-1])
    else:
        output = LocalDB().psql(query_sql(args.bundle_sha256)).strip()
        if not output:
            raise ValueError('No active published receipt')
        report = json.loads(output)
        report['eligibilityPerformed'] = False
    return report


if __name__=='__main__':
    try:
        sys.exit(main())
    except (ValueError,KeyError,OSError,RuntimeError,subprocess.TimeoutExpired) as exc:
        # Reject details identify fields/stages, never credentials or SQL text.
        print(json.dumps({'valid':False,'publicationPerformed':None,'error':str(exc),
                         'recovery':'Inspect receipt if publish/rollback was attempted'},ensure_ascii=False),file=sys.stderr)
        sys.exit(1)
