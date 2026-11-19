"""GM36 consumer of the existing sealed GM03 disposable QA runtime.

No default stack, migrations, app database or provider credentials are accepted.
"""
import argparse
import json
import uuid

from gm40_manifest_check import load_manifest, verify_manifest
from dish_policy_worker import ManifestQAContainerDB


def verify(path):
    manifest, state = load_manifest(path)
    verify_manifest(path, manifest)
    return manifest, state


def cleanup(path, namespace, users):
    namespace = str(uuid.UUID(namespace))
    users = [str(uuid.UUID(value)) for value in users]
    if not 1 <= len(users) <= 2 or len(set(users)) != len(users):
        raise ValueError('GM36_DISTINCT_OWNED_GUESTS_REQUIRED')
    manifest, state = verify(path)
    db = ManifestQAContainerDB(path, state['worker']['nonce'])
    ids = ','.join("'" + value + "'::uuid" for value in users)
    db.psql(f"""begin;
      create temp table gm36_owned_users as select id from auth.users
      where id=any(array[{ids}]) and is_anonymous
        and raw_user_meta_data->>'gm36_test_namespace'='{namespace}';
      do $$begin if (select count(*) from gm36_owned_users)<>{len(users)} then
        raise exception 'GM36_OWNERSHIP_REQUIRED'; end if;end$$;
      delete from public.profiles where user_id in (select id from gm36_owned_users);
      delete from auth.users where id in (select id from gm36_owned_users);
      commit;""")
    return {'result': 'Pass', 'cleanup': 'namespace-verified QA guests removed'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--qa-manifest', required=True)
    parser.add_argument('--cleanup-namespace')
    parser.add_argument('--users', nargs='+')
    args = parser.parse_args()
    if bool(args.cleanup_namespace) != bool(args.users):
        parser.error('cleanup requires both namespace and users')
    if args.cleanup_namespace:
        result = cleanup(args.qa_manifest, args.cleanup_namespace, args.users)
    else:
        manifest, _ = verify(args.qa_manifest)
        result = {'result': 'Pass', 'runId': manifest['runId'],
                  'baseUrl': manifest['endpoint']['baseUrl'],
                  'workdir': manifest['workdir'], 'sealSha256': manifest['sealSha256']}
    print(json.dumps(result))


if __name__ == '__main__':
    main()
