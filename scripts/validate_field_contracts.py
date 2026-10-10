"""Offline GM-04 schema/relationship runner. Does not import, publish or select food."""
from __future__ import annotations
import argparse
from copy import deepcopy
from datetime import date
import hashlib
import json
import math
from pathlib import Path
import re
import sys
from zoneinfo import ZoneInfo

from gm04_contract_model import ROOT, FOOD, CORE, FOOD_UNIQUE, CONTRACT_ID, OPERATION_RULES
sys.path.insert(0, str(ROOT/'data-preparation/scripts'))
import data_contract as legacy

# Deliberately closed vocabulary: adding an unsupported keyword fails, never silently skips validation.
SUPPORTED = {'$schema','$id','$defs','$ref','title','description','type','const','enum','properties',
             'required','additionalProperties','items','minItems','maxItems','uniqueItems','minLength',
             'maxLength','pattern','minimum','maximum','minProperties','anyOf'}


def load_json(path):
    def pairs(items):
        out = {}
        for key,value in items:
            if key in out: raise ValueError('Duplicate JSON object key: '+key)
            out[key] = value
        return out
    def reject(value): raise ValueError('Non-finite JSON value: '+value)
    return json.loads(Path(path).read_text(encoding='utf-8'), object_pairs_hook=pairs, parse_constant=reject)


def audit_schema(schema, root=None):
    root = root or schema
    if type(schema) is bool: return
    if not isinstance(schema,dict): raise ValueError('Schema object or boolean required')
    for key in schema:
        if key not in SUPPORTED and not key.startswith('x-'): raise ValueError('Unsupported schema keyword: '+key)
    if '$ref' in schema:
        ref = schema['$ref']
        if not ref.startswith('#/$defs/') or ref[len('#/$defs/'):] not in root.get('$defs',{}): raise ValueError('Unresolved/local-only $ref: '+ref)
    for key in ['properties','$defs']:
        for child in schema.get(key,{}).values(): audit_schema(child,root)
    for key in ['items','additionalProperties']:
        if key in schema: audit_schema(schema[key],root)
    for child in schema.get('anyOf',[]): audit_schema(child,root)


def same_json(a,b):
    if isinstance(a,bool) or isinstance(b,bool): return type(a) is type(b) and a==b
    if isinstance(a,dict) or isinstance(b,dict):
        return isinstance(a,dict) and isinstance(b,dict) and set(a)==set(b) and all(same_json(a[k],b[k]) for k in a)
    if isinstance(a,list) or isinstance(b,list):
        return isinstance(a,list) and isinstance(b,list) and len(a)==len(b) and all(same_json(x,y) for x,y in zip(a,b))
    return a==b


def schema_errors(value,schema,root=None,path='$'):
    root = schema if root is None else root
    errors=[]
    def err(message): errors.append({'code':'SCHEMA','path':path,'message':message})
    if schema is True: return []
    if schema is False: err('Value is forbidden'); return errors
    if '$ref' in schema: errors += schema_errors(value,root['$defs'][schema['$ref'][len('#/$defs/'):]],root,path)
    if 'anyOf' in schema and not any(not schema_errors(value,part,root,path) for part in schema['anyOf']): err('No anyOf branch matched')
    if 'const' in schema and not same_json(value,schema['const']): err('Wrong constant')
    if 'enum' in schema and not any(same_json(value,v) for v in schema['enum']): err('Outside enum')
    types = schema.get('type')
    checks = {'null':value is None,'boolean':type(value) is bool,'string':isinstance(value,str),
              'object':isinstance(value,dict),'array':isinstance(value,list),
              'number':type(value) in [int,float] and math.isfinite(value),
              'integer':type(value) in [int,float] and math.isfinite(value) and int(value)==value}
    if types and not any(checks.get(t,False) for t in (types if isinstance(types,list) else [types])):
        err('Incorrect JSON type'); return errors
    if isinstance(value,dict):
        for key in schema.get('required',[]):
            if key not in value: errors.append({'code':'SCHEMA','path':path+'.'+key,'message':'Required property missing'})
        if len(value)<schema.get('minProperties',0): err('Too few properties')
        properties = schema.get('properties',{})
        for key,val in value.items():
            child = properties.get(key,schema.get('additionalProperties',True))
            errors += schema_errors(val,child,root,path+'.'+key)
    if isinstance(value,list):
        if len(value)<schema.get('minItems',0) or len(value)>schema.get('maxItems',math.inf): err('Array size outside bounds')
        if schema.get('uniqueItems') and any(same_json(value[i],value[j]) for i in range(len(value)) for j in range(i)): err('Duplicate array item')
        for i,val in enumerate(value): errors += schema_errors(val,schema.get('items',True),root,path+f'[{i}]')
    if isinstance(value,str):
        if len(value)<schema.get('minLength',0) or len(value)>schema.get('maxLength',math.inf): err('String length outside bounds')
        if 'pattern' in schema and not re.search(schema['pattern'],value): err('String pattern mismatch')
    if type(value) in [int,float]:
        if not math.isfinite(value) or value<schema.get('minimum',-math.inf) or value>schema.get('maximum',math.inf): err('Number outside bounds')
    return errors


