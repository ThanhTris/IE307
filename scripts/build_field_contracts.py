"""Deterministic offline GM-04 artifacts; --check detects drift without writing."""
from copy import deepcopy
import argparse
import hashlib
import json
from pathlib import Path
import uuid
from gm04_contract_model import (ROOT, FOOD, CORE, FOOD_VERSION, CORE_VERSION, CONTRACT_ID, OPERATION_RULES,
                                schema, adapt_food_legacy)


def sid(entity,key):
    namespace=uuid.uuid5(uuid.NAMESPACE_URL,'anyfood:gm04:fixture-v1:'+entity)
    return str(uuid.uuid5(namespace,key))


def dumps(value):return json.dumps(value,ensure_ascii=False,indent=2)+'\n'


def templates():
    food=adapt_food_legacy(json.loads((ROOT/'data-preparation/templates/examples/dataset.json').read_text(encoding='utf-8')))
    # All synthetic IDs belong to a new namespace, not the survey or legacy catalogue registry.
    replacements={}
    for name,definition in FOOD.items():
        for i,row in enumerate(food['entities'][name]):replacements[row[definition['primaryKey']]]=sid(name,'row-'+str(i))
    for i,row in enumerate(food['entities']['weeklySchedules']):replacements.setdefault(row['scheduleId'],sid('schedule','group-'+str(i)))
    def remap(v):
        if isinstance(v,str):return replacements.get(v,v)
        if isinstance(v,list):return [remap(x) for x in v]
        if isinstance(v,dict):return {k:remap(x) for k,x in v.items()}
        return v
    food=remap(food);fd=food['entities']
    venue=fd['venues'][0];venue.update(lat=10.85,lng=106.76,adminAreaId='simulation-only',status='active')
    venue_schedule=next(s for s in fd['weeklySchedules'] if s['ownerType']=='venue')
    venue['scheduleId']=venue_schedule['scheduleId']
    venue_schedule.update(status='open',startTime='21:00',endTime='03:00',endDayOffset=1,
                          lastOrder='02:30',lastOrderDayOffset=1,fieldSources={'hours':fd['dataSources'][0]['sourceRef']})
    fd['weeklySchedules'][0].update(lastOrder='01:30',lastOrderDayOffset=1,fieldSources={'hours':fd['dataSources'][0]['sourceRef']})
    fd['coverageAreas'][0]['boundary']={'type':'Polygon','coordinates':[[[106.70,10.80],[106.80,10.80],[106.80,10.90],[106.70,10.90],[106.70,10.80]]]}
    # This is still draft simulation: open hours do not establish live inventory or publishability.
    core={'contractVersion':CORE_VERSION,'datasetVersion':'0.1.0','fixtureOnly':True,'entities':{k:[] for k in CORE}}
    d=core['entities'];a=sid('user','a');b=sid('user','b');room_id=sid('room','one');pool_id=sid('roundDish','one');choice=sid('choice','one');res=sid('result','one');friend=sid('friend','one');invite=sid('roomInvitation','one');ev=sid('event','invite');src=fd['dataSources'][0]['sourceRef'];o=fd['venueDishes'][0]
    created='2026-10-09T14:00:00Z';locked='2026-10-09T14:10:00Z';final='2026-10-09T14:20:00Z';expiry='2026-10-09T15:00:00Z'
    def row(name,key,**fields):
        r={'id':sid(name,key),**fields,'version':1};d[name].append(r);return r
    for key,user in [('a',a),('b',b)]:row('profiles',key,userId=user,displayName='Người '+key.upper()+' mô phỏng',createdAt=created)
    room=row('rooms','one',code='ABC234',hostUserId=a,state='DECIDED',createdAt=created,updatedAt=final,expiresAt=expiry,mealSlot='dinner',timeHint='late_night',budget=None,avoidRecent=False,anchorId=fd['publicAnchors'][0]['anchorId'],coverageId=fd['coverageAreas'][0]['areaId'],radiusM=1500,desiredAt='2026-10-09T15:30:00Z',timezone='Asia/Ho_Chi_Minh',serviceMode='delivery',catalogueVersion='0.2.0',datasetVersion='0.1.0',eligibilityVersion='fixture-only-not-eligibility',contextVersion=1,poolVersion=1,policyVersion='decision-v2',poolSeed='simulation-fixed-seed',rosterUserIds=[a,b],consentSnapshot=[{'userId':a,'historyConsent':True},{'userId':b,'historyConsent':True}],evaluatedAt=locked,lockedAt=locked)
    # Use the actual entity ID everywhere, not the helper namespace for a semantic alias.
    room_id=room['id']
    price={k:o[k] for k in ['priceMin','priceMax','unit','currency','servingSize']};price['sourceRef']=src
    pool=row('roundDishes','one',roomId=room_id,round=1,choiceId=choice,dishId=o['dishId'],variant=o['variant'],offeringId=o['offeringId'],venueId=o['venueId'],ordinal=0,datasetVersion='0.1.0',scheduleId=o['scheduleId'],scheduleVersion=1,effectiveProfile=None,price=price,poolVersion=1);pool_id=pool['id']
    for key,user in [('a',a),('b',b)]:
        m=row('members',key,roomId=room_id,userId=user,nickname='Người '+key.upper()+' mô phỏng',ready=True,historyConsent=True,joinedAt=created,leftAt=None)
        row('preferences',key,roomId=room_id,userId=user,cuisineIds=[fd['taxonomy'][0]['id']],categoryIds=[fd['taxonomy'][1]['id']],temperature='unknown',flavor=None,updatedAt=created)
        sub=row('submissions',key,roomId=room_id,memberId=m['id'],round=1,intentId=sid('intent',key),requestId=sid('request',key),payloadHash=hashlib.sha256(('synthetic-ballot-'+key).encode()).hexdigest(),poolVersion=1,acceptedAt='2026-10-09T14:19:00Z')
        row('votes',key,submissionId=sub['id'],roundDishId=pool_id,value='WANT')
        for scope in ['personal_history','group_history','notifications']:row('consents',key+'-'+scope,userId=user,roomId=room_id,scope=scope,enabled=True,grantedAt=created,revokedAt=None,expiresAt='2026-11-01T00:00:00Z')
    result=row('results','one',roomId=room_id,winnerRoundDishId=pool_id,reasonCode='UNANIMOUS_WANT',matchTier='PERFECT',policyVersion='decision-v2',tiedChoiceIds=[choice],finalizedAt=final);res=result['id']
    groupkey=hashlib.sha256('|'.join(sorted([a,b])).encode()).hexdigest()
    for scope,who,users in [('personal',a,[a]),('group',None,[a,b])]:
        cs=[c['id'] for c in d['consents'] if c['scope']==('personal_history' if scope=='personal' else 'group_history') and c['userId'] in users]
        row('histories',scope,scope=scope,ownerUserId=who,memberUserIds=users,groupKey=groupkey,resultId=res,dishId=o['dishId'],dishName=fd['dishes'][0]['name'],mealSlot='dinner',matchTier='PERFECT',finalizedAt=final,expiresAt='2026-11-01T00:00:00Z',consentIds=cs)
    friend_row=row('friends','one',lowUserId=min(a,b),highUserId=max(a,b),acceptedAt=created);friend=friend_row['id']
    row('friendInvitations','one',senderUserId=a,recipientUserId=b,state='accepted',createdAt='2026-10-08T00:00:00Z',expiresAt='2026-10-15T00:00:00Z',respondedAt=created)
    invite=sid('roomInvitations','one');ev=sid('events','invite')
    row('roomInvitations','one',roomId=room_id,friendId=friend,senderUserId=a,recipientUserId=b,state='accepted',eventId=ev,createdAt=created,expiresAt=expiry,respondedAt='2026-10-09T14:01:00Z')
    row('events','invite',kind='ROOM_INVITED',roomId=room_id,invitationId=invite,resultId=None,recipientUserIds=[b],dedupeKey='simulation-invite-one',createdAt=created,expiresAt=expiry)
    result_event=row('events','result',kind='ROOM_RESULT_READY',roomId=room_id,invitationId=None,resultId=res,recipientUserIds=[a,b],dedupeKey='simulation-result-one',createdAt=final,expiresAt='2026-10-16T14:20:00Z')
    row('inbox','invite',ownerUserId=b,eventId=ev,readAt=None,createdAt=created,expiresAt=expiry)
    row('inbox','result',ownerUserId=a,eventId=result_event['id'],readAt=None,createdAt=final,expiresAt='2026-10-16T14:20:00Z')
    dev=row('devices','b',userId=b,deviceKey='simulation-device-b',platform='android',pushToken=None,permission='unknown',active=False,createdAt=created,lastSeenAt=final)
    row('deliveries','invite-b',eventId=ev,recipientUserId=b,deviceId=dev['id'],state='pending',attempts=0,ticketId=None,receiptId=None,lastAttemptAt=None,expiresAt=expiry)
    row('idempotency','submit-a',userId=a,operation='submit_ballot',requestId=d['submissions'][0]['requestId'],payloadHash=d['submissions'][0]['payloadHash'],expectedVersion=1,response={'roomId':room_id,'resultId':res,'serverVersion':1},createdAt=final,expiresAt='2026-10-10T14:20:00Z')
    return food,core


