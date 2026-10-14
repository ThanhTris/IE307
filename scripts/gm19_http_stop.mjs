import {readFile} from 'node:fs/promises';
const state=JSON.parse(await readFile(new URL('../supabase/tests/bruno/GM-19/environments/runtime.private.json',import.meta.url),'utf8'));
if(state.endpoint!=='http://127.0.0.1:54331')throw Error('Unexpected owned endpoint');
const r=await fetch(state.endpoint+'/__stop',{method:'POST',headers:{'x-gm19-control':state.control}});
if(!r.ok)throw Error('Stop refused');console.log('GM19 stop requested; runner performs owned cleanup.');
