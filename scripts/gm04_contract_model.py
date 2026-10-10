"""GM-04 proposed field contract. No DB schema, RPC DTO or seed publication."""
from copy import deepcopy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_ID = 'food-v1/roadmap-v2/GM-04.1'
FOOD_VERSION = '1.1.0'
CORE_VERSION = '1.0.0'
UTC_PATTERN = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$'
UUID_PATTERN = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
SEMVER_PATTERN = r'^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$'
MEALS = ['breakfast', 'lunch', 'dinner', 'snack']
RIGHTS = ['unknown', 'granted', 'licensed', 'public_domain', 'denied']
REVIEW = ['draft', 'verified', 'published']
SOURCE_GROUPS = ['name','description','taxonomy','image','menu','price','coordinates','address','hours','availability','coverage']


def obj(fields, required=None):
    return {'type': 'object', 'properties': fields, 'required': list(fields) if required is None else required,
            'additionalProperties': False}


def nullable(schema):
    return {'anyOf': [schema, {'type': 'null'}]}


def text():
    return {'type': 'string', 'minLength': 1, 'pattern': r'\S'}


def uuid_schema():
    return {'type': 'string', 'pattern': UUID_PATTERN}


def enum(values):
    return {'type': 'string', 'enum': values}


def array(items, **limits):
    return {'type': 'array', 'items': items, **limits}


def flavor_schema():
    component = obj({'present': {'type': ['boolean', 'null']},
                     'intensity': enum(['none','low','medium','high','unknown'])})
    return obj({k: deepcopy(component) for k in ['spicy','salty','sweet','sour']})


def artwork_schema():
    return obj({'url': {'type':'string','pattern':r'^https?://[^\s]+$'},
                'sourceRef': nullable(uuid_schema()), 'usageRights': enum(RIGHTS),
                'license': nullable(text()), 'attribution': nullable(text())})


def interval_schema():
    return obj({'startTime': {'type':'string','pattern':r'^([01]\d|2[0-3]):[0-5]\d$'},
                'endTime': {'type':'string','pattern':r'^([01]\d|2[0-3]):[0-5]\d$'},
                'endDayOffset': {'type':'integer','minimum':0,'maximum':1},
                'is24Hours': {'type':'boolean'}})


def primitive(field):
    t = field['type']
    if t in ['string','enum']: s = enum(field['values']) if t == 'enum' else text()
    elif t == 'uuid': s = uuid_schema()
    elif t in ['integer','number','boolean']: s = {'type':t}
    elif t in ['stringArray','uuidArray']:
        item = uuid_schema() if t == 'uuidArray' else enum(field['values']) if 'values' in field else text()
        s = array(item, uniqueItems=True)
    elif t == 'utc': s = {'type':'string','pattern':UTC_PATTERN}
    elif t == 'date': s = {'type':'string','pattern':r'^\d{4}-\d{2}-\d{2}$'}
    elif t == 'time': s = {'type':'string','pattern':r'^([01]\d|2[0-3]):[0-5]\d$'}
    elif t == 'timezone': s = text()  # IANA existence is checked by zoneinfo in semantic runner.
    elif t == 'semver': s = {'type':'string','pattern':SEMVER_PATTERN}
    elif t == 'sha256': s = {'type':'string','pattern':r'^[0-9a-f]{64}$'}
    elif t == 'object': s = {'type':'object','properties':{k:uuid_schema() for k in SOURCE_GROUPS},'additionalProperties':False}
    elif t == 'flavor': s = flavor_schema()
    elif t == 'artwork': s = artwork_schema()
    elif t == 'intervals': s = array(interval_schema())
    elif t == 'geojson':
        s = obj({'type':{'const':'Polygon'}, 'coordinates':array(array(array({'type':'number'}, minItems=2, maxItems=2), minItems=4), minItems=1)})
    elif t == 'profile':
        fields = FOOD['dishes']['fields']
        s = obj({k:primitive(fields[k]) for k in ['cuisineIds','categoryIds','mealSlots','timeHints','temperature','flavor','origin']}, [])
        s['minProperties'] = 1
    else: raise ValueError(t)
    if 'min' in field: s['minimum'] = field['min']
    if 'max' in field: s['maximum'] = field['max']
    return nullable(s) if field['nullable'] else s


