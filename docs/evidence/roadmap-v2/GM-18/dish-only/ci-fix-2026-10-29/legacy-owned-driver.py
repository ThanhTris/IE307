"""Run the unchanged legacy CLI entrypoint inside the fresh owned QA harness."""
import json
from pathlib import Path
import sys
from unittest.mock import patch

ROOT=next(p for p in Path(__file__).resolve().parents if (p/'scripts/gm06_isolated_http_check.py').is_file())
sys.path.insert(0,str(ROOT/'scripts'))
import gm06_isolated_http_check as qa
import gm18_eligibility_check as legacy

report_path=Path('/tmp/gm18-pr139-fixed-legacy.json')

def exercise(db,rpc,check,users):
    # Legacy CLI uses PostgreSQL's default Unix socket. Bridge only inside
    # this newly created, namespace-owned QA container; no app DB or secrets.
    qa.command(['docker','exec',db.container,'sh','-c',
                'mkdir -p /var/run/postgresql; ln -s /tmp/.s.PGSQL.5432 /var/run/postgresql/.s.PGSQL.5432'])
    with patch.object(legacy.food,'CONTAINER',db.container), \
         patch.object(sys,'argv',['gm18_eligibility_check.py','--report',str(report_path)]):
        legacy.main()
    report=json.loads(report_path.read_text(encoding='utf-8'))
    check('full legacy CLI entrypoint with ordered rollback passes',report['result'],'Pass')
    check('all60 legacy vectors exercised',report['fixtureCaseCount'],60)
    check('nested legacy disposable database removed',report['cleanup'],'process-created database dropped')

qa.run(Path('/tmp/gm18-pr139-fixed-legacy-harness.json'),exercise=exercise,
       scope='legacy GM18 SQL CLI on new owned PG; synthetic auth DDL, no GoTrue/app DB',
       extra_sources=[ROOT/'scripts/gm18_eligibility_check.py',ROOT/'supabase/rollback/0033_gm18_dish_catalogue.down.sql',ROOT/'supabase/rollback/0005_gm18_discovery_rpc.down.sql'])
