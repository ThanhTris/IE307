#!/usr/bin/env python3
"""Run GM-08 after GM-17; adapt only the expected schema registry versions."""
import inspect
import json
from pathlib import Path
import sys
import gm08_import_check as upstream
from gm17_access_check import ROOT,psql,guard_local


def main():
    guard_local()
    original=upstream.importer.LocalDB.psql
    provenance=(ROOT/'supabase/migrations/0003_food_provenance_description.sql').read_text(encoding='utf-8')
    migration=(ROOT/'supabase/migrations/0004_access_policies.sql').read_text(encoding='utf-8')
    uid=psql('postgres',"select pg_get_functiondef('auth.uid()'::regprocedure);")+';'
    def upgraded(db,sql):
        result=original(db,sql)
        if sql==provenance:
            # GM-08 creates this disposable database; never upgrade another DB.
            if not db.database.startswith('gm08_check_'):
                raise RuntimeError('Unexpected GM-08 disposable database')
            original(db,uid)
            original(db,migration)
        return result
    upstream.importer.LocalDB.psql=upgraded
    original_main=upstream.main
    source=inspect.getsource(original_main)
    old="check('food schema version unchanged',db.psql('select schema_version from public.schema_versions;').strip(),'0.1.0')"
    new="check('schema0.2 registry preserved after import rollback',db.psql('select schema_version from public.schema_versions order by schema_version;').splitlines(),['0.1.0','0.2.0'])"
    if source.count(old)!=1:
        raise RuntimeError('Upstream suite changed; review the registry assertion adaptation')
    # Keep all real queries and the actual two-version assertion; no filtering
    # of database output, assertion failures, or other cases.
    exec(compile(source.replace(old,new),__file__,'exec'),upstream.__dict__)
    try:
        upstream.main()
        report=Path(sys.argv[sys.argv.index('--report')+1])
        result=json.loads(report.read_text(encoding='utf-8'))
        result['gm17SchemaVersion']='0.2.0'
        result['adaptation']='Only schema registry expected0.1.0+0.2.0; all other upstream cases unchanged'
        report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    finally:
        upstream.importer.LocalDB.psql=original
        upstream.main=original_main


if __name__=='__main__': main()
