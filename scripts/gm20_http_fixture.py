"""GM-20: operate only a verified namespace-owned disposable database."""
import json
import sys
import uuid
import subprocess
import re
import gm19_http_fixture as base


def safe_run(args, sql=None):
    result = subprocess.run(args, input=sql, text=True, encoding='utf-8', capture_output=True, timeout=180)
    if result.returncode:
        code = re.search(r'ERROR:\s+([A-Z0-9]{5})', result.stderr)
        raise RuntimeError('GM20_DB_' + (code[1] if code else 'PROCESS'))
    return result.stdout

base.upstream.food.LocalDB.run = staticmethod(safe_run)


def main():
    mode, namespace, *users = sys.argv[1:]
    namespace = uuid.UUID(namespace)
    users = [str(uuid.UUID(u)) for u in users]
    if not (1 if mode=='cleanup' else 3) <= len(users) <= 9 or len(set(users)) != len(users):
        raise ValueError('GM20 requires three base identities plus at most six owned guests')
    admin = base.upstream.food.LocalDB()
    # The upstream marker is explicitly scoped to the original three guests.
    if mode == 'create':
        base.upstream.check_users(admin, namespace, users)
        sys.argv = [sys.argv[0], mode, str(namespace), *users[:3]]
        base.main()
        db = base.upstream.owned(admin, namespace, users[:3])
        for user in users[3:]:
            db.psql(f"insert into auth.users(id,is_anonymous) values('{user}',true);")
        return
    if mode == 'cleanup':
        base.upstream.check_users(admin, namespace, users)
        name = base.upstream.database(namespace)
        if admin.psql(f"select count(*) from pg_database where datname='{name}';").strip() == '1':
            if len(users) < 3:
                raise ValueError('Cannot verify database ownership with incomplete identities')
            base.upstream.owned(admin, namespace, users[:3])
            admin.psql('drop database ' + name + ';')
        for user in users:
            # Remove only GM22 profiles belonging to verified tagged guests.
            admin.psql(f"delete from public.profiles where user_id='{user}' and exists(select 1 from auth.users where id='{user}' and is_anonymous and raw_user_meta_data->>'gm18_test_namespace'='{namespace}');")
            admin.psql(f"delete from auth.users where id='{user}' and is_anonymous and raw_user_meta_data->>'gm18_test_namespace'='{namespace}';")
        print(json.dumps({'cleanup':'owned DB and tagged guests removed'}))
        return
    db = base.upstream.owned(admin, namespace, users[:3])
    base.upstream.check_users(admin, namespace, users)
    if mode == 'rebuild':
        # Explicit test reset: only the namespace/marker-verified disposable DB.
        # Keep tagged GoTrue guests; the owner restarts its PostgREST afterwards.
        admin.psql('drop database ' + base.upstream.database(namespace) + ' with (force);')
        sys.argv = [sys.argv[0], 'create', str(namespace), *users]
        main()
        return
    if mode == 'sql':
        print(db.psql(sys.stdin.read()))
    else:
        sys.argv = [sys.argv[0], mode, str(namespace), *users[:3]]
        base.main()


if __name__ == '__main__':
    main()
