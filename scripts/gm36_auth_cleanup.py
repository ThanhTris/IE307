"""Remove only this runner's namespace-verified anonymous test identities."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('gm36_food', ROOT / 'supabase/seed/import_food_data.py')
food = importlib.util.module_from_spec(spec)
spec.loader.exec_module(food)


def safe_run(args, sql=None):
    result = subprocess.run(args, input=sql, text=True, encoding='utf-8', capture_output=True, timeout=30)
    if result.returncode:
        raise RuntimeError('GM36_OWNED_AUTH_CLEANUP_FAILED')
    return result.stdout


def main():
    namespace = str(uuid.UUID(sys.argv[1]))
    users = [str(uuid.UUID(value)) for value in sys.argv[2:]]
    if not 1 <= len(users) <= 2 or len(set(users)) != len(users):
        raise ValueError('One or two distinct owned guests required')
    food.LocalDB.run = staticmethod(safe_run)
    db = food.LocalDB()
    ids = ','.join(food.literal(u) + '::uuid' for u in users)
    # Verification and deletion share a transaction; no partially verified cleanup.
    db.psql(f"""begin;
      create temp table gm36_owned_users as select id from auth.users
      where id=any(array[{ids}]) and is_anonymous
        and raw_user_meta_data->>'gm36_test_namespace'='{namespace}';
      do $$begin if (select count(*) from gm36_owned_users)<>{len(users)} then
        raise exception 'GM36_OWNERSHIP_REQUIRED'; end if;end$$;
      delete from public.profiles where user_id in (select id from gm36_owned_users);
      delete from auth.users where id in (select id from gm36_owned_users);
      commit;""")
    print(json.dumps({'cleanup': 'namespace-verified synthetic guests removed'}))


if __name__ == '__main__':
    main()
