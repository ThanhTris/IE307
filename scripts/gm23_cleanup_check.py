"""After Bruno: inject a partial-stop fault and clean ONLY the owned GM23 QA run.

Requires the journal created by gm23_canonical_check.py --bruno. This is an
explicit teardown test, not an application database reset or migration command.
"""
import json,sys
from unittest.mock import patch
sys.path.insert(0,'scripts')
import gm23_canonical_check as q
q.qa.configure();state=json.loads(q.qa.PRIVATE.read_text(encoding='utf8'))
bad={**state,'GM_V4_QA_WORKDIR':str(q.qa.ROOT)}
try:q.qa.validate_state(bad);raise AssertionError('foreign workdir accepted')
except RuntimeError:pass
def post_gateway_failure():
 q.qa.runtime.cleanup()
 raise RuntimeError('INJECTED_AFTER_GATEWAY_CLOSED')
try:
 with patch.object(q.qa,'cleanup',post_gateway_failure):q.stop()
except RuntimeError as e:
 assert str(e)=='INJECTED_AFTER_GATEWAY_CLOSED'
else:raise AssertionError('expected cleanup fault')
assert q.qa.PRIVATE.exists() and q.qa.BRUNO.exists(),'retry ownership metadata lost'
q.stop()
assert not q.qa.PRIVATE.exists() and not q.qa.BRUNO.exists()
q.stop()
project=state['GM_V4_QA_PROJECT_ID']
remaining=q.qa.runtime.run(['docker','ps','-a','--filter','label=com.supabase.cli.project='+project,'--format','{{.Names}}']).strip()
volumes=q.qa.runtime.run(['docker','volume','ls','--filter','label=com.supabase.cli.project='+project,'--format','{{.Name}}']).strip()
assert not remaining and not volumes
report={'result':'Pass','foreignWorkdirRejected':True,'injectedFailureAfterGatewayClosed':True,'privateJournalRetainedOnFailure':True,'retryWithoutGateway':True,'secondStopIdempotent':True,'ownedContainersAndVolumesRemaining':0,'applicationDatabaseChanged':False}
(q.qa.OUTPUT/'cleanup-results.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps(report))
