#!/usr/bin/env python3
"""Local server timeout worker. Never resets/migrates a database or reads votes."""
import importlib.util
import hashlib
import argparse
import json
from pathlib import Path
import re
import subprocess
import time

ROOT=Path(__file__).resolve().parents[1]


class QAContainerDB:
    """Read/tick only the explicitly named, project-labeled v4 QA container."""
    def __init__(self,container,project_id=None,workdir=None):
        project_id=project_id or container.removeprefix("supabase_db_")
        expected_suffix=re.sub(r"^supabase_db_ie307-dish-v4-qa-", "", container)
        if (not re.fullmatch(r"supabase_db_ie307-dish-v4-qa-[0-9]{8}(?:-[0-9]+-[0-9]+)?",container)
                or project_id!="ie307-dish-v4-qa-"+expected_suffix
                or container!="supabase_db_"+project_id
                or not re.fullmatch(r"ie307-dish-v4-qa-[0-9]{8}(?:-[0-9]+-[0-9]+)?",project_id)):
            raise ValueError("QA worker accepts only the dedicated IE307 dish-v4 QA container")
        result=subprocess.run(["docker","inspect",container],capture_output=True,text=True,encoding="utf-8",timeout=15)
        if result.returncode: raise RuntimeError("QA_DB_CONTAINER_NOT_FOUND")
        info=json.loads(result.stdout)[0]
        labels=info.get("Config",{}).get("Labels") or {}
        actual_workdir=Path(labels.get("com.supabase.cli.workdir","")).resolve()
        if info.get("Name")!="/"+container or not info.get("State",{}).get("Running"):
            raise RuntimeError("QA_DB_CONTAINER_NOT_RUNNING")
        workdir_parts=re.split(r"[/\\]",str(actual_workdir))
        if (labels.get("com.supabase.cli.project")!=project_id
                or workdir_parts[-2:]!=["review-results",project_id.removeprefix("ie307-")]
                or not (actual_workdir.is_relative_to(ROOT/".work"/"ci") or actual_workdir.is_relative_to(ROOT/"review-results"))):
            raise RuntimeError("QA_DB_CONTAINER_OWNERSHIP_MISMATCH")
        if workdir and Path(workdir).resolve()!=actual_workdir:
            raise RuntimeError("QA_DB_WORKDIR_MISMATCH")
        config=(actual_workdir/"supabase"/"config.toml").read_text(encoding="utf-8")
        if (not re.search(r'^project_id\s*=\s*"'+re.escape(project_id)+r'"\s*$',config,re.M)
                or not re.search(r'^port\s*=\s*54361\s*$',config,re.M)
                or not re.search(r'^port\s*=\s*54362\s*$',config,re.M)):
            raise RuntimeError("QA_DB_CONFIG_MISMATCH")
        image=info.get("Config",{}).get("Image","")
        if not image.startswith(("public.ecr.aws/supabase/postgres:17","ghcr.io/supabase/postgres:17","supabase/postgres:17")):
            raise RuntimeError("QA_DB_POSTGRES17_REQUIRED")
        self.container=container
        self.database="postgres"
        self.is_dish_v4_qa=True
        self.qa_project_id=project_id
        if not self.psql("select current_setting('server_version');").strip().startswith("17."):
            raise RuntimeError("QA_DB_POSTGRES17_REQUIRED")

    def psql(self,sql):
        result=subprocess.run(["docker","exec","-i",self.container,"psql","-X","-q","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-v","VERBOSITY=sqlstate","-At"],input=sql,capture_output=True,text=True,encoding="utf-8",timeout=30)
        if result.returncode:
            code=re.search(r"ERROR:\s+([0-9A-Z]{5})(?:[:\s]|$)",result.stderr)
            raise RuntimeError("QA_PSQL_ERROR_"+(code.group(1) if code else "PROCESS"))
        return result.stdout

    def transaction(self,sql):
        return self.psql(sql)


