/** Reset test budgets only in the live process-owned disposable database. */
import {readFile} from 'node:fs/promises';
const state=JSON.parse(await readFile(new URL('../supabase/tests/bruno/GM-19/environments/runtime.private.json',import.meta.url),'utf8'));
if(state.endpoint!=='http://127.0.0.1:54331')throw Error('Unexpected owned endpoint');
const response=await fetch(state.endpoint+'/__reset',{method:'POST',headers:{'x-gm19-control':state.control}});
if(!response.ok)throw Error('Fixture reset refused');console.log('Owned test budgets reset for next Bruno run.');