def coverage(kind, document, template):
    records=[]
    def example(s):
        if 'anyOf' in s:
            if any(p.get('type')=='null' for p in s['anyOf']):return None
            return example(s['anyOf'][0])
        if 'const' in s:return s['const']
        if 'enum' in s:return 'unknown' if 'unknown' in s['enum'] else s['enum'][0]
        t=s.get('type')
        if isinstance(t,list):return None if 'null' in t else True
        if t=='object':return {k:example(v) for k,v in s['properties'].items() if k in s['required']}
        if t=='array':return []
        if t=='boolean':return True
        if t in ['integer','number']:return s.get('minimum',1)
        if t=='string':
            pattern=s.get('pattern','')
            if 'https?' in pattern:return 'https://example.invalid/synthetic-artwork'
            if '[0-9a-f]{8}' in pattern:return sid('example','reference')
            if 'HH' in pattern or '[01]' in pattern:return '12:00'
            return 'synthetic example'
        return None
    def walk(s,path,value,parent_required=True,metadata=None):
        metadata = {**(metadata or {}), **{k:v for k,v in s.items() if k.startswith('x-')}}
        nullable=any(p.get('type')=='null' for p in s.get('anyOf',[])) or 'null' in (s.get('type') if isinstance(s.get('type'),list) else [])
        shape=next((p for p in s.get('anyOf',[]) if p.get('type')!='null'),s)
        typ=shape.get('type','const' if 'const' in shape else 'any')
        enum=shape.get('enum',[shape['const']] if 'const' in shape else [])
        invalid='INVALID_ENUM' if enum else None if not nullable else 123 if typ=='string' else '__wrong_type__'
        unknown=None if nullable else 'unknown' if 'unknown' in enum else [] if typ=='array' else 'not permitted (required known value)'
        if value is None and not nullable:value=example(shape)
        unit='amount in sibling currency/unit' if path.endswith(('.priceMin','.priceMax')) else 'VND/person' if path.endswith(('.budget.min','.budget.max')) else 'ISO currency code' if path.endswith('.currency') else 'latitude degrees WGS84' if path.endswith('.lat') else 'longitude degrees WGS84' if path.endswith('.lng') else metadata.get('x-unit','none')
        fk=None if path=='dataSources.sourceRef' else 'food.dataSources' if path.endswith(('.sourceRef','.menuSource')) or '.fieldSources.' in path else 'food.taxonomy' if path.endswith(('.cuisineIds','.categoryIds')) else 'auth.users' if path.endswith('.consentSnapshot[].userId') else metadata.get('x-ref')
        records.append({'contract':kind,'path':path,'type':typ,'required':parent_required,'nullable':nullable,'default':metadata.get('x-default','no implicit default'),'enum':enum,'unit':unit,'timezone':'UTC' if 'At' in path or 'Until' in path else 'IANA venue timezone for local time/date' if any(k in path for k in ['Time','lastOrder','localDate']) else 'not applicable','fk':fk,'unique':metadata.get('x-unique','see entity constraints'),'privacy':metadata.get('x-privacy','inherit parent'),'version':CONTRACT_ID,'source':metadata.get('x-source','inherit parent'),'validExample':value,'invalidExample':invalid,'unknownExample':unknown})
        if typ=='object':
            for key,child in shape.get('properties',{}).items():
                walk(child,path+'.'+key,value.get(key) if isinstance(value,dict) else None,key in shape.get('required',[]),metadata)
        if typ=='array' and isinstance(shape.get('items'),dict) and shape['items'].get('type')=='object':
            item=value[0] if isinstance(value,list) and value else None
            walk(shape['items'],path+'[]',item,True,metadata)
    for name,definition in document['$defs'].items():
        sample=template['entities'][name][0]
        for key,field in definition['properties'].items():walk(field,name+'.'+key,sample[key],key in definition['required'])
    for key,field in document['properties'].items():
        if key!='entities':walk(field,'bundle.'+key,template[key])
    return records