FOOD = deepcopy(json.loads((ROOT/'data-preparation/config/data_contract_v1.json').read_text())['entities'])
FOOD['venues']['fields']['scheduleId'] = {'type':'uuid','nullable':True,'ref':'weeklySchedules','refKey':'scheduleId',
    'description':'Binding lịch quán riêng; null là chưa biết, không mượn lịch món'}
for name in ['weeklySchedules','dateExceptions']:
    FOOD[name]['fields']['lastOrder'] = {'type':'time','nullable':True,'description':'Giờ địa phương nhận món cuối có nguồn; null khi chưa biết'}
    FOOD[name]['fields']['lastOrderDayOffset'] = {'type':'integer','nullable':True,'min':0,'max':1,
        'description':'0 ngày bắt đầu, 1 ngày hôm sau; phải cùng null với lastOrder'}

PRICE = obj({'priceMin':nullable({'type':'number','minimum':0}), 'priceMax':nullable({'type':'number','minimum':0}),
             'unit':nullable(enum(FOOD['venueDishes']['fields']['unit']['values'])),
             'currency':nullable(enum(FOOD['venueDishes']['fields']['currency']['values'])),
             'servingSize':nullable(text()), 'sourceRef':nullable(uuid_schema())})
BUDGET = obj({'min':nullable({'type':'number','minimum':0}), 'max':nullable({'type':'number','minimum':0}),
              'currency':{'const':'VND'}, 'unit':{'const':'person'}})


def f(t='string', *, null=False, values=None, ref=None, unit=None, privacy=None, source=None, description='', minimum=None, maximum=None, schema=None):
    d = {'type':t, 'nullable':null, 'description':description, 'privacy':privacy, 'source':source,
         'unit':unit, 'default':'no implicit default', 'version':CONTRACT_ID}
    if values is not None: d['values'] = values
    if ref: d['ref'] = ref
    if minimum is not None: d['min'] = minimum
    if maximum is not None: d['max'] = maximum
    if schema is not None: d['schema'] = nullable(schema) if null else schema
    return d


def uid(ref=None, **kw): return f('uuid', ref=ref, **kw)
def ts(**kw): return f('utc', unit='UTC ISO 8601 Z', **kw)
def v(): return f('integer', minimum=1, description='Record version monotonic, server increment')
def en(values, **kw): return f('enum', values=values, **kw)
def ids(ref=None, **kw): return f('uuidArray', ref=ref, **kw)
def field_obj(schema, **kw): return f('object', schema=schema, **kw)

# Each entity specifies the access boundary; these are data fields, not public RPC snapshots.
CORE = {}
def entity(name, fields, unique, privacy, source, spec):
    fields = {'id':uid(description='Stable UUID, immutable key; never display name'), **fields, 'version':v()}
    for key,d in fields.items():
        if d['privacy'] is None: d['privacy']=privacy
        if d['source'] is None: d['source']=source
        if not d['description']: d['description']=key+'; '+source
    CORE[name] = {'primaryKey':'id','fields':fields,'unique':unique,'privacy':privacy,'spec':spec}

