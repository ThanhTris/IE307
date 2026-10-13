/** Remove only the namespace created by --bruno-setup and ignored credentials. */
import { readFile,unlink,writeFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand } from './backend.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
try {
  const state=JSON.parse(await readFile(resolve(root,'.work/gm17-bruno-state.json'),'utf8'));
  const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
  if(!uuid.test(state.namespace)||state.users?.length!==3||state.users.some(x=>!uuid.test(x))) throw new Error();
  await runCommand(process.env.GM17_PYTHON??'python',[resolve(root,'scripts/gm17_http_fixture.py'),'cleanup',state.namespace,...state.users],{quiet:true});
  const reportPath=resolve(root,'docs/evidence/roadmap-v2/GM-17/HTTP_CHECK.json');
  const report=JSON.parse(await readFile(reportPath,'utf8'));
  report.cases.push({case:'namespace cleanup',result:'Pass'});
  await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  for(const p of ['supabase/tests/bruno/GM-17/environments/Local.private.bru','supabase/tests/bruno/GM-17/environments/Local.runtime.private.bru','.work/gm17-bruno-state.json'])
    await unlink(resolve(root,p));
  console.log('GM-17 Bruno synthetic data and ignored credentials removed.');
} catch {console.error('GM-17 Bruno cleanup failed; no credentials emitted. Verify saved namespace and local Docker.');process.exitCode=1;}
