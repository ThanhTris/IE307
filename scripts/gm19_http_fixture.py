"""GM-19 owned disposable fixture. Reuses GM-18 food without promoting real data."""
import json
import sys
import uuid
import re
import subprocess
import gm18_http_fixture as upstream


def diagnostic_run(args, sql=None):
    args=['VERBOSITY=verbose' if a=='VERBOSITY=sqlstate' else a for a in args]
    result=subprocess.run(args,input=sql,text=True,encoding='utf-8',capture_output=True,timeout=180)
    if result.returncode:
        code=re.search(r'ERROR:\s+([A-Z0-9]{5})',result.stderr)
        missing=re.search(r'function ([A-Za-z_\.]+\([^\n]*\)) does not exist',result.stderr)
        raise RuntimeError('GM19_DB_'+(code[1] if code else 'PROCESS')+((' missing '+missing[1]) if missing else ''))
    return result.stdout


upstream.food.LocalDB.run=staticmethod(diagnostic_run)


def main():
    mode, namespace, *users = sys.argv[1:]
    if mode in ('create', 'cleanup'):
        upstream.main()
        return
    namespace = uuid.UUID(namespace)
    admin = upstream.food.LocalDB()
    db = upstream.owned(admin, namespace, users)
    if mode == 'positive':
        bundle, _, _ = upstream.positive(namespace, users)
        db.transaction(upstream.real.load_sql(bundle))
        print(json.dumps({'simulationOnly': True, 'datasetVersion': bundle['datasetVersion'],
            'anchorId': bundle['entities']['publicAnchors'][0]['anchorId'],
            'dishId': bundle['entities']['dishes'][0]['id'],
            'offeringIds': [r['offeringId'] for r in bundle['entities']['venueDishes']],
            'categoryId': bundle['entities']['taxonomy'][-1]['id']}))
    elif mode == 'expand':
        b,_,_=upstream.positive(namespace,users)
        dish=b['entities']['dishes'][0]['id']; offer=b['entities']['venueDishes'][0]['offeringId']
        category=b['entities']['taxonomy'][-1]['id']
        new_cat=str(uuid.uuid5(namespace,'gm19-category-b'));new_dish=str(uuid.uuid5(namespace,'gm19-dish-b'))
        new_offer=str(uuid.uuid5(namespace,'gm19-offer-b'));new_schedule=str(uuid.uuid5(namespace,'gm19-schedule-b'))
        if db.psql(f"select count(*) from public.dishes where id='{new_dish}';").strip()=='0':
            def clone(table,key,old,updates):
                _,columns=upstream.food.mapping()[table]
                cols=','.join(columns); select=','.join('r.'+c for c in columns)
                return f"insert into public.{table}({cols}) select {select} from public.{table} t cross join lateral jsonb_populate_record(null::public.{table},to_jsonb(t)||{upstream.food.literal(json.dumps(updates))}::jsonb) r where t.{key}='{old}';"
            sql=['begin;set constraints all deferred;',
                clone('taxonomy','id',category,dict(id=new_cat,code='gm19-category-'+namespace.hex[:12],label='GM19 synthetic category B',version=1)),
                clone('dishes','id',dish,dict(id=new_dish,name='GM19 synthetic choice B',category_ids=[new_cat],version=1)),
                f"insert into public.schedule_groups(schedule_id,owner_type,owner_id,timezone,review_status,fixture_only,version) select '{new_schedule}',owner_type,'{new_offer}',timezone,review_status,fixture_only,1 from public.schedule_groups where schedule_id=(select schedule_id from public.venue_dishes where offering_id='{offer}');",
                clone('venue_dishes','offering_id',offer,dict(offering_id=new_offer,dish_id=new_dish,schedule_id=new_schedule,version=1))]
            old_schedule=b['entities']['venueDishes'][0]['scheduleId']
            for day in range(1,8):
                new_id=str(uuid.uuid5(namespace,'gm19-week-b-'+str(day)))
                original=db.psql(f"select id from public.weekly_schedules where schedule_id='{old_schedule}' and day_of_week={day} limit 1;").strip()
                sql.append(clone('weekly_schedules','id',original,dict(id=new_id,schedule_id=new_schedule,owner_id=new_offer,version=1)))
            sql.append('set constraints all immediate;commit;');db.psql('\n'.join(sql))
        print(json.dumps(dict(dishId=new_dish,categoryId=new_cat,simulationOnly=True)))
    elif mode == 'dataset-next':
        from datetime import datetime,timezone
        import hashlib
        version='0.19.'+str(int(datetime.now(timezone.utc).timestamp()*1000000))
        new_id=str(uuid.uuid5(namespace,version));checksum=hashlib.sha256((str(namespace)+version).encode()).hexdigest()
        _,columns=upstream.food.mapping()['dataset_versions'];cols=','.join(columns)
        updates=json.dumps(dict(id=new_id,dataset_version=version,checksum=checksum,version=1))
        db.psql(f"""begin;set constraints all deferred;
          insert into public.dataset_versions({cols}) select {','.join('r.'+c for c in columns)} from
          (select * from public.dataset_versions where review_status='published' order by checked_at desc limit 1) t
          cross join lateral jsonb_populate_record(null::public.dataset_versions,to_jsonb(t)||{upstream.food.literal(updates)}::jsonb) r;
          update public.dataset_versions set checked_at=statement_timestamp()-interval '1 second',version=version+1 where id='{new_id}';
          update public.coverage_areas set dataset_version='{version}',version=version+1 where review_status='published';
          set constraints all immediate;commit;""")
        print(json.dumps(dict(datasetVersion=version,simulationOnly=True)))
    elif mode == 'sql':
        sql = sys.stdin.read()
        print(db.psql(sql))
    elif mode == 'reload':
        source=(upstream.ROOT/'supabase/migrations/0019_room_lifecycle.sql').read_text(encoding='utf-8')
        definitions=re.findall(r'create function\s[\s\S]*?\$\$;',source)
        if len(definitions)<15: raise RuntimeError('Function extraction incomplete')
        db.psql('begin;\ndrop function if exists gm19_private.pool_for_room(uuid,uuid[]);\n'+'\n'.join(s.replace('create function','create or replace function',1) for s in definitions)+'\ncommit;')
        print(json.dumps({'reloaded':len(definitions),'ownedDatabaseOnly':True}))
    else:
        raise ValueError('Unsupported owned fixture operation')


if __name__ == '__main__':
    main()