def duplicates(rows, keys):
    seen=set()
    for i,row in enumerate(rows):
        key=json.dumps([row[k] for k in keys],sort_keys=True)
        if key in seen: yield i
        seen.add(key)


def field_time_checks(bundle, definitions, errors):
    for name,definition in definitions.items():
        for i,row in enumerate(bundle['entities'][name]):
            for key,field in definition['fields'].items():
                value = row[key]
                if value is None: continue
                try:
                    if field['type']=='utc': legacy.utc(value)
                    elif field['type']=='date': date.fromisoformat(value)
                    elif field['type']=='timezone': ZoneInfo(value)
                    elif field['type']=='flavor': legacy.flavor(value)
                    elif field['type']=='profile': legacy.profile(value)
                    elif key=='flavor': legacy.flavor(value)
                except (ValueError,KeyError,TypeError) as e:
                    errors.append({'code':'TIME' if field['type'] in ['utc','date','timezone'] else 'PROFILE', 'path':f'$.entities.{name}[{i}].{key}', 'message':str(e)})


def validate_food(bundle, as_of):
    schema=load_json(ROOT/'supabase/seed/templates/food-v1.schema.json'); audit_schema(schema)
    errors=schema_errors(bundle,schema)
    if errors: return errors
    field_time_checks(bundle,FOOD,errors)
    if errors: return errors
    old=deepcopy(bundle);old['contractVersion']='1.0.0'
    for row in old['entities']['venues']: row.pop('scheduleId')
    for row in old['entities']['weeklySchedules']:
        row.pop('lastOrder');row.pop('lastOrderDayOffset')
    for row in old['entities']['dateExceptions']:row.pop('lastOrderDayOffset')
    for row in old['entities']['datasetVersions']:row['contractVersion']='1.0.0'
    for e in legacy.validate(old,legacy.utc(as_of)):
        path = '$' if e['entity']=='bundle' else f"$.entities.{e['entity']}[{max(0,e['row']-1)}]"
        errors.append({'code':'FOOD_CONTRACT','path':path+'.'+e['field'],'message':e['message']})
    data=bundle['entities'];schedules={}
    sources={r['sourceRef']:r for r in data['dataSources']}
    at=legacy.utc(as_of)
    for row in data['weeklySchedules']: schedules.setdefault(row['scheduleId'],[]).append(row)
    def err(name,i,key,code,message): errors.append({'code':code,'path':f'$.entities.{name}[{i}].{key}','message':message})
    for name,keys_list in FOOD_UNIQUE.items():
        for keys in keys_list:
            for i in duplicates(data[name],keys):err(name,i,keys[0],'UNIQUE','Duplicate key: '+','.join(keys))
    for i,row in enumerate(data['venues']):
        group=schedules.get(row['scheduleId'])
        if row['scheduleId'] is not None and not group:err('venues',i,'scheduleId','FK','Venue schedule missing')
        if group and any(s['ownerType']!='venue' or s['ownerId']!=row['id'] for s in group):err('venues',i,'scheduleId','SCHEDULE','Venue schedule belongs to another owner')
        if row['reviewStatus'] in ['verified','published'] and row['scheduleId'] is None:err('venues',i,'scheduleId','REVIEW','Reviewed venue requires explicit schedule binding')
        if row['reviewStatus']=='published' and group:
            # Validate every row in the bound schedule group, not just one index row.
            # The legacy adapter removes this new FK, so its publish checks cannot cover it.
            if any(s['status']=='unknown' for s in group):
                err('venues',i,'scheduleId','SCHEDULE','Published venue cannot bind unknown hours')
            for s in group:
                refs={s['sourceRef'],s['fieldSources'].get('hours')}
                reviewed = (s['reviewStatus'] in ['verified','published'] and s['checkedAt'] is not None
                            and legacy.utc(s['checkedAt'])<=at and s['validUntil'] is not None
                            and legacy.utc(s['validUntil'])>at and s['reviewedBy'] is not None
                            and s['reviewedBy']!=s['enteredBy'])
                licensed_sources = all(ref in sources and sources[ref]['reviewStatus'] in ['verified','published']
                    and sources[ref]['checkedAt'] is not None and legacy.utc(sources[ref]['checkedAt'])<=at
                    and sources[ref]['validUntil'] is not None and legacy.utc(sources[ref]['validUntil'])>at
                    and sources[ref]['reviewedBy'] is not None and sources[ref]['reviewedBy']!=sources[ref]['enteredBy']
                    and sources[ref]['usageRights'] in ['granted','licensed','public_domain']
                    and sources[ref]['license'] is not None for ref in refs)
                if not reviewed or not licensed_sources:
                    err('venues',i,'scheduleId','REVIEW','Published venue requires reviewed, current schedule and hours sources')
                    break
    for name in ['weeklySchedules','dateExceptions']:
        for i,row in enumerate(data[name]):
            last=row['lastOrder'];offset=row['lastOrderDayOffset']
            if (last is None)!=(offset is None):err(name,i,'lastOrderDayOffset','SCHEDULE','Last order time/offset must be known together')
            if last is None:continue
            if row['status']!='open':err(name,i,'lastOrder','SCHEDULE','Closed/unknown has no last order');continue
            spans=[row] if name=='weeklySchedules' else row['intervals']
            minute=lambda t:int(t[:2])*60+int(t[3:])
            point=minute(last)+(offset or 0)*1440
            if not any(minute(s['startTime'])<=point<minute(s['endTime'])+(s['endDayOffset'] or 0)*1440 for s in spans if s['startTime'] is not None):err(name,i,'lastOrder','SCHEDULE','Last order must lie inside an open interval [start,end)')
            if 'hours' not in row['fieldSources']:err(name,i,'fieldSources','REVIEW','Known last order needs hours source even in draft')
    sources={r['sourceRef']:r for r in data['dataSources']}
    for name,rows in data.items():
        for i,row in enumerate(rows):
            if row['reviewStatus'] not in ['verified','published']:continue
            refs=set(row['fieldSources'].values())|({row['sourceRef']} if 'sourceRef' in row else set())
            for source_id in refs:
                s=sources.get(source_id)
                if s and (s['validUntil'] is None or legacy.utc(s['validUntil'])<=legacy.utc(as_of) or s['reviewStatus']=='draft'):
                    err(name,i,'sourceRef','REVIEW','Reviewed row has draft/expired source; dataset freshness cannot cover child')
    return errors


