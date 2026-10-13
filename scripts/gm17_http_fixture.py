#!/usr/bin/env python3
"""Guarded synthetic namespace setup/cleanup for real JWT HTTP/Bruno tests."""
import argparse
import uuid
from gm17_access_check import guard_local,fixture_sql,psql,snake


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['prepare','cleanup'])
    parser.add_argument('namespace',type=uuid.UUID)
    parser.add_argument('users',nargs=3,type=uuid.UUID)
    args=parser.parse_args()
    guard_local()
    users=[str(x) for x in args.users]
    if len(set(users))!=3:
        raise RuntimeError('Three distinct synthetic guest identities required')
    # Never delete a caller-supplied arbitrary auth identity. Prove the random
    # namespace marker on all three anonymous guests before setup or cleanup.
    ids=','.join("'"+u+"'::uuid" for u in users)
    count=psql('postgres',f"select count(*) from auth.users where id=any(array[{ids}]) and is_anonymous and raw_user_meta_data->>'gm17_test_namespace'='{args.namespace}';").strip()
    if count!='3':
        raise RuntimeError('Synthetic namespace ownership not verified; no data touched')
    sql,b=fixture_sql(args.namespace,users=users[:2])
    if args.mode=='prepare':
        psql('postgres',sql)
        psql('postgres',"notify pgrst,'reload schema';")
        print('Synthetic namespace prepared; no dataset published.')
        return
    lines=['begin; set constraints all deferred;']
    for kind in ['core','food']:
        for entity,rows in b[kind]['entities'].items():
            key={'profiles':'id','taxonomy':'id','venueDishes':'offeringId','coverageAreas':'areaId','publicAnchors':'anchorId','dataSources':'sourceRef'}.get(entity,'id')
            ids=','.join("'"+r[key]+"'::uuid" for r in rows)
            lines.append(f'delete from public.{snake(entity)} where {snake(key)}=any(array[{ids}]);')
    groups=','.join("'"+r['scheduleId']+"'::uuid" for r in b['food']['entities']['weeklySchedules'])
    lines.append(f'delete from public.schedule_groups where schedule_id=any(array[{groups}]);')
    for table,entity in [('room_refs','rooms'),('result_refs','results'),('invitation_refs','roomInvitations'),('event_refs','events')]:
        ids=','.join("'"+r['id']+"'::uuid" for r in b['core']['entities'][entity])
        lines.append(f'delete from gm17_private.{table} where id=any(array[{ids}]);')
    lines+=['delete from auth.users where id=any(array['+','.join("'"+u+"'::uuid" for u in users)+']);','set constraints all immediate;commit;']
    psql('postgres','\n'.join(lines))
    print('Only this synthetic namespace and its three test guests removed.')


if __name__=='__main__': main()