def verify(db):
    if db.psql("select to_regprocedure('dish_v3_private.tick()') is not null;").strip()!="t":
        raise RuntimeError("Apply/review migration 0026 on the intended local DB first; this worker never applies it")
    if db.psql("select count(*) from public.schema_versions where schema_version='0.8.0' and contract_id='dish-session-v3/ADR-019';").strip()!="1":
        raise RuntimeError("Expected schema 0.8.0 is missing; review ledger before starting worker")
    source=(ROOT/"supabase/migrations/0026_dish_session_policy.sql").read_text(encoding="utf-8")
    has_v4=db.psql("select count(*) from public.schema_versions where schema_version='0.9.0' and contract_id='dish-session-v4/roadmap-v2/GM-07.B';").strip()=="1"
    has_v4_consent=db.psql("select count(*) from public.schema_versions where schema_version='0.9.1' and contract_id='dish-session-v4/roadmap-v2/GM-07.B';").strip()=="1"
    legacy_entrypoint="public.dish_session_unversioned_legacy" if has_v4 else "public.dish_session"
    legacy_names=[(legacy_entrypoint,"public.dish_session"),("dish_v3_private.tick","dish_v3_private.tick"),
      ("dish_v3_private.finish","dish_v3_private.finish"),("dish_v3_private.reconcile","dish_v3_private.reconcile"),
      ("dish_v3_private.view","dish_v3_private.view")]
    expected_sources={ROOT/"supabase/migrations/0026_dish_session_policy.sql":legacy_names}
    if has_v4:
        if db.psql("select to_regprocedure('dish_v4_private.tick()') is not null;").strip()!="t":
            raise RuntimeError("Schema 0.9.0 exists without the v4 policy worker entrypoint")
        expected_sources[ROOT/"supabase/migrations/0027_dish_session_v4.sql"]=[("dish_v4_private.tick","dish_v4_private.tick")]
        if not has_v4_consent:
            raise RuntimeError("Schema 0.9.0 is missing the 0.9.1 account-consent snapshot migration")
        expected_sources[ROOT/"supabase/migrations/0029_dish_v4_history_consent.sql"]=[
          ("dish_v4_private.account_history_consent","dish_v4_private.account_history_consent"),
          ("dish_v4_private.member_history_default","dish_v4_private.member_history_default"),
          ("gm21_private.prepare_consents","gm21_private.prepare_consents"),
          ("dish_v4_private.has_locked_history_consent","dish_v4_private.has_locked_history_consent"),
          ("dish_v4_private.pin_history_consent_scopes","dish_v4_private.pin_history_consent_scopes"),
          ("dish_v4_private.save_history","dish_v4_private.save_history")]
    for source_path,functions in expected_sources.items():
      source=source_path.read_text(encoding="utf-8")
      for name,source_name in functions:
        found=re.search(r"create(?: or replace)? function "+re.escape(source_name)+r"\(.*? as \$\$(.*?)\$\$;",source,re.S)
        if not found: raise RuntimeError("Cannot verify source function "+source_name)
        expected=hashlib.sha256(found[1].encode("utf-8")).hexdigest()
        actual=db.psql("select encode(extensions.digest(convert_to(replace(p.prosrc,chr(13)||chr(10),chr(10)),'UTF8'),'sha256'),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='"+name.split(".")[0]+"' and p.proname='"+name.split(".")[1]+"';").strip()
        if actual!=expected:
            raise RuntimeError("Deployed function differs from checked source: "+name+"; reconcile draft/ledger before running")
        safe=db.psql("select p.prosecdef and p.proconfig @> array['search_path=pg_catalog'] from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='"+name.split(".")[0]+"' and p.proname='"+name.split(".")[1]+"';").strip()
        if safe!="t": raise RuntimeError("Deployed security/search_path differs: "+name)
    return has_v4


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qa-db-container",help="Explicit disposable v4 QA container; rejects application DB names")
    parser.add_argument("--qa-project-id",help="Exact Supabase project id reported by Docker labels")
    parser.add_argument("--qa-workdir",help="Exact isolated Supabase workdir; must be under .work/ci or review-results")
    args=parser.parse_args()
    if args.qa_db_container:
        if not args.qa_project_id or not args.qa_workdir:
            raise SystemExit("QA v4 worker requires --qa-project-id and --qa-workdir")
        db=QAContainerDB(args.qa_db_container,args.qa_project_id,args.qa_workdir)
    else:
        spec=importlib.util.spec_from_file_location("dish_food_db",ROOT/"supabase/seed/import_food_data.py")
        food=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(food)
        db=food.LocalDB()
    has_v4=verify(db)
    print("Dish policy worker: verified local Supabase, heartbeat and timeout reconcile every second")
    try:
        while True:
            db.psql("select dish_v3_private.tick();")
            if has_v4:
                db.psql("select dish_v4_private.tick();")
            time.sleep(1)
    except KeyboardInterrupt:
        print("Dish policy worker stopped")


if __name__=="__main__":
    main()