def validate_core(bundle, food, as_of):
    schema=load_json(ROOT/'supabase/seed/templates/core-v1.schema.json');audit_schema(schema)
    errors=schema_errors(bundle,schema)
    if errors:return errors
    field_time_checks(bundle,CORE,errors)
    if errors:return errors
    data=bundle['entities'];fd=food['entities']
    indexes={name:{r['id']:r for r in rows} for name,rows in data.items()}
    users={r['userId'] for r in data['profiles']}
    food_indexes={name:{r[definition['primaryKey']]:r for r in fd[name]} for name,definition in FOOD.items()}
    food_indexes['weeklySchedules.scheduleId']={r['scheduleId']:r for r in fd['weeklySchedules']}
    def err(name,i,key,code,message):errors.append({'code':code,'path':f'$.entities.{name}[{i}].{key}','message':message})
    for name,definition in CORE.items():
        for keys in [['id'],*definition['unique']]:
            for i in duplicates(data[name],keys):err(name,i,keys[0],'UNIQUE','Duplicate key: '+','.join(keys))
        for i,row in enumerate(data[name]):
            for key,field in definition['fields'].items():
                target=field.get('ref');value=row[key]
                if not target or value is None:continue
                values=value if field['type']=='uuidArray' else [value]
                allowed=users if target=='auth.users' else food_indexes.get(target[5:],{}) if target.startswith('food.') else indexes[target]
                if any(v not in allowed for v in values):err(name,i,key,'FK','Reference missing: '+target)
            for start,end in [('createdAt','expiresAt'),('finalizedAt','expiresAt'),('joinedAt','leftAt'),('createdAt','updatedAt'),('createdAt','lastSeenAt')]:
                if row.get(start) and row.get(end) and legacy.utc(row[end])<legacy.utc(row[start]):err(name,i,end,'TIME','End before start')
            if row.get('createdAt') and row.get('expiresAt') and row['createdAt']==row['expiresAt']:err(name,i,'expiresAt','TIME','Expiry must be strictly later than creation')
    membership={(r['roomId'],r['userId']):r for r in data['members'] if r['leftAt'] is None}
    for i,r in enumerate(data['rooms']):
        if (r['id'],r['hostUserId']) not in membership:err('rooms',i,'hostUserId','MEMBERSHIP','Host must be active member')
        if r['radiusM']<=0:err('rooms',i,'radiusM','CONTEXT','Radius positive; max from reviewed server configuration')
        anchor=food_indexes['publicAnchors'].get(r['anchorId'])
        if anchor and anchor['coverageId']!=r['coverageId']:err('rooms',i,'coverageId','CONTEXT','Anchor/coverage mismatch')
        budget=r['budget']
        if budget and budget['min'] is not None and budget['max'] is not None and budget['min']>budget['max']:err('rooms',i,'budget','PRICE','Budget min > max')
        locked=r['lockedAt'] is not None
        if r['state'] in ['ROUND_1','ROUND_2','DECIDED','NO_CONSENSUS'] and not locked:err('rooms',i,'lockedAt','POOL','Started room requires locked input')
        if r['state']=='LOBBY' and locked:err('rooms',i,'lockedAt','POOL','Lobby cannot have started lock')
        roster=set(r['rosterUserIds'])
        if locked:
            actual={u for room,u in membership if room==r['id']}
            if not 2<=len(roster)<=8 or roster!=actual:err('rooms',i,'rosterUserIds','MEMBERSHIP','Locked roster must match 2–8 active members')
            consent=r['consentSnapshot']
            if len(consent)!=len(roster) or {c['userId'] for c in consent}!=roster:err('rooms',i,'consentSnapshot','CONSENT','Consent snapshot covers locked roster exactly')
            if r['evaluatedAt'] is None or legacy.utc(r['desiredAt'])<legacy.utc(r['lockedAt']):err('rooms',i,'desiredAt','CONTEXT','Started context requires evaluation and future desiredAt')
    for name in ['members','preferences']:
        for i,r in enumerate(data[name]):
            room=indexes['rooms'].get(r['roomId'])
            if room and name=='preferences' and (r['roomId'],r['userId']) not in membership:err(name,i,'userId','MEMBERSHIP','Preferences owner is not member')
            if name=='preferences':
                for key,kind in [('cuisineIds','cuisine'),('categoryIds','category')]:
                    if any(food_indexes['taxonomy'].get(t,{}).get('type') not in [None,kind] for t in r[key]):err(name,i,key,'PROFILE','Wrong taxonomy type')
    for i,r in enumerate(data['roundDishes']):
        room=indexes['rooms'].get(r['roomId']);o=food_indexes['venueDishes'].get(r['offeringId'])
        if room and (r['poolVersion']!=room['poolVersion'] or r['datasetVersion']!=room['datasetVersion']):err('roundDishes',i,'poolVersion','VERSION','Locked pool/version mismatch')
        if o and (r['dishId']!=o['dishId'] or r['venueId']!=o['venueId'] or r['variant']!=o['variant'] or r['scheduleId']!=o['scheduleId']):err('roundDishes',i,'offeringId','POOL','Snapshot must use one offering and variant')
        price=r['price']
        if price['sourceRef'] is not None and price['sourceRef'] not in food_indexes['dataSources']:err('roundDishes',i,'price','FK','Price source missing')
        if price['priceMin'] is not None or price['priceMax'] is not None:
            if price['unit'] is None or price['currency'] is None or price['sourceRef'] not in food_indexes['dataSources']:err('roundDishes',i,'price','PRICE','Known price needs unit/currency/source')
        if price['priceMin'] is not None and price['priceMax'] is not None and price['priceMin']>price['priceMax']:err('roundDishes',i,'price','PRICE','Price min > max')
        if o and any(price[k]!=o[k] for k in ['priceMin','priceMax','unit','currency','servingSize']):err('roundDishes',i,'price','POOL','Do not mix prices from other offering')
        if o and r['effectiveProfile'] is not None:
            dish=food_indexes['dishes'].get(o['dishId'],{})
            expected={**dish,**(o['profileOverrides'] or {})}
            if any(value!=expected.get(key) for key,value in r['effectiveProfile'].items()):err('roundDishes',i,'effectiveProfile','POOL','Effective fields must inherit dish and this offering overrides, not another offering')
            for key,kind in [('cuisineIds','cuisine'),('categoryIds','category')]:
                if any(food_indexes['taxonomy'].get(t,{}).get('type')!=kind for t in r['effectiveProfile'].get(key,[])):err('roundDishes',i,'effectiveProfile','PROFILE','Effective taxonomy reference/type invalid')
        if r['round']==2:
            prior=[p for p in data['roundDishes'] if p['roomId']==r['roomId'] and p['round']==1 and p['choiceId']==r['choiceId']]
            if len(prior)!=1 or any(prior[0][k]!=r[k] for k in ['dishId','variant','offeringId','venueId']):err('roundDishes',i,'choiceId','POOL','Round 2 cannot introduce a new choice')
    for room in data['rooms']:
        for round_no in [1,2]:
            count=sum(r['roomId']==room['id'] and r['round']==round_no for r in data['roundDishes'])
            if count>8:errors.append({'code':'POOL','path':'$.entities.roundDishes','message':'At most eight choices per room/round'})
            if round_no==1 and room['lockedAt'] and count==0:errors.append({'code':'POOL','path':'$.entities.roundDishes','message':'Started room cannot have empty pool'})
    for i,s in enumerate(data['submissions']):
        m=indexes['members'].get(s['memberId']);room=indexes['rooms'].get(s['roomId'])
        if m and (m['roomId']!=s['roomId'] or m['leftAt'] is not None):err('submissions',i,'memberId','MEMBERSHIP','Wrong/left member for room')
        if room:
            if s['poolVersion']!=room['poolVersion']:err('submissions',i,'poolVersion','VERSION','Submission pool mismatch')
            if room['lockedAt'] is None or (m and m['userId'] not in room['rosterUserIds']):err('submissions',i,'memberId','MEMBERSHIP','Only locked roster submits')
            if legacy.utc(s['acceptedAt'])>=legacy.utc(room['expiresAt']):err('submissions',i,'acceptedAt','TIME','ACK cannot be at/after expiry')
        expected={p['id'] for p in data['roundDishes'] if p['roomId']==s['roomId'] and p['round']==s['round']}
        actual={v['roundDishId'] for v in data['votes'] if v['submissionId']==s['id']}
        if not expected or actual!=expected:err('submissions',i,'id','VOTE','Submission must cover its whole round pool')
    for i,r in enumerate(data['votes']):
        s=indexes['submissions'].get(r['submissionId']);p=indexes['roundDishes'].get(r['roundDishId'])
        if s and p:
            if (s['roomId'],s['round'])!=(p['roomId'],p['round']):err('votes',i,'roundDishId','VOTE','Vote must reference submitted room/round')
            allowed=['WANT','OK','NO'] if s['round']==1 else ['KEEP','REMOVE']
            if r['value'] not in allowed:err('votes',i,'value','VOTE','Value does not belong to round')
    for i,r in enumerate(data['results']):
        room=indexes['rooms'].get(r['roomId']);winner=indexes['roundDishes'].get(r['winnerRoundDishId'])
        success=r['reasonCode'] in ['UNANIMOUS_WANT','ACCEPTABLE_FINAL']
        if success!=(winner is not None) or success==(r['matchTier']=='NO_CONSENSUS'):err('results',i,'winnerRoundDishId','RESULT','Winner/tier/reason inconsistent')
        if r['reasonCode']=='UNANIMOUS_WANT' and r['matchTier']!='PERFECT':err('results',i,'matchTier','RESULT','Unanimous reason requires PERFECT')
        if r['reasonCode']=='ACCEPTABLE_FINAL' and r['matchTier'] not in ['CONSENSUS','COMPROMISE']:err('results',i,'matchTier','RESULT','Final fallback tier mismatch')
        if room and room['state']!=('DECIDED' if success else 'NO_CONSENSUS'):err('results',i,'roomId','RESULT','Result requires matching terminal room')
        if winner and (winner['roomId']!=r['roomId'] or winner['choiceId'] not in r['tiedChoiceIds']):err('results',i,'tiedChoiceIds','RESULT','Winner must be in internal ties for this room')
        final_round=2 if r['reasonCode'] in ['ACCEPTABLE_FINAL','ALL_REMOVED'] else 1
        if winner and winner['round']!=final_round:err('results',i,'winnerRoundDishId','RESULT','Winner round and reason mismatch')
        if room:
            for round_no in range(1,final_round+1):
                acked={indexes['members'].get(s['memberId'],{}).get('userId') for s in data['submissions'] if s['roomId']==r['roomId'] and s['round']==round_no}
                if acked!=set(room['rosterUserIds']):err('results',i,'roomId','RESULT','Final result requires every locked member submission')
        if winner:
            choice_rows={p['id'] for p in data['roundDishes'] if p['roomId']==r['roomId'] and p['choiceId']==winner['choiceId']}
            if any(v['roundDishId'] in choice_rows and v['value'] in ['NO','REMOVE'] for v in data['votes']):err('results',i,'winnerRoundDishId','RESULT','Persisted winner cannot have NO/REMOVE veto')
        valid_choices={p['choiceId'] for p in data['roundDishes'] if p['roomId']==r['roomId']}
        if any(c not in valid_choices for c in r['tiedChoiceIds']):err('results',i,'tiedChoiceIds','FK','Tie choice missing')
        if not success and r['tiedChoiceIds']:err('results',i,'tiedChoiceIds','RESULT','No consensus has no winning ties')
        if room and legacy.utc(r['finalizedAt'])>=legacy.utc(room['expiresAt']):err('results',i,'finalizedAt','TIME','Finalization must precede expiry')
    for i,room in enumerate(data['rooms']):
        results=[r for r in data['results'] if r['roomId']==room['id']]
        if room['state'] in ['DECIDED','NO_CONSENSUS'] and len(results)!=1:err('rooms',i,'state','RESULT','Decided/no-consensus room needs exactly one persisted result')
    for i,c in enumerate(data['consents']):
        if c['enabled'] and (c['grantedAt'] is None or c['revokedAt'] is not None):err('consents',i,'enabled','CONSENT','Enabled requires grant and no withdrawal')
        if c['grantedAt'] and c['revokedAt'] and legacy.utc(c['revokedAt'])<legacy.utc(c['grantedAt']):err('consents',i,'revokedAt','TIME','Withdrawal before grant')
    for i,h in enumerate(data['histories']):
        res=indexes['results'].get(h['resultId']);room=indexes['rooms'].get(res['roomId']) if res else None
        winner=indexes['roundDishes'].get(res['winnerRoundDishId']) if res else None
        if not winner or winner['dishId']!=h['dishId'] or h['finalizedAt']!=res['finalizedAt'] or h['matchTier']!=res['matchTier']:err('histories',i,'resultId','RESULT','History must describe persisted winner')
        if h['scope']=='personal':
            if h['ownerUserId'] is None or h['memberUserIds']!=[h['ownerUserId']]:err('histories',i,'ownerUserId','CONSENT','Personal owner/roster mismatch')
            required=set(h['memberUserIds']);scope='personal_history'
        else:
            required=set(room['rosterUserIds']) if room else set();scope='group_history'
            if h['ownerUserId'] is not None or set(h['memberUserIds'])!=required:err('histories',i,'memberUserIds','CONSENT','Group history must match exact locked roster')
        cons=[indexes['consents'].get(c) for c in h['consentIds']]
        if not required or len(cons)!=len(required) or {c['userId'] for c in cons if c}!=required or any(c is None or c['scope']!=scope or not c['enabled'] or c['revokedAt'] is not None or (c['expiresAt'] and legacy.utc(c['expiresAt'])<=legacy.utc(as_of)) or (room and c['roomId'] not in [None,room['id']]) for c in cons):err('histories',i,'consentIds','CONSENT','History requires independent active opt-in for each owner')
        if any(c and (c['grantedAt'] is None or legacy.utc(c['grantedAt'])>legacy.utc(h['finalizedAt'])) for c in cons):err('histories',i,'consentIds','CONSENT','History consent must already be granted when finalized')
        if room and any(not x['historyConsent'] for x in room['consentSnapshot'] if x['userId'] in required):err('histories',i,'consentIds','CONSENT','Locked opt-out cannot create history')
        if room:
            expected_key=hashlib.sha256('|'.join(sorted(room['rosterUserIds'])).encode()).hexdigest()
            if h['groupKey']!=expected_key:err('histories',i,'groupKey','CONSENT','Group key must use canonical locked roster')
    for i,r in enumerate(data['friends']):
        if r['lowUserId']>=r['highUserId']:err('friends',i,'lowUserId','PAIR','Pair must be sorted distinct users')
    for name in ['friendInvitations','roomInvitations']:
        for i,r in enumerate(data[name]):
            if r['senderUserId']==r['recipientUserId']:err(name,i,'recipientUserId','PAIR','Self invitation forbidden')
            if r['state'] in ['accepted','rejected'] and r['respondedAt'] is None:err(name,i,'respondedAt','PAIR','Response state requires response time')
            if r['respondedAt'] and (legacy.utc(r['respondedAt'])<legacy.utc(r['createdAt']) or legacy.utc(r['respondedAt'])>=legacy.utc(r['expiresAt'])):err(name,i,'respondedAt','TIME','Response must precede expiry')
            if name=='roomInvitations':
                pair=indexes['friends'].get(r['friendId']);room=indexes['rooms'].get(r['roomId']);event=indexes['events'].get(r['eventId'])
                if pair and {pair['lowUserId'],pair['highUserId']}!={r['senderUserId'],r['recipientUserId']}:err(name,i,'friendId','PAIR','Invite needs accepted pair of same parties')
                if room and legacy.utc(r['expiresAt'])>legacy.utc(room['expiresAt']):err(name,i,'expiresAt','TIME','Room invitation cannot outlive room')
                if event and (event['kind']!='ROOM_INVITED' or event['invitationId']!=r['id'] or event['roomId']!=r['roomId'] or event['recipientUserIds']!=[r['recipientUserId']]):err(name,i,'eventId','EVENT','Invitation/event binding mismatch')
    for i,e in enumerate(data['events']):
        if e['kind']=='ROOM_INVITED':
            if e['invitationId'] is None or e['resultId'] is not None:err('events',i,'invitationId','EVENT','Invite event requires only invitation ref')
        else:
            res=indexes['results'].get(e['resultId'])
            if e['invitationId'] is not None or not res or res['roomId']!=e['roomId']:err('events',i,'resultId','EVENT','Result event references persisted same-room result')
            if res and legacy.utc(e['createdAt'])<legacy.utc(res['finalizedAt']):err('events',i,'createdAt','EVENT','Result event cannot precede finalization')
            room=indexes['rooms'].get(e['roomId'])
            if room and any(u not in room['rosterUserIds'] for u in e['recipientUserIds']):err('events',i,'recipientUserIds','PRIVACY','Result recipients must belong to locked roster')
            notified={c['userId'] for c in data['consents'] if c['enabled'] and c['scope']=='notifications' and c['roomId'] in [None,e['roomId']] and c['revokedAt'] is None and (c['expiresAt'] is None or legacy.utc(c['expiresAt'])>legacy.utc(e['createdAt']))}
            if any(u not in notified for u in e['recipientUserIds']):err('events',i,'recipientUserIds','CONSENT','Result notification requires recipient opt-in at event time')
        if not e['recipientUserIds']:err('events',i,'recipientUserIds','EVENT','Event requires recipients')
    for name,key in [('inbox','ownerUserId'),('deliveries','recipientUserId')]:
        for i,r in enumerate(data[name]):
            e=indexes['events'].get(r['eventId'])
            if e and r[key] not in e['recipientUserIds']:err(name,i,key,'EVENT','Recipient is not event target')
            if name=='deliveries':
                dev=indexes['devices'].get(r['deviceId'])
                if dev and dev['userId']!=r[key]:err(name,i,'deviceId','PRIVACY','Cannot deliver to another user device')
                if r['attempts']==0 and any(r[k] is not None for k in ['ticketId','receiptId','lastAttemptAt']):err(name,i,'attempts','EVENT','No attempt cannot have delivery acknowledgement')
    for i,d in enumerate(data['devices']):
        if d['active'] and (d['permission']!='granted' or d['pushToken'] is None):err('devices',i,'active','PRIVACY','Active token requires granted permission and registration')
    for i,r in enumerate(data['idempotency']):
        for key,target in [('roomId','rooms'),('resultId','results')]:
            if r['response'][key] is not None and r['response'][key] not in indexes[target]:err('idempotency',i,'response','FK','ACK ref missing')
        if OPERATION_RULES[r['operation']][1] and r['expectedVersion'] is None:err('idempotency',i,'expectedVersion','VERSION','Room mutation needs expected version')
        if r['operation']=='submit_ballot':
            sub=[s for s in data['submissions'] if s['requestId']==r['requestId'] and indexes['members'].get(s['memberId'],{}).get('userId')==r['userId']]
            if len(sub)!=1 or sub[0]['payloadHash']!=r['payloadHash'] or sub[0]['roomId']!=r['response']['roomId']:err('idempotency',i,'payloadHash','IDEMPOTENCY','Submission ACK must bind same user/request/hash/room')
    return errors