def markdown_tables(records):
    def cell(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).replace('|','\\|').replace('\n',' ')
    out=[]
    for kind in ['food','core']:
        out += [f'## {kind} fields','', '| Field | Type / required / nullable | Default / enum | Unit / timezone | FK / unique | Privacy / source | Version | Valid / invalid / unknown |','| --- | --- | --- | --- | --- | --- | --- | --- |']
        for r in records:
            if r['contract']!=kind:continue
            out.append('| '+ ' | '.join([r['path'],f"{r['type']} / {r['required']} / {r['nullable']}",cell([r['default'],r['enum']]),cell([r['unit'],r['timezone']]),cell([r['fk'],r['unique']]),cell([r['privacy'],r['source']]),r['version'],cell([r['validExample'],r['invalidExample'],r['unknownExample']])])+' |')
        out.append('')
    return '\n'.join(out)


def artifacts():
    food,core=templates();fs=schema('food');cs=schema('core')
    records=coverage('food',fs,food)+coverage('core',cs,core)
    table=markdown_tables(records)
    case_ids={c['id'] for c in json.loads((ROOT/'tests/fixtures/food-v1/contract-cases.json').read_text(encoding='utf-8'))['cases']}
    paths={(r['contract'],r['path']) for r in records}
    use_cases=json.loads((ROOT/'scripts/gm04_use_cases.json').read_text(encoding='utf-8'))['useCases']
    use_doc=['## Use case → fields → artifacts/cases → consumer','',
             'GM-06 maps fields/FK/constraints to DB. GM-07 receives nullability/privacy for DTO/client. Later tasks implement behavior; structural fixtures do not prove queries or authorization.','',
             '| Use case | Entity.field | Schema/template/example và case IDs | Consumers |','| --- | --- | --- | --- |']
    for row in use_cases:
        row['contractId']=CONTRACT_ID
        row['artifacts']=[]
        for field in row['fields']:
            kind,path=field['contract'],field['path']
            if (kind,path) not in paths:raise ValueError('Unknown coverage field: '+path)
            entity,key=path.split('.',1)
            row['artifacts'].append({'field':path,'schema':f'supabase/seed/templates/{kind}-v1.schema.json#/$defs/{entity}/properties/{key}',
                'template':f'supabase/seed/templates/{kind}-v1.template.json#/entities/{entity}/0/{key}',
                'examples':'docs/data/field-coverage.json: '+kind+'.'+path})
        if not row['caseIds'] or not set(row['caseIds'])<=case_ids:raise ValueError('Unknown/empty coverage case IDs: '+row['id'])
        field_names=', '.join(f"{f['contract']}:{f['path']}" for f in row['fields'])
        use_doc.append('| '+ ' | '.join([row['useCase'],field_names,'Schema/template pointers trong use-case-coverage.json; '+', '.join(row['caseIds']),', '.join(dict.fromkeys(row['consumers']))])+' |')
    use_table='\n'.join(use_doc)+'\n\n'
    coverage_doc='# GM-04 — Field coverage\n\nGenerated by `python3 scripts/build_field_contracts.py`. Proposal for reviewer, not approval.\n\n'+f'{len(records)} field paths, including nested structured values. Required=true means the key must exist; nullable is separate. Empty arrays/maps are explicit unknown where documented. Defaults are never applied by validation.\n\n'+use_table+table
    dictionary='''# GM-04 — Food và core data dictionary

Contract proposal `food-v1/roadmap-v2/GM-04.2`; review Pending. Food interchange
**1.1.0**, core **1.1.0**. Đây là field contract cho GM-06 schema và GM-07 DTO/client,
không là SQL schema, API triển khai hoặc approval. Nguồn: [food spec](../specs/FOOD_DATA_SPEC.md),
[data model](../architecture/DATA_MODEL.md), [API contract](../architecture/API_CONTRACT.md),
[room](../specs/ROOM_SPEC.md), [decision](../specs/DECISION_SPEC.md),
[privacy](../specs/IDENTITY_PRIVACY_SPEC.md), [history](../specs/CONTEXT_HISTORY_SPEC.md),
[notifications](../specs/NOTIFICATIONS_LINKS_SPEC.md), [social](../specs/SOCIAL_DISCOVERY_SPEC.md).

## Cách dùng và authority

`python3 scripts/build_field_contracts.py --check` kiểm artifact không lệch model.
`python3 scripts/validate_field_contracts.py --cases --report /tmp/gm04-cases.json`
chạy schema + FK/unique/semantic cases offline. Lệnh trực tiếp:

```sh
python3 scripts/validate_field_contracts.py --food supabase/seed/templates/food-v1.template.json --core supabase/seed/templates/core-v1.template.json --as-of 2026-10-10T00:00:00Z
```

Templates có entity thật về cấu trúc nhưng toàn bộ bản ghi **mô phỏng**,
fixtureOnly=true, nguồn example.invalid, artwork=null; không dùng làm verified
seed. Auth users trong fixture được profiles mô phỏng; production FK auth.uid
phải do GM-06/16/RLS xác minh, không client tự khai userId.

[Schema food](../../supabase/seed/templates/food-v1.schema.json),
[schema core](../../supabase/seed/templates/core-v1.schema.json),
[template food](../../supabase/seed/templates/food-v1.template.json),
[template core](../../supabase/seed/templates/core-v1.template.json),
[contract cases](../../tests/fixtures/food-v1/contract-cases.json),
[field coverage](FIELD_COVERAGE.md) và [evidence](../evidence/roadmap-v2/GM-04/CHECKS.md).
Model Python là nguồn generate. Schema Draft 2020-12 dùng vocabulary đóng;
runner stdlib kiểm tất cả keyword đang dùng và fail nếu thêm keyword chưa hỗ trợ.
Không tuyên bố validator tổng quát hoặc đã chạy thư viện bên thứ ba. JSON Schema
kiểm shape; FK, thời gian, quyền publish và liên kết record cần semantic runner.
Quy tắc required/additionalProperties/nullable theo
[JSON Schema reference](https://json-schema.org/understanding-json-schema/reference/object).

## ID, version, null và nguồn

Food UUID registry legacy giữ nguyên; đổi display name không đổi ID. Fixture mới
UUIDv5 namespace `anyfood:gm04:fixture-v1:<entity>` và key bất biến, không ID dữ liệu
khảo sát. Production core IDs là UUID server/auth cấp, không sinh từ tên hoặc
email. Record version số nguyên >=1 tăng đơn điệu; dataset/catalogue/schema version
SemVer độc lập checksum. Policy decision-v2; eligibilityVersion do GM-18 cấp,
không suy từ food contract. Pool/context version lock tại start.

Mọi key schema.required phải tồn tại. JSON null chỉ cho nullable; enum unknown
chỉ khi được liệt kê; []/{} thiếu evidence không là false/0 hoặc hợp lệ để publish.
Không default phiếu OK/KEEP. CSV legacy ô trống=null, array/object là JSON trong ô,
UTF-8 BOM; adapter copy 1.0.0 → 1.1.0 thêm venue.scheduleId/weekly lastOrder và
lastOrderDayOffset. Không suy offset từ giờ cũ; exception có lastOrder cần review
trước adapter. Snapshot catalogue 0.2.0/contract1.0.0/checksum giữ nguyên.

Nguồn từng nhóm qua fieldSources/sourceRef. Quyền/license/attribution/enteredBy/
reviewedBy độc lập phải có bằng chứng khi verified/published. Không tự suy TTL,
quyền ảnh hoặc allergen safety từ tên/URL. Artwork chỉ dùng source/license hợp lệ;
null nếu thiếu. validUntil kết thúc loại cuối: đúng hạn đã stale. Dataset còn hạn
không che menu/hours/source con stale. Structurally valid không là publishable.

## Food, địa lý và giờ

Cuisine Việt/Thái từ taxonomy ID, origin north/central/south/unknown/not_applicable
là nguồn gốc món, không nơi bán. Category family/preparation đa nhãn. Meal slots
breakfast/lunch/dinner/snack; late_night là hint. Alias cùng món; variant thuộc
one offering. Nhiệt độ tách vị; presence null/intensity unknown là chưa biết,
true/unknown có vị chưa biết mức. Không hợp đặc tính giữa offering.

Giá >=0, min<=max, currency/unit/source bắt buộc khi biết; null không là miễn phí.
Portion/group/menu_item_unspecified không tự chia thành giá/người. Budget VND/person
chỉ ưu tiên mềm. Offering FK dish/branch/own schedule; venue.scheduleId là lịch
quán riêng. WGS84 lat/lng độ; polygon [lng,lat], ring khép kín; public anchor trong
coverage có bằng chứng, không GPS người. RadiusM >0 mét; giới hạn tối đa/horizon/
TTL do server config được reviewer chốt, không đặt số tùy ý ở field contract.

UTC timestamp ISO 8601 Z; local HH:mm/date theo IANA timezone quán. ISO weekday1–7,
[start,end), endDayOffset0/1, is24Hours phải đúng khoảng1440 phút. lastOrder và
lastOrderDayOffset cùng null hoặc cùng biết, nằm trong ca mở và có source hours.
Exception closed/unknown intervals=[], lastOrder=null; closed ngày hôm sau chặn
phần ca đêm hôm trước. Sold_out/paused/available override có observedAt/expiresAt;
hết hạn về unknown, không mặc định available. GM-18 tính giao lịch quán–món,
lastOrder, ngoại lệ, coverage/radius và inventory tại desiredAt. Runner GM-04
chỉ kiểm dữ liệu đầu vào, không triển khai eligibility hoặc Haversine.

## Core, privacy và consumer

Rooms khóa roster/context/pool/consent/versions; roundDishes tối đa8 mỗi vòng,
choice theo dish/variant không alias; vòng2 là tập con vòng1. Submissions là ACK
đầy đủ của own ballot; votes WANT/OK/NO vòng1, KEEP/REMOVE vòng2, không UNSET.
Missing member/submission không là OK; GM-15/20 tính candidate/finalize, chọn một
lần và persist result. Field validator không tự tính score/tie/winner hoặc RNG.

Preferences, submissions/votes chỉ owner/trusted server; host không có quyền
phiếu thô. Results.tiedChoiceIds internal. Public RPC snapshot phải project field
allowlist, không serialize toàn bộ bundle/row; GM-07/17 kiểm quyền thật. History
minimal winner/meal/time/tier, không votes/GPS/anchor/mood; personal own opt-in,
group đúng locked roster và mọi người consent. Withdraw/delete phải xóa summary
và ngừng dùng chống lặp; validator chỉ kiểm trạng thái input, không cleanup DB.

Friends là accepted canonical pair; invitation pending không thành friend; room
invite chỉ same accepted pair, không auto-join/ready, expiry không muộn hơn room.
Inbox private owner; event payload refs tối thiểu, devices/token/ticket private,
result event sau persisted result; server dispatch sau commit. Không thử push
thật hoặc claim exactly-once. Idempotency unique(user,operation,requestId), hash
bất biến, ACK trước version; response refs/version tối thiểu, không chứa raw votes.
API error enums/DTO/wire responses do GM-07 review; templates là data representation.

Weather/mood **reserved P2 GM-38**, không có field chứa GPS/mood trong MVP schema;
additionalProperties=false chặn nhét dữ liệu nhạy cảm. Retention24h/30 ngày, room60
phút, invitation7 ngày và token/event TTL trong spec là đề xuất cần reviewer/config;
field contract có expiresAt tường minh, không tự điền TTL. Expired persisted rows
có thể hợp cấu trúc; authorization/cleanup theo server time ở task sau.

## Bảng từng trường

Mỗi dòng có type, required, nullable, default, enum, unit/timezone, FK/unique,
privacy/source, version và valid/invalid/unknown. FK auth.users là ngoại bộ;
`weeklySchedules.scheduleId` là group FK, row.id vẫn unique. Các unique tuple
bao gồm null như giá trị có nghĩa: không cho nhân đôi offering variant chưa biết.
Nested fields kế thừa privacy/source của parent, không có default ngầm.

'''+use_table+'## Idempotency operation mapping\n\nAPI_CONTRACT P0 writes; no new endpoint implementation. expectedVersion is required only for actual room mutations; null is permitted for pre-membership join/accept and account/social/history/device writes. Auth/idempotency and endpoint ACL remain required downstream. Read RPCs and P1 auth SDK operations are outside this P0 operation enum. reject_room_invite is an existing internal state write, public DTO pending GM-07.\n\n| Internal operation | Existing RPC | Room expectedVersion required | Consumer |\n| --- | --- | --- | --- |\n'+'\n'.join(f'| {op} | {rpc or "internal invitation state; no separate RPC in API_CONTRACT"} | {required} | {task} |' for op,(rpc,required,task) in OPERATION_RULES.items())+'\n\n'+table
    files={
        'supabase/seed/templates/food-v1.schema.json':dumps(fs),
        'supabase/seed/templates/core-v1.schema.json':dumps(cs),
        'supabase/seed/templates/food-v1.template.json':dumps(food),
        'supabase/seed/templates/core-v1.template.json':dumps(core),
        'docs/data/field-coverage.json':dumps(records),
        'docs/data/use-case-coverage.json':dumps({'contractId':CONTRACT_ID,'useCases':use_cases}),
        'docs/data/FIELD_COVERAGE.md':coverage_doc,
        'docs/data/FOOD_DATA_DICTIONARY.md':dictionary,
    }
    manifest={'contractId':CONTRACT_ID,'fixtureOnly':True,'foodContractVersion':FOOD_VERSION,'coreContractVersion':CORE_VERSION,
              'casesSha256':hashlib.sha256((ROOT/'tests/fixtures/food-v1/contract-cases.json').read_bytes()).hexdigest(),
              'fieldCount':len(records),'files':{name:hashlib.sha256(content.encode()).hexdigest() for name,content in files.items()}}
    files['tests/fixtures/food-v1/artifact-manifest.json']=dumps(manifest)
    return files


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    wrong=[]
    for name,content in artifacts().items():
        p=ROOT/name
        if args.check:
            if not p.is_file() or p.read_bytes()!=content.encode():wrong.append(name)
        else:p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding='utf-8',newline='\n')
    print(dumps({'consistent':not wrong,'drift':wrong,'written':not args.check}))
    return bool(wrong)

if __name__=='__main__':raise SystemExit(main())
