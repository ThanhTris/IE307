"""GM23.2 owned canonical notification integration runner."""
import json,os,re,subprocess,sys
import gm20_canonical_check as qa
qa.OUTPUT=qa.ROOT/'.work/gm23-canonical'
qa.PRIVATE=qa.OUTPUT/'runtime.private.json'
qa.BRUNO=qa.ROOT/'supabase/tests/bruno/GM-23-canonical/environments/Local.runtime.private.bru'
def verify(db):
 for name in ('notifications','notifications_canonical','auth','room_lifecycle','finalize','database/GM-22_social.test'):
  output=db.psql((qa.ROOT/f'supabase/tests/{name}.sql').read_text(encoding='utf8'))
  plan=re.search(r'(?m)^1\.\.(\d+)\s*$',output)
  assertions=re.findall(r'(?m)^ok \d+(?:\s|$)',output)
  if not plan or 'not ok ' in output or len(assertions)!=int(plan[1]):
   raise RuntimeError('GM23_SQL_TAP_FAILED: '+name)
  (qa.OUTPUT/(name.replace('/','-')+'-tap.txt')).write_text(output,encoding='utf8')
 db.psql((qa.ROOT/'supabase/tests/history.sql').read_text(encoding='utf8'))
 (qa.OUTPUT/'history-sql.txt').write_text('Pass: history.sql assertion blocks completed with ON_ERROR_STOP\n',encoding='utf8')

def stop():
 """Verify persisted ownership without requiring a running DB/gateway to retry."""
 qa.configure()
 qa.runtime.run(['docker','info','--format','{{.ServerVersion}}'],timeout=20)
 if qa.PRIVATE.exists():
  if qa.PRIVATE.is_symlink():raise RuntimeError('GM23_QA_CONTROL_SYMLINK')
  state=json.loads(qa.PRIVATE.read_text(encoding='utf8'))
  project,workdir=qa.validate_state(state)
  checked=subprocess.run(['docker','container','inspect','supabase_db_'+project],capture_output=True,text=True,encoding='utf8')
  if checked.returncode==0:
   info=json.loads(checked.stdout)[0];labels=info.get('Config',{}).get('Labels',{})
   if labels.get('com.supabase.cli.project')!=project or qa.Path(labels.get('com.supabase.cli.workdir','')).resolve()!=workdir:
    raise RuntimeError('GM23_QA_LABEL_MISMATCH')
  os.environ.update(state)
 qa.cleanup() # Leaves private ownership state intact if any cleanup step raises.

if __name__=='__main__':
 try:
  if '--cleanup' in sys.argv:stop()
  elif '--status' in sys.argv:
   qa.configure()
   if qa.PRIVATE.is_symlink():raise RuntimeError('GM23_QA_CONTROL_SYMLINK')
   if not qa.PRIVATE.exists():
    print(json.dumps({'owned':False,'running':False,'schemaVersion':None}))
   else:
    db=qa.restore()
    print(json.dumps({'projectId':db.project_id,'owned':True,'running':True,'schemaVersion':db.psql("select schema_version from public.schema_versions order by string_to_array(schema_version,'.')::int[] desc limit 1")}))
  elif '--prepare-bruno' in sys.argv:
   qa.configure();qa.restore()
   qa.runtime.run(['node','scripts/gm23_canonical_http.mjs','--prepare-bruno'],quiet=False)
  else:
   if qa.PRIVATE.exists() and '--against' not in sys.argv:
    raise RuntimeError('GM23_QA_RUNTIME_CONFLICT: use --against or --cleanup')
   if '--bruno' in sys.argv:os.environ['GM23_BRUNO']='1'
   qa.main(http_script='scripts/gm23_canonical_http.mjs',stage='gm23-canonical-http',before_http=verify)
 except KeyboardInterrupt:
  stop();raise SystemExit(130)