def apply_edits(bundle, edits):
    b=deepcopy(bundle)
    for edit in edits:
        parts=edit['path'];parent=b
        for key in parts[:-1]:parent=parent[key]
        if edit.get('op','set')=='remove':del parent[parts[-1]]
        elif edit.get('op')=='append':parent[parts[-1]].append(deepcopy(edit['value']))
        else:parent[parts[-1]]=deepcopy(edit['value'])
    return b


def case_input(bundle, case):
    target=apply_edits(bundle,case['edits'])
    # A simulated counterexample exercises publish rules independently of the
    # fixture guard. This in-memory bundle is never written/imported/published.
    if 'fixtureOnlyOverride' in case:
        target['fixtureOnly']=case['fixtureOnlyOverride']
    return target


def validate_case_suite(suite):
    """A broken test plan must fail instead of silently exercising zero inputs."""
    if not isinstance(suite,dict) or suite.get('contractId')!=CONTRACT_ID or suite.get('fixtureOnly') is not True:
        raise ValueError('Case suite must declare the contract and fixtureOnly=true')
    if not isinstance(suite.get('cases'),list) or not suite['cases']:
        raise ValueError('Nonempty cases required')
    seen=set()
    for case in suite['cases']:
        required={'id','contract','description','spec','validationAt','edits','expected'}
        if not isinstance(case,dict) or not required<=set(case):raise ValueError('Case fields missing')
        if not isinstance(case['id'],str) or not re.fullmatch(r'[a-z0-9-]+',case['id']) or case['id'] in seen:raise ValueError('Unique case ID required')
        seen.add(case['id'])
        if case['contract'] not in ['food','core']:raise ValueError('Unknown case contract')
        if 'fixtureOnlyOverride' in case and (case['fixtureOnlyOverride'] is not False or case.get('simulationOnly') is not True or case['contract']!='food'):
            raise ValueError('Publish counterexample must be explicitly simulated food input')
        legacy.utc(case['validationAt'])
        expected=case['expected']
        if not isinstance(expected,dict) or type(expected.get('valid')) is not bool or not isinstance(expected.get('errors'),list):raise ValueError('Typed expected required')
        if expected['valid']==bool(expected['errors']):raise ValueError('Invalid cases need explicit errors; valid cases have none')
        for error in expected['errors']:
            if set(error)!={'code','path'} or not all(isinstance(v,str) and v for v in error.values()):raise ValueError('Expected code/path required')
        if not isinstance(case['edits'],list):raise ValueError('Edit array required')
        for edit in case['edits']:
            if not isinstance(edit,dict) or not isinstance(edit.get('path'),list) or len(edit['path'])<2 or edit['path'][0]!='entities' or any(type(k) not in [str,int] for k in edit['path']):raise ValueError('Edit requires entity JSON path')
            if edit.get('op','set') not in ['set','append','remove']:raise ValueError('Unknown edit operation')
            if edit.get('op')!='remove' and 'value' not in edit:raise ValueError('Edit value required')