entity('profiles', {'userId':uid(ref='auth.users', source='auth.uid'), 'displayName':f(schema={'type':'string','minLength':1,'maxLength':24,'pattern':r'\S'}, privacy='self; roster display name only'), 'createdAt':ts()}, [['userId']], 'self', 'authenticated user/server', 'IDENTITY_PRIVACY_SPEC')
entity('rooms', {
 'code':f(schema={'type':'string','pattern':r'^[A-HJ-NP-Z2-9]{6}$'}, description='Server-generated invitation code; not authorization'),
 'hostUserId':uid(ref='auth.users'), 'state':en(['LOBBY','ROUND_1','ROUND_2','DECIDED','NO_CONSENSUS','CANCELLED','EXPIRED']),
 'createdAt':ts(), 'updatedAt':ts(), 'expiresAt':ts(), 'mealSlot':en(MEALS),
 'timeHint':en(['late_night'], null=True), 'budget':field_obj(BUDGET,null=True), 'avoidRecent':f('boolean'),
 'anchorId':uid(ref='food.publicAnchors'), 'coverageId':uid(ref='food.coverageAreas'), 'radiusM':f('number',minimum=0,unit='metres; positive; server-config cap not hardcoded'),
 'desiredAt':ts(), 'timezone':f('timezone',unit='IANA'), 'serviceMode':en(['dine_in','takeaway','delivery']),
 'catalogueVersion':f('semver'), 'datasetVersion':f('semver'), 'eligibilityVersion':f(), 'contextVersion':v(), 'poolVersion':v(), 'policyVersion':en(['decision-v2']),
 'poolSeed':f(), 'rosterUserIds':ids(ref='auth.users'), 'consentSnapshot':field_obj(array(obj({'userId':uuid_schema(),'historyConsent':{'type':'boolean'}})),privacy='server_only'),
 'evaluatedAt':ts(null=True), 'lockedAt':ts(null=True)
}, [['code']], 'member snapshot via RPC; consent/roster lock server_only', 'server confirmed context', 'ROOM_SPEC; FOOD_DATA_SPEC')
entity('members', {'roomId':uid(ref='rooms'), 'userId':uid(ref='auth.users'), 'nickname':f(schema={'type':'string','minLength':1,'maxLength':24,'pattern':r'\S'}), 'ready':f('boolean'), 'historyConsent':f('boolean',privacy='self; locked snapshot server_only'), 'joinedAt':ts(), 'leftAt':ts(null=True)}, [['roomId','userId']], 'member roster; own mutation RPC', 'authenticated user/server', 'ROOM_SPEC')
entity('preferences', {'roomId':uid(ref='rooms'), 'userId':uid(ref='auth.users'), 'cuisineIds':ids(ref='food.taxonomy'), 'categoryIds':ids(ref='food.taxonomy'), 'temperature':en(['hot','warm','cold','ambient','unknown'],null=True), 'flavor':field_obj(flavor_schema(),null=True), 'updatedAt':ts()}, [['roomId','userId']], 'self only; host cannot read others', 'self declared; not inferred from votes', 'CATALOG_PREFERENCES_SPEC; IDENTITY_PRIVACY_SPEC')
entity('roundDishes', {'roomId':uid(ref='rooms'), 'round':f('integer',minimum=1,maximum=2), 'choiceId':uid(description='Same immutable dish/variant choice across rounds'), 'dishId':uid(ref='food.dishes'), 'variant':f(null=True), 'offeringId':uid(ref='food.venueDishes'), 'venueId':uid(ref='food.venues'), 'ordinal':f('integer',minimum=0,maximum=7), 'datasetVersion':f('semver'), 'scheduleId':uid(ref='food.weeklySchedules.scheduleId'), 'scheduleVersion':v(), 'effectiveProfile':f('profile',null=True), 'price':field_obj(PRICE), 'poolVersion':v()}, [['roomId','round','choiceId'],['roomId','round','dishId','variant'],['roomId','round','ordinal']], 'member locked pool via snapshot', 'one offering and its schedule snapshot; no cross-venue merging', 'FOOD_DATA_SPEC; ROOM_SPEC')
entity('submissions', {'roomId':uid(ref='rooms'), 'memberId':uid(ref='members'), 'round':f('integer',minimum=1,maximum=2), 'intentId':uid(), 'requestId':uid(), 'payloadHash':f('sha256'), 'poolVersion':v(), 'acceptedAt':ts()}, [['roomId','round','memberId'],['memberId','intentId']], 'self/trusted finalize only; host no raw ballot', 'server ACK of complete explicit submission', 'API_CONTRACT; OFFLINE_SYNC_SPEC')
entity('votes', {'submissionId':uid(ref='submissions'), 'roundDishId':uid(ref='roundDishes'), 'value':en(['WANT','OK','NO','KEEP','REMOVE'])}, [['submissionId','roundDishId']], 'self/trusted finalize only', 'explicit submitted ballot; no UNSET/default KEEP', 'DECISION_SPEC; IDENTITY_PRIVACY_SPEC')
entity('results', {'roomId':uid(ref='rooms'), 'winnerRoundDishId':uid(ref='roundDishes',null=True), 'reasonCode':en(['UNANIMOUS_WANT','ACCEPTABLE_FINAL','EMPTY_INTERSECTION','ALL_REMOVED']), 'matchTier':en(['PERFECT','CONSENSUS','COMPROMISE','NO_CONSENSUS']), 'policyVersion':en(['decision-v2']), 'tiedChoiceIds':ids(privacy='server_only; never shared snapshot'), 'finalizedAt':ts()}, [['roomId']], 'member result via RPC; ties server_only', 'trusted finalize/persist once; not client computed', 'DECISION_SPEC; API_CONTRACT')
entity('consents', {'userId':uid(ref='auth.users'), 'roomId':uid(ref='rooms',null=True), 'scope':en(['personal_history','group_history','notifications']), 'enabled':f('boolean'), 'grantedAt':ts(null=True), 'revokedAt':ts(null=True), 'expiresAt':ts(null=True)}, [['userId','roomId','scope']], 'self only; group snapshot trusted server', 'explicit opt-in/withdrawal', 'CONTEXT_HISTORY_SPEC; IDENTITY_PRIVACY_SPEC')
entity('histories', {'scope':en(['personal','group']), 'ownerUserId':uid(ref='auth.users',null=True), 'memberUserIds':ids(ref='auth.users'), 'groupKey':f('sha256'), 'resultId':uid(ref='results'), 'dishId':uid(ref='food.dishes'), 'dishName':f(), 'mealSlot':en(MEALS), 'matchTier':en(['PERFECT','CONSENSUS','COMPROMISE']), 'finalizedAt':ts(), 'expiresAt':ts(), 'consentIds':ids(ref='consents')}, [['scope','ownerUserId','groupKey','resultId']], 'personal owner; group exact roster and all opted in', 'minimal result summary; never raw votes/GPS/anchor/mood', 'CONTEXT_HISTORY_SPEC')
entity('friendInvitations', {'senderUserId':uid(ref='auth.users'), 'recipientUserId':uid(ref='auth.users'), 'state':en(['pending','accepted','rejected','cancelled','expired']), 'createdAt':ts(), 'expiresAt':ts(), 'respondedAt':ts(null=True)}, [], 'sender/recipient only; accept recipient', 'explicit invitation; no contact upload', 'SOCIAL_DISCOVERY_SPEC; IDENTITY_PRIVACY_SPEC')
entity('friends', {'lowUserId':uid(ref='auth.users'), 'highUserId':uid(ref='auth.users'), 'acceptedAt':ts()}, [['lowUserId','highUserId']], 'two parties only', 'canonical sorted accepted pair; unfriend removes link', 'SOCIAL_DISCOVERY_SPEC')
entity('roomInvitations', {'roomId':uid(ref='rooms'), 'friendId':uid(ref='friends'), 'senderUserId':uid(ref='auth.users'), 'recipientUserId':uid(ref='auth.users'), 'state':en(['pending','accepted','rejected','cancelled','expired']), 'eventId':uid(ref='events'), 'createdAt':ts(), 'expiresAt':ts(), 'respondedAt':ts(null=True)}, [['eventId']], 'sender/recipient only; no automatic join/ready', 'server checks accepted pair and room at create/accept', 'SOCIAL_DISCOVERY_SPEC; API_CONTRACT')
entity('inbox', {'ownerUserId':uid(ref='auth.users'), 'eventId':uid(ref='events'), 'readAt':ts(null=True), 'createdAt':ts(), 'expiresAt':ts()}, [['ownerUserId','eventId']], 'owner only', 'server notification projection; refetch permissions', 'NOTIFICATIONS_LINKS_SPEC')
entity('devices', {'userId':uid(ref='auth.users'), 'deviceKey':f(), 'platform':en(['android']), 'pushToken':f(null=True,privacy='owner register/unregister; trusted sender only; never log'), 'permission':en(['granted','denied','unknown']), 'active':f('boolean'), 'createdAt':ts(), 'lastSeenAt':ts()}, [['userId','deviceKey']], 'owner/trusted sender only', 'device permission/provider registration', 'NOTIFICATIONS_LINKS_SPEC; IDENTITY_PRIVACY_SPEC')
entity('events', {'kind':en(['ROOM_INVITED','ROOM_RESULT_READY']), 'roomId':uid(ref='rooms'), 'invitationId':uid(ref='roomInvitations',null=True), 'resultId':uid(ref='results',null=True), 'recipientUserIds':ids(ref='auth.users'), 'dedupeKey':f(), 'createdAt':ts(), 'expiresAt':ts()}, [['dedupeKey']], 'trusted sender only; minimal ref payload', 'server transaction event; dispatch after commit', 'NOTIFICATIONS_LINKS_SPEC; API_CONTRACT')
entity('deliveries', {'eventId':uid(ref='events'), 'recipientUserId':uid(ref='auth.users'), 'deviceId':uid(ref='devices',null=True), 'state':en(['pending','sent','failed','expired']), 'attempts':f('integer',minimum=0), 'ticketId':f(null=True,privacy='trusted sender only'), 'receiptId':f(null=True,privacy='trusted sender only'), 'lastAttemptAt':ts(null=True), 'expiresAt':ts()}, [['eventId','recipientUserId','deviceId']], 'trusted sender only', 'provider ACK/receipt; duplicate delivery possible', 'NOTIFICATIONS_LINKS_SPEC')
entity('idempotency', {'userId':uid(ref='auth.users'), 'operation':en(['create_room','join_room','update_preferences','update_context','set_ready','start_room','submit_ballot','cancel_room','leave_room','create_friend_invite','accept_friend_invite','reject_friend_invite','unfriend','create_room_invite','accept_room_invite','reject_room_invite','register_push_device','unregister_push_device','delete_history']), 'requestId':uid(), 'payloadHash':f('sha256'), 'expectedVersion':f('integer',minimum=1,null=True), 'response':field_obj(obj({'roomId':nullable(uuid_schema()), 'resultId':nullable(uuid_schema()), 'serverVersion':{'type':'integer','minimum':1}})), 'createdAt':ts(), 'expiresAt':ts()}, [['userId','operation','requestId']], 'trusted RPC only; caller receives own ACK', 'immutable payload hash; ACK lookup before version check', 'API_CONTRACT; OFFLINE_SYNC_SPEC')

