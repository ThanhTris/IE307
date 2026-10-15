"""Only process-owned GM21 synthetic DB/guests; no app DB mutations."""
import argparse
import hashlib
import json
from datetime import timedelta
import uuid
from gm21_history_check import TestDB,food,ROOT

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['create','cleanup','capture','lobby','retention','rate-reset','stats']);p.add_argument('namespace',type=uuid.UUID);p.add_argument('users',nargs='+',type=uuid.UUID);a=p.parse_args()
 users=[str(u) for u in a.users]
 if not 1<=len(users)<=3 or len(set(users))!=len(users):raise ValueError('Distinct namespaced guests required')
 t=TestDB(a.namespace,users);ids=','.join(food.literal(u)+'::uuid' for u in users)
 def check_users():
  count=t.admin.psql("select count(*) from auth.users where id=any(array["+ids+"]) and is_anonymous and raw_user_meta_data->>'gm21_test_namespace'='"+str(a.namespace)+"';").strip()
  if count!=str(len(users)):raise RuntimeError('Guest namespace not verified')
 check_users()
 if a.mode=='cleanup':
  if t.admin.psql("select count(*) from pg_database where datname='"+t.name+"';").strip()=='1':
   t.db=food.LocalDB(t.name);t.created=True;t.marked=True;t.cleanup()
  t.admin.psql("delete from public.profiles where user_id=any(array["+ids+"]) and exists(select 1 from auth.users u where u.id=profiles.user_id and u.raw_user_meta_data->>'gm21_test_namespace'='"+str(a.namespace)+"');")
  t.admin.psql("delete from auth.users where id=any(array["+ids+"]) and is_anonymous and raw_user_meta_data->>'gm21_test_namespace'='"+str(a.namespace)+"';")
  print(json.dumps({'cleanup':'owned DB and synthetic guests removed'}));return
 if len(users)!=3:raise ValueError('Three guests required')
 if a.mode=='create':
  try:
   t.create();t.db.psql('delete from public.histories;');t.scalar("gm21_private.record_result('"+t.result+"')")
   real_ids=t.ids();real_ids['personalId']=t.scalar("(select id from public.histories where scope='personal' and owner_user_id='"+users[0]+"' and result_id='"+t.result+"')");real_ids['groupId']=t.scalar("(select id from public.histories where scope='group' and result_id='"+t.result+"')");real_ids['otherPersonalId']=t.scalar("(select id from public.histories where scope='personal' and owner_user_id='"+users[1]+"' and result_id='"+t.result+"')")
   print(json.dumps({'database':t.name,**real_ids,'fixtureOnly':True,'finalizeIntegration':'Not run; synthetic persisted result + trusted port'}));return
  except Exception:t.cleanup();raise
 t.db=food.LocalDB(t.name)
 if t.db.psql('select namespace::text from public.gm21_test_owner;').strip()!=str(a.namespace):raise RuntimeError('DB ownership not verified')
 if a.mode=='lobby':print(json.dumps(t.clone('http-lobby',lobby=True)));return
 if a.mode=='retention':
  old=t.clone('http-retention',age=timedelta(hours=25));t.scalar('gm17_private.cleanup()');print(json.dumps(old));return
 if a.mode=='rate-reset':t.db.psql('delete from gm21_private.windows where user_id=any(array['+ids+']);');print('{}');return
 if a.mode=='stats':
  print(json.dumps({'personalSettingVersion':t.scalar("coalesce((select version from gm21_private.settings where user_id='"+users[0]+"' and scope='personal'),0)")}));return
 if a.mode=='capture':
  value=t.db.psql("select jsonb_build_object('room',to_jsonb(r),'result',to_jsonb(s)) from public.rooms r join public.results s on s.room_id=r.id where r.id='"+t.room+"';")
  print(json.dumps({'decisionSha256':hashlib.sha256(value.encode()).hexdigest()}));return
if __name__=='__main__':main()
