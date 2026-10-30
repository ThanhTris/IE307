#!/usr/bin/env python3
"""GM21.3 producer-driven Auth/REST QA; owned namespaces, no application DB writes."""
import sys
import hashlib
import re
import gm20_canonical_check as qa

qa.OUTPUT=qa.ROOT/'.work/gm21-canonical'
qa.PRIVATE=qa.OUTPUT/'runtime.private.json'
qa.BRUNO=qa.ROOT/'supabase/tests/bruno/GM-21-canonical/environments/Local.runtime.private.bru'


def verify_consumer(db):
    source=(qa.ROOT/'supabase/migrations/0036_gm21_canonical_history.sql').read_text(encoding='utf8')
    functions=re.findall(r'create function ([a-z0-9_.]+)\(.*? as \$\$(.*?)\$\$;',source,re.S)
    if len(functions)!=6:
        raise RuntimeError('GM21_FUNCTION_INVENTORY_MISMATCH')
    for name,body in functions:
        schema,function=name.split('.')
        actual=db.psql("select encode(extensions.digest(convert_to(p.prosrc,'UTF8'),'sha256'),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='"+schema+"' and p.proname='"+function+"' and p.prosecdef and p.proconfig=array['search_path=pg_catalog'];").strip()
        if actual!=hashlib.sha256(body.encode('utf8')).hexdigest():
            raise RuntimeError('GM21_DEPLOYED_DEFINITION_OR_ACL_DRIFT '+name)
    qa.runtime.record('gm21-consumer-definitions','Pass',functionCount=len(functions),schemaVersion='0.13.0')


if __name__=='__main__':
    if '--bruno' in sys.argv:
        raise SystemExit('GM21 runner supports --keep, --against and --cleanup; use the HTTP request suite for manual review.')
    try:
        qa.main(http_script='scripts/gm21_canonical_http.mjs',stage='gm21-canonical-http',before_http=verify_consumer)
    except Exception as error:
        print(qa.runtime.redact(str(error)),file=sys.stderr)
        raise SystemExit(1)