def run_cases():
    suite=load_json(ROOT/'tests/fixtures/food-v1/contract-cases.json')
    validate_case_suite(suite)
    food=load_json(ROOT/'supabase/seed/templates/food-v1.template.json')
    core=load_json(ROOT/'supabase/seed/templates/core-v1.template.json')
    if food['fixtureOnly'] is not True or core['fixtureOnly'] is not True:raise ValueError('Case templates must be fixtureOnly')
    results=[]
    for case in suite['cases']:
        target=case_input(food if case['contract']=='food' else core,case)
        errors=validate_food(target,case['validationAt']) if case['contract']=='food' else validate_core(target,food,case['validationAt'])
        actual={'valid':not errors,'errors':errors}
        expected=case['expected']
        passed=actual['valid']==expected['valid'] and all(any(e['code']==required['code'] and e['path']==required['path'] for e in errors) for required in expected.get('errors',[]))
        results.append({'id':case['id'],'input':{'contract':case['contract'],'edits':case['edits'],'validationAt':case['validationAt'],**({'fixtureOnlyOverride':False,'simulationOnly':True} if 'fixtureOnlyOverride' in case else {})},'expected':expected,'actual':actual,'pass':passed})
    return {'contractId':CONTRACT_ID,'fixtureOnly':True,'publicationPerformed':False,'count':len(results), 'passed':sum(r['pass'] for r in results), 'results':results}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cases',action='store_true');parser.add_argument('--food',type=Path);parser.add_argument('--core',type=Path)
    parser.add_argument('--as-of',default='2026-10-10T00:00:00Z');parser.add_argument('--report',type=Path)
    args=parser.parse_args()
    legacy.utc(args.as_of)
    if args.cases:report=run_cases();valid=report['passed']==report['count'] and report['count']>0
    else:
        food=load_json(args.food or ROOT/'supabase/seed/templates/food-v1.template.json');errors=validate_food(food,args.as_of)
        if args.core and not errors:errors+=validate_core(load_json(args.core),food,args.as_of)
        report={'valid':not errors,'errors':errors,'publicationPerformed':False};valid=not errors
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({k:v for k,v in report.items() if k!='results'},ensure_ascii=False,indent=2))
    return 0 if valid else 1

if __name__=='__main__':raise SystemExit(main())
