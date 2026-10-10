"""Draft GM-03 interchange validation. No database import or publication."""
from __future__ import annotations
import argparse
import csv
from datetime import date, datetime, timezone
import json
import math
from pathlib import Path
import re
import uuid
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from base_catalogue import stable_id

BASE=Path(__file__).resolve().parents[1]
SCHEMA=json.loads((BASE/'config/data_contract_v1.json').read_text(encoding='utf-8'))
ENTITIES=SCHEMA['entities']
csv.field_size_limit(16*1024*1024)
JSON_TYPES={'stringArray','uuidArray','object','flavor','artwork','profile','intervals','geojson'}

class ContractError(ValueError):
    pass

def utc(value):
    if not isinstance(value,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z',value):
        raise ValueError('UTC timestamp must end with Z')
    return datetime.fromisoformat(value[:-1]+'+00:00')

def valid_uuid(value):
    return isinstance(value,str) and str(uuid.UUID(value))==value

def interval(value):
    required={'startTime','endTime','endDayOffset','is24Hours'}
    if not isinstance(value,dict) or set(value)!=required:raise ValueError('Interval fields mismatch')
    for key in ['startTime','endTime']:
        if not isinstance(value[key],str) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',value[key]):raise ValueError('Invalid local HH:mm')
    offset=value['endDayOffset']
    if type(offset) is not int or offset not in [0,1] or type(value['is24Hours']) is not bool:raise ValueError('Invalid offset/24h')
    start=int(value['startTime'][:2])*60+int(value['startTime'][3:])
    end=int(value['endTime'][:2])*60+int(value['endTime'][3:])+offset*1440
    if not 0 < end-start <= 1440:raise ValueError('Interval must be positive and <=24h')
    if value['is24Hours'] != (end-start==1440):raise ValueError('24h flag and duration mismatch')

def flavor(value):
    if not isinstance(value,dict) or set(value)!={'spicy','salty','sweet','sour'}:raise ValueError('Four flavor kinds required')
    for part in value.values():
        if not isinstance(part,dict) or set(part)!={'present','intensity'}:raise ValueError('Flavor fields mismatch')
        p=part['present'];i=part['intensity']
        if p is not None and type(p) is not bool:raise ValueError('Flavor present requires boolean/null')
        if i not in ['none','low','medium','high','unknown']:raise ValueError('Invalid intensity')
        if (p is None and i!='unknown') or (p is False and i!='none') or (p is True and i=='none'):raise ValueError('Inconsistent presence/intensity')

def artwork(value):
    if not isinstance(value,dict) or set(value)!={'url','sourceRef','usageRights','license','attribution'}:raise ValueError('Artwork fields mismatch')
    if not isinstance(value['url'],str) or not value['url'].startswith(('https://','http://')):raise ValueError('Artwork URL required')
    if value['sourceRef'] is not None and not valid_uuid(value['sourceRef']):raise ValueError('Artwork source UUID invalid')
    if value['usageRights'] not in ['unknown','granted','licensed','public_domain','denied']:raise ValueError('Unknown artwork rights enum')
    for key in ['license','attribution']:
        if value[key] is not None and (not isinstance(value[key],str) or not value[key].strip()):raise ValueError('Artwork text must be string/null')

def profile(value):
    fields={k:v for k,v in ENTITIES['dishes']['fields'].items() if k in ['cuisineIds','categoryIds','mealSlots','timeHints','temperature','flavor','origin']}
    if not isinstance(value,dict) or not value or set(value)-set(fields):raise ValueError('Invalid profile override fields')
    for key,val in value.items():check_value(val,fields[key])

def polygon(value):
    if not isinstance(value,dict) or set(value)!={'type','coordinates'} or value['type']!='Polygon':raise ValueError('GeoJSON Polygon required')
    rings=value['coordinates']
    if not isinstance(rings,list) or not rings:raise ValueError('Empty polygon')
    for ring in rings:
        if not isinstance(ring,list) or len(ring)<4 or ring[0]!=ring[-1]:raise ValueError('Closed ring with >=4 positions required')
        for point in ring:
            if not isinstance(point,list) or len(point)!=2 or any(type(x) not in [int,float] or not math.isfinite(x) for x in point) or not -180<=point[0]<=180 or not -90<=point[1]<=90:raise ValueError('Invalid [lng,lat] position')

def check_value(value,field):
    if value is None:
        if not field['nullable']:raise ValueError('Required non-null field')
        return
    t=field['type']
    if t=='uuid':
        if not valid_uuid(value):raise ValueError('Canonical UUID required')
    elif t=='integer':
        if type(value) is not int:raise ValueError('Integer required (boolean not allowed)')
    elif t=='number':
        if type(value) not in [int,float] or not math.isfinite(value):raise ValueError('Finite number required')
    elif t=='boolean':
        if type(value) is not bool:raise ValueError('Boolean required')
    elif t in ['string','enum']:
        if not isinstance(value,str) or not value.strip():raise ValueError('Nonempty string required')
        if t=='enum' and value not in field['values']:raise ValueError('Value outside enum')
    elif t in ['stringArray','uuidArray']:
        if not isinstance(value,list) or any(not isinstance(x,str) or not x.strip() for x in value):raise ValueError('Array of nonempty strings required')
        if len(set(value))!=len(value):raise ValueError('Duplicate array values')
        if t=='uuidArray' and any(not valid_uuid(x) for x in value):raise ValueError('UUID array required')
        if 'values' in field and any(x not in field['values'] for x in value):raise ValueError('Array value outside enum')
    elif t=='utc':utc(value)
    elif t=='date':
        if not isinstance(value,str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',value):raise ValueError('YYYY-MM-DD required')
        date.fromisoformat(value)
    elif t=='time':
        if not isinstance(value,str) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',value):raise ValueError('HH:mm required')
    elif t=='timezone':
        if not isinstance(value,str):raise ValueError('IANA timezone required')
        ZoneInfo(value)
    elif t=='semver':
        if not isinstance(value,str) or not re.fullmatch(r'(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)',value):raise ValueError('SemVer MAJOR.MINOR.PATCH required')
    elif t=='sha256':
        if not isinstance(value,str) or not re.fullmatch('[0-9a-f]{64}',value):raise ValueError('SHA-256 required')
    elif t=='object':
        if not isinstance(value,dict):raise ValueError('Object required')
        if any(not isinstance(k,str) or not isinstance(v,str) or not valid_uuid(v) for k,v in value.items()):raise ValueError('Source map requires group → UUID')
    elif t=='flavor':flavor(value)
    elif t=='artwork':artwork(value)
    elif t=='profile':profile(value)
    elif t=='intervals':
        if not isinstance(value,list):raise ValueError('Intervals array required')
        for x in value:interval(x)
    elif t=='geojson':polygon(value)
    else:raise ValueError(f'Unknown field type {t}')
    if t in ['integer','number']:
        if 'min' in field and value<field['min']:raise ValueError('Below minimum')
        if 'max' in field and value>field['max']:raise ValueError('Above maximum')


def validate(bundle, as_of=None):
    errors=[];as_of=as_of or datetime.now(timezone.utc)
    def err(entity,row,field,message):errors.append({'entity':entity,'row':row,'field':field,'message':message})
    if not isinstance(bundle,dict):return [{'entity':'bundle','row':0,'field':'root','message':'Object required'}]
    expected={'contractVersion','datasetVersion','fixtureOnly','entities'}
    if set(bundle)!=expected:err('bundle',0,'root','Unknown or missing bundle keys')
    if bundle.get('contractVersion')!=SCHEMA['contractVersion']:err('bundle',0,'contractVersion','Unsupported contract version')
    try:check_value(bundle.get('datasetVersion'),{'type':'semver','nullable':False})
    except ValueError as e:err('bundle',0,'datasetVersion',str(e))
    if type(bundle.get('fixtureOnly')) is not bool:err('bundle',0,'fixtureOnly','Boolean required')
    data=bundle.get('entities')
    if not isinstance(data,dict):return errors+[{'entity':'bundle','row':0,'field':'entities','message':'Object required'}]
    if set(data)!=set(ENTITIES):err('bundle',0,'entities','All entity arrays required; empty arrays allowed')
    valid_rows={}
    for name,definition in ENTITIES.items():
        rows=data.get(name)
        if not isinstance(rows,list):err(name,0,'root','Entity array required');continue
        seen=set();valid_rows[name]=[]
        for number,row in enumerate(rows,1):
            if not isinstance(row,dict):err(name,number,'root','Row object required');continue
            fields=definition['fields'];bad=False
            if set(row)!=set(fields):err(name,number,'root','Missing/extra fields');bad=True
            for key,field in fields.items():
                try:check_value(row.get(key),field)
                except (ValueError,TypeError,KeyError,ZoneInfoNotFoundError) as e:err(name,number,key,str(e));bad=True
            pk=row.get(definition['primaryKey'])
            if isinstance(pk,str):
                if pk in seen:err(name,number,definition['primaryKey'],'Duplicate ID')
                seen.add(pk)
            if not bad:valid_rows[name].append((number,row))
    indexes={}
    for name,definition in ENTITIES.items():
        for key in [definition['primaryKey']]+(['scheduleId'] if name=='weeklySchedules' else []):
            indexes[(name,key)]={r[key]:r for _,r in valid_rows.get(name,[])}
    sources=indexes.get(('dataSources','sourceRef'),{})
    def ref(name,num,key,value,target,target_key=None):
        if value is not None:
            try: good=valid_uuid(value)
            except (ValueError,TypeError,AttributeError):good=False
            if not good or value not in indexes.get((target,target_key or ENTITIES[target]['primaryKey']),{}):err(name,num,key,f'Missing/invalid reference to {target}')
    for name,rows in valid_rows.items():
        seen_offerings=set();seen_exceptions=set()
        for number,row in rows:
            for key,field in ENTITIES[name]['fields'].items():
                if 'ref' in field:
                    values=row[key] if field['type']=='uuidArray' else [row[key]]
                    for value in values:ref(name,number,key,value,field['ref'],field.get('refKey'))
            allowed_source_groups={'name','description','taxonomy','image','menu','price','coordinates','address','hours','availability','coverage'}
            for key,value in row['fieldSources'].items():
                if key not in allowed_source_groups:err(name,number,'fieldSources','Unknown source group')
                ref(name,number,'fieldSources',value,'dataSources')
                if value is None:err(name,number,'fieldSources','Omit missing source key instead of null')
            checked=row['checkedAt'];expiry=row['validUntil']
            if checked and utc(checked)>as_of:err(name,number,'checkedAt','Verification cannot be in the future')
            if checked and expiry and utc(expiry)<=utc(checked):err(name,number,'validUntil','Must be later than checkedAt')
            reviewed=row['reviewStatus'] in ['verified','published']
            if row.get('status') in ['draft','verified','published'] and row['status']!=row['reviewStatus']:err(name,number,'status','Must agree with reviewStatus')
            if row['reviewedBy']==row['enteredBy']:err(name,number,'reviewedBy','Independent reviewer required')
            if reviewed:
                for key in ['checkedAt','validUntil','reviewedBy']:
                    if row[key] is None:err(name,number,key,'Required for verified/published')
                if name!='dataSources' and row['sourceRef'] is None:err(name,number,'sourceRef','Reviewed data needs source')
                if expiry and utc(expiry)<=as_of:err(name,number,'validUntil','Reviewed data is expired')
            if row['reviewStatus']=='published':
                for key,field in ENTITIES[name]['fields'].items():
                    if 'ref' not in field or row[key] is None:continue
                    values=row[key] if field['type']=='uuidArray' else [row[key]]
                    for value in values:
                        target=indexes.get((field['ref'],field.get('refKey',ENTITIES[field['ref']]['primaryKey'])),{}).get(value)
                        if target and (target['reviewStatus'] not in ['verified','published'] or not target['validUntil'] or utc(target['validUntil'])<=as_of):err(name,number,key,'Published data references draft/expired child')
                if bundle.get('fixtureOnly'):err(name,number,'reviewStatus','Fixtures cannot publish')
                relevant={row.get('sourceRef'),*row['fieldSources'].values()}
                if name=='dataSources':relevant.add(row['sourceRef'])
                for source_id in relevant-{None}:
                    s=sources.get(source_id)
                    if s and (s['usageRights'] not in ['granted','licensed','public_domain'] or s['reviewStatus'] not in ['verified','published'] or not s['validUntil'] or utc(s['validUntil'])<=as_of):err(name,number,'sourceRef','Publish requires reviewed, unexpired source with usage rights')
            art=row.get('artwork')
            if art:
                ref(name,number,'artwork.sourceRef',art['sourceRef'],'dataSources')
                if row['reviewStatus']=='published':
                    s=sources.get(art['sourceRef'])
                    if art['usageRights'] not in ['granted','licensed','public_domain'] or not art['license'] or not s or s['usageRights'] not in ['granted','licensed','public_domain'] or s['reviewStatus'] not in ['verified','published'] or not s['validUntil'] or utc(s['validUntil'])<=as_of:err(name,number,'artwork','Image rights/source/license required to publish')
            if name=='taxonomy':
                codebook=json.loads((BASE/'config/taxonomy_v1.json').read_text(encoding='utf-8'))
                allowed=set(codebook['cuisines']) if row['type']=='cuisine' else set(codebook['origins']) if row['type']=='origin' else {f'{g}:{k}' for g,labels in codebook['categoryGroups'].items() for k in labels}
                if row['code'] not in allowed:err(name,number,'code','Code not in taxonomy_v1')
            if name=='dataSources' and row['usageRights'] in ['granted','licensed','public_domain'] and not row['license']:err(name,number,'license','Rights require license/agreement record')
            if name in ['dishes','venueDishes']:
                profile_row=row if name=='dishes' else row['profileOverrides'] or {}
                for key,kind in [('cuisineIds','cuisine'),('categoryIds','category')]:
                    for taxonomy_id in profile_row.get(key,[]):
                        ref(name,number,key,taxonomy_id,'taxonomy')
                        tax=indexes.get(('taxonomy','id'),{}).get(taxonomy_id)
                        if tax and tax['type']!=kind:err(name,number,key,'Taxonomy type mismatch')
            if name=='dishes' and reviewed and (row['classificationStatus']!='reviewed' or not row['mealSlots'] or not row['categoryIds'] or not row['cuisineIds']):err(name,number,'classificationStatus','Reviewed dishes need reviewed classification, category/cuisine/meal slots')
            if name=='venues':
                if (row['lat'] is None)!=(row['lng'] is None):err(name,number,'lat','Coordinates must be a pair')
                if reviewed and any(row[k] is None for k in ['address','adminAreaId','lat','lng']):err(name,number,'address','Reviewed venue needs address/admin area/coordinates')
                if row['reviewStatus']=='published' and (row['status']!='active' or not row['serviceModes']):err(name,number,'status','Published venue must be active with service evidence')
            if name=='venueDishes':
                lo,hi=row['priceMin'],row['priceMax']
                if lo is not None or hi is not None:
                    if lo is not None and hi is not None and lo>hi:err(name,number,'priceMax','min > max')
                    if row['unit'] is None or row['currency'] is None:err(name,number,'unit','Known price requires unit and currency')
                    if reviewed and 'price' not in row['fieldSources']:err(name,number,'fieldSources','Reviewed price needs price source')
                key=(row['venueId'],row['dishId'],row['variant'],row['serviceMode'])
                if key in seen_offerings:err(name,number,'offeringId','Duplicate branch/dish/variant/serviceMode')
                seen_offerings.add(key)
                v=indexes.get(('venues','id'),{}).get(row['venueId'])
                if v and row['serviceMode'] and row['serviceMode'] not in v['serviceModes']:err(name,number,'serviceMode','Not evidenced at venue')
                schedules=[r for _,r in valid_rows.get('weeklySchedules',[]) if r['scheduleId']==row['scheduleId']]
                if schedules and any(r['ownerType']!='offering' or r['ownerId']!=row['offeringId'] for r in schedules):err(name,number,'scheduleId','Offering schedule belongs to another owner')
                if reviewed and any(row[k] is None for k in ['menuSource','scheduleId','serviceMode']):err(name,number,'scheduleId','Reviewed offering requires menu/service/schedule')
            if name=='weeklySchedules':
                target='venues' if row['ownerType']=='venue' else 'venueDishes'
                ref(name,number,'ownerId',row['ownerId'],target)
                if row['status']=='open':
                    try:interval({k:row[k] for k in ['startTime','endTime','endDayOffset','is24Hours']})
                    except (ValueError,TypeError) as e:err(name,number,'startTime',str(e))
                elif any(row[k] is not None for k in ['startTime','endTime','endDayOffset']) or row['is24Hours']:err(name,number,'startTime','Closed/unknown must have null times and false 24h')
                owner=indexes.get((target,ENTITIES[target]['primaryKey']),{}).get(row['ownerId'])
                if target=='venueDishes' and owner:owner=indexes.get(('venues','id'),{}).get(owner['venueId'])
                if owner and row['timezone']!=owner['timezone']:err(name,number,'timezone','Must match venue timezone')
            if name=='dateExceptions':
                key=(row['scheduleId'],row['localDate'])
                if key in seen_exceptions:err(name,number,'localDate','Duplicate schedule/date exception')
                seen_exceptions.add(key)
                if (row['status']=='open') != bool(row['intervals']):err(name,number,'intervals','Open requires intervals; closed/unknown empty')
                if row['status']!='open' and row['lastOrder'] is not None:err(name,number,'lastOrder','Closed/unknown has no last order')
            if name=='availabilityOverrides' and utc(row['expiresAt'])<=utc(row['observedAt']):err(name,number,'expiresAt','Must be later than observation')
            if name=='coverageAreas':
                if row['datasetVersion']!=bundle['datasetVersion']:err(name,number,'datasetVersion','Bundle mismatch')
                if reviewed and row['boundary'] is None:err(name,number,'boundary','Reviewed coverage needs polygon')
            if name=='publicAnchors' and row['isPublic'] is not True:err(name,number,'isPublic','Private GPS is not an anchor')
            if name=='datasetVersions':
                if row['datasetVersion']!=bundle['datasetVersion'] or row['contractVersion']!=bundle['contractVersion']:err(name,number,'datasetVersion','Bundle version mismatch')
                if row['reviewStatus']=='published' and any(row[k] is None for k in ['checksum','artifactLocator','qualityReport','rollbackLocator']):err(name,number,'checksum','Publish requires artifact/checksum/quality/rollback')
    groups={};spans={}
    for number,row in valid_rows.get('weeklySchedules',[]):
        key=row['scheduleId'];binding=(row['ownerType'],row['ownerId'],row['timezone'],row['reviewStatus'])
        if key in groups and groups[key]!=binding:err('weeklySchedules',number,'scheduleId','Schedule group has conflicting owner/timezone/status')
        groups[key]=binding
        if row['status']=='open':
            try:
                interval({k:row[k] for k in ['startTime','endTime','endDayOffset','is24Hours']})
            except (ValueError,TypeError):continue
            start=(row['dayOfWeek']-1)*1440+int(row['startTime'][:2])*60+int(row['startTime'][3:])
            end=(row['dayOfWeek']-1+row['endDayOffset'])*1440+int(row['endTime'][:2])*60+int(row['endTime'][3:])
            for lo,hi in spans.get(key,[]):
                if any(max(start,lo+shift)<min(end,hi+shift) for shift in [-10080,0,10080]):err('weeklySchedules',number,'startTime','Overlapping/duplicate intervals')
            spans.setdefault(key,[]).append((start,end))
    return errors


def write_csv_bundle(bundle,directory):
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    (directory/'bundle.json').write_text(json.dumps({k:v for k,v in bundle.items() if k!='entities'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    for name,definition in ENTITIES.items():
        with (directory/f'{name}.csv').open('w',encoding='utf-8-sig',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=definition['fields'],lineterminator='\n');writer.writeheader()
            for row in bundle['entities'][name]:
                writer.writerow({k:'' if v is None else json.dumps(v,ensure_ascii=False,separators=(',', ':')) if definition['fields'][k]['type'] in JSON_TYPES or type(v) is bool else v for k,v in row.items()})

def read_csv_bundle(directory):
    directory=Path(directory);bundle=json.loads((directory/'bundle.json').read_text(encoding='utf-8'));bundle['entities']={}
    for name,definition in ENTITIES.items():
        rows=[]
        with (directory/f'{name}.csv').open(encoding='utf-8-sig',newline='') as f:
            reader=csv.DictReader(f)
            if reader.fieldnames!=list(definition['fields']):raise ContractError(f'{name}: incorrect headers/order')
            for number,row in enumerate(reader,1):
                out={}
                if None in row or any(v is None for v in row.values()):raise ContractError(f'{name} row {number}: wrong column count')
                for key,value in row.items():
                    t=definition['fields'][key]['type']
                    try:
                        if value=='':v=None
                        elif t in JSON_TYPES or t=='boolean':v=json.loads(value)
                        elif t=='integer':v=int(value)
                        elif t=='number':v=json.loads(value)
                        else:v=value
                        check_value(v,definition['fields'][key]);out[key]=v
                    except (ValueError,TypeError,KeyError) as e:raise ContractError(f'{name} row {number} field {key}: {e}') from e
                rows.append(out)
        bundle['entities'][name]=rows
    return bundle

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('path',type=Path);parser.add_argument('--as-of',help='UTC instant ending Z for deterministic fixtures');args=parser.parse_args()
    try:
        bundle=read_csv_bundle(args.path) if args.path.is_dir() else json.loads(args.path.read_text(encoding='utf-8'))
        errors=validate(bundle,utc(args.as_of) if args.as_of else None)
    except (ValueError,OSError) as e:
        print(json.dumps({'errors':[str(e)]},ensure_ascii=False));return 1
    print(json.dumps({'errors':errors,'valid':not errors,'fixtureOnly':bundle.get('fixtureOnly'),'publicationPerformed':False},ensure_ascii=False,indent=2))
    return 1 if errors else 0

if __name__=='__main__':raise SystemExit(main())
