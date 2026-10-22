#!/usr/bin/env python3
"""Local server timeout worker. Never resets/migrates a database or reads votes."""
import importlib.util
import hashlib
from pathlib import Path
import re
import time

ROOT=Path(__file__).resolve().parents[1]


def verify(db):
    if db.psql("select to_regprocedure('dish_v3_private.tick()') is not null;").strip()!="t":
        raise RuntimeError("Apply/review migration 0026 on the intended local DB first; this worker never applies it")
    if db.psql("select count(*) from public.schema_versions where schema_version='0.8.0' and contract_id='dish-session-v3/ADR-019';").strip()!="1":
        raise RuntimeError("Expected schema 0.8.0 is missing; review ledger before starting worker")
    source=(ROOT/"supabase/migrations/0026_dish_session_policy.sql").read_text(encoding="utf-8")
    for name in ["public.dish_session","dish_v3_private.tick","dish_v3_private.finish","dish_v3_private.reconcile","dish_v3_private.view"]:
        found=re.search(r"create function "+re.escape(name)+r"\(.*? as \$\$(.*?)\$\$;",source,re.S)
        if not found: raise RuntimeError("Cannot verify source function "+name)
        expected=hashlib.sha256(found[1].encode("utf-8")).hexdigest()
        actual=db.psql("select encode(extensions.digest(convert_to(replace(p.prosrc,chr(13)||chr(10),chr(10)),'UTF8'),'sha256'),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='"+name.split(".")[0]+"' and p.proname='"+name.split(".")[1]+"';").strip()
        if actual!=expected:
            raise RuntimeError("Deployed function differs from checked source: "+name+"; reconcile draft/ledger before running")
        safe=db.psql("select p.prosecdef and p.proconfig @> array['search_path=pg_catalog'] from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='"+name.split(".")[0]+"' and p.proname='"+name.split(".")[1]+"';").strip()
        if safe!="t": raise RuntimeError("Deployed security/search_path differs: "+name)


def main():
    spec=importlib.util.spec_from_file_location("dish_food_db",ROOT/"supabase/seed/import_food_data.py")
    food=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(food)
    db=food.LocalDB()
    verify(db)
    print("Dish policy worker: verified local Supabase, heartbeat and timeout reconcile every second")
    try:
        while True:
            db.psql("select dish_v3_private.tick();")
            time.sleep(1)
    except KeyboardInterrupt:
        print("Dish policy worker stopped")


if __name__=="__main__":
    main()
