"""SQL upgrade fixtures against the existing v4 writer, never a second runtime.

Used only by the namespace-owned GM06 runner. Returns boolean/hash assertions;
no ballots, auth credentials, seeds or full private room rows are reported.
"""
from copy import deepcopy
import json
import uuid

CONTRACT = 'dish-session-v4/roadmap-v2/GM-07.B'
EMPTY = {'cuisineIds': [], 'categoryIds': [], 'temperature': None,
         'flavor': None, 'budget': None, 'avoidRecent': False}


class V4Compatibility:
    def __init__(self, db, users, check, literal):
        self.db, self.users, self.check, self.literal = db, users, check, literal
        self.rooms = []

    def invoke(self, command, user=0, **payload):
        mutating = command not in ('snapshot', 'history', 'result', 'getDefaultPreferences', 'previewJoin')
        if mutating:
            payload.setdefault('requestId', str(uuid.uuid4()))
        payload['contractVersion'] = CONTRACT
        lines = self.db.psql("begin;select dish_v4_private.tick();set local role authenticated;select set_config('request.jwt.claim.sub',"+
                              self.literal(self.users[user])+",true);select public.dish_session("+
                              self.literal(command)+','+self.literal(json.dumps(payload))+"::jsonb);commit;").splitlines()
        response = json.loads(next(line for line in reversed(lines) if line.startswith('{')))
        if not response.get('ok'):
            # Only a safe error key, never a request/ballot/response payload.
            raise AssertionError('v4 fixture '+command+': '+response.get('error', {}).get('messageKey', 'unknown error'))
        return response['data']

    def consent(self, scope, enabled, user=0):
        self.db.psql("begin;set local role authenticated;select set_config('request.jwt.claim.sub',"+
                     self.literal(self.users[user])+",true);select public.update_history_consent("+
                     self.literal(str(uuid.uuid4()))+','+self.literal(scope)+','+
                     self.literal(json.dumps(enabled))+"::jsonb);commit;")
        actual=self.db.psql('select enabled from gm21_private.settings where user_id='+self.literal(self.users[user])+" and scope="+self.literal(scope)+';').strip()
        if actual != str(enabled).lower()[0]:
            raise AssertionError('v4 fixture consent did not persist')

    def history(self, user=0):
        return self.invoke('history', user)['items']

    def setup(self):
        for who in range(20):
            self.consent('personal', True, who)
            self.consent('group', True, who)
        preference={**EMPTY, 'temperature': 'cold'}
        self.invoke('updateDefaultPreferences', expectedRevision=0, preferences=preference)
        self.saved_defaults=self.invoke('getDefaultPreferences')
        for label,count,no_consensus in [('decided20',20,False),('none2',2,True)]:
            created=self.invoke('create', displayName='GM06 v4 QA',
                                settings={'dishCount':10,'mealSlot':'dinner','desiredAt':None}, preferences=deepcopy(EMPTY))
            for who in range(1,count):
                self.invoke('join', who, code=created['code'], displayName='GM06 member')
            snap=self.invoke('snapshot', roomId=created['roomId'])
            self.invoke('start', roomId=created['roomId'], expectedVersion=snap['version'])
            for who in range(count):
                snap=self.invoke('snapshot', who, roomId=created['roomId'])
                votes=[{'roundDishId':dish['roundDishId'], 'choice':'NO' if no_consensus else ('WANT' if i==0 else 'OK')}
                       for i,dish in enumerate(snap['pool'])]
                request={'requestId':str(uuid.uuid4()),'roomId':created['roomId'],'expectedVersion':snap['version'],
                         'round':snap['round'],'poolVersion':snap['poolVersion'],'votes':votes}
                self.invoke('submit', who, **request)
            result=self.invoke('result',roomId=created['roomId'])
            self.check('v4 pre-upgrade real writer '+label, result['status']=='NO_CONSENSUS' if no_consensus else result['status']=='DECIDED')
            self.rooms.append({'room':created['roomId'],'result':result,'lastSubmit':request,'lastUser':count-1})
        self.saved_history=self.history()
        first=self.rooms[0]
        group=next(h for h in self.saved_history if h['roomId']==first['room'] and h['scope']=='group')
        self.check('v4 pre-upgrade group20 uses persisted result',group['result']==first['result'])
        self.check('v4 pre-upgrade cohort20 is actually stored',self.db.psql("select cardinality(member_user_ids) from dish_v4_private.history where id="+self.literal(group['historyId'])+';').strip(),'20')
        self.before=self.fingerprint()

    def fingerprint(self):
        # Ordered hashes only; never output internal votes/seed/consent values.
        return self.db.psql("""select encode(sha256(convert_to(jsonb_build_array(
          (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from dish_v4_private.results x),
          (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from dish_v4_private.history x),
          (select coalesce(jsonb_agg(to_jsonb(x) order by user_id),'[]') from dish_v4_private.default_preferences x),
          (select coalesce(jsonb_agg(to_jsonb(x) order by room_id,user_id),'[]') from dish_v4_private.room_preferences x),
          (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.consents x)
          )::text,'UTF8')),'hex');""").strip()

    def after_upgrade(self):
        self.check('v4 persisted result/history/preferences/consents unchanged by migration',self.fingerprint()==self.before)
        for stored in self.rooms:
            self.check('v4 result RPC reads same stored projection after upgrade',self.invoke('result',roomId=stored['room'])==stored['result'])
        self.check('v4 history RPC reads same stored projection after upgrade',self.history()==self.saved_history)
        self.check('v4 default-preference RPC unchanged by upgrade',self.invoke('getDefaultPreferences')==self.saved_defaults)
        self.check('v4 rows are not silently mirrored into independent storage',self.db.psql('select count(*) from gm06_canonical.results;').strip(),'0')

    def after_storage_checks(self):
        # Delete an actual v4 group history, then replay the terminal submit ACK.
        second=self.rooms[1]
        history=next(h for h in self.history() if h['roomId']==second['room'] and h['scope']=='group')
        self.invoke('deleteHistory',historyId=history['historyId'])
        self.invoke('submit',second['lastUser'],**second['lastSubmit'])
        self.check('v4 delete + exact terminal replay does not resurrect history',
                   not any(h['historyId']==history['historyId'] for h in self.history()))
        first=self.rooms[0]
        self.db.psql("select set_config('dish_v4.writer','on',false);update public.rooms set created_at=statement_timestamp()-interval '3 days',expires_at=statement_timestamp()-interval '2 days',version=version+1 where id="+
                     self.literal(first['room'])+";select set_config('dish_v4.writer','off',false);select gm17_private.cleanup();")
        self.check('actual shared cleanup removes v4 operational room/session',self.db.psql('select not exists(select 1 from public.rooms where id='+
                   self.literal(first['room'])+') and not exists(select 1 from dish_v4_private.sessions where room_id='+self.literal(first['room'])+');').strip(),'t')
        self.check('shared cleanup restores v4 writer guard setting',self.db.psql("select current_setting('dish_v4.writer',true) is distinct from 'on';").strip(),'t')
        item=next(h for h in self.history() if h['roomId']==first['room'] and h['scope']=='group')
        self.check('v4 history still reads fixed result after operational cleanup',item['result']==first['result'])
        self.check('v4 result source survives operational cleanup',self.db.psql('select projection='+self.literal(json.dumps(first['result']))+'::jsonb from dish_v4_private.results where id='+self.literal(first['result']['resultId'])+';').strip(),'t')
        self.consent('group', False,1)
        self.check('v4 revocation removes authorized group history after cleanup',not any(h['scope']=='group' and h['roomId']==first['room'] for h in self.history(1)))
        self.check('v4 group revoke preserves separately consented personal history',any(h['scope']=='personal' and h['roomId']==first['room'] for h in self.history(1)))
        self.before_down=self.fingerprint()

    def after_down(self):
        self.check('down leaves retained v4 result/history/preferences/consents intact',self.fingerprint()==self.before_down)