FOOD_UNIQUE = {'taxonomy':[['type','code']], 'venueDishes':[['venueId','dishId','variant','serviceMode']], 'dateExceptions':[['scheduleId','localDate']], 'datasetVersions':[['datasetVersion']]}


def field_schema(field, entity_name, food=False):
    s = deepcopy(field.get('schema')) if 'schema' in field else primitive(field)
    s['description'] = field['description']
    s['x-contractId'] = CONTRACT_ID
    s['x-nullable'] = field['nullable']
    s['x-default'] = 'no implicit default'
    s['x-unit'] = field.get('unit') or ('UTC ISO 8601 Z' if field['type']=='utc' else 'local HH:mm' if field['type']=='time' else 'IANA' if field['type']=='timezone' else 'none')
    s['x-privacy'] = field.get('privacy', 'published read only after review; trusted publisher writes')
    s['x-source'] = field.get('source', 'fieldSources/sourceRef; missing evidence stays draft/null/unknown')
    s['x-ref'] = (('food.'+field['ref']+('.'+field['refKey'] if 'refKey' in field else '')) if food and 'ref' in field else field.get('ref'))
    s['x-unique'] = 'primary key' if field.get('primaryKey') else 'see entity x-unique; not globally unique'
    return s


def schema(kind):
    definitions = FOOD if kind=='food' else CORE
    rows = {}
    for name, definition in definitions.items():
        props = {}
        for key, field in definition['fields'].items():
            props[key] = field_schema({**field, 'primaryKey':key==definition['primaryKey']}, name, kind=='food')
        row = obj(props)
        row['x-unique'] = [ [definition['primaryKey']], *(FOOD_UNIQUE.get(name,[]) if kind=='food' else definition['unique']) ]
        rows[name] = row
    return {'$schema':'https://json-schema.org/draft/2020-12/schema', '$id':f'https://example.invalid/anyfood/{kind}-v1.schema.json',
            'title':f'GM-04 draft {kind} field contract', 'x-contractId':CONTRACT_ID, '$defs':rows,
            **obj({'contractVersion':{'const':FOOD_VERSION if kind=='food' else CORE_VERSION},
                   'datasetVersion':{'type':'string','pattern':SEMVER_PATTERN}, 'fixtureOnly':{'type':'boolean'},
                   'entities':obj({name:array({'$ref':f'#/$defs/{name}'}) for name in rows})})}


def adapt_food_legacy(bundle):
    """Copy, never rewrite source artifacts. Missing lastOrder is not inferred."""
    b = deepcopy(bundle)
    if b['contractVersion'] != '1.0.0': raise ValueError('Only legacy food 1.0.0 supported')
    b['contractVersion'] = FOOD_VERSION
    for row in b['entities']['venues']: row['scheduleId'] = None
    for row in b['entities']['weeklySchedules']: row.update(lastOrder=None,lastOrderDayOffset=None)
    for row in b['entities']['dateExceptions']:
        if row['lastOrder'] is not None: raise ValueError('Legacy lastOrder needs explicit day-offset review')
        row['lastOrderDayOffset'] = None
    for row in b['entities']['datasetVersions']: row['contractVersion'] = FOOD_VERSION
    return b
