import { readFile, rm } from 'node:fs/promises';
const root=new URL('..',import.meta.url);const state=JSON.parse(await readFile(new URL('supabase/tests/bruno/GM-22/environments/runtime.private.json',root),'utf8'));
await fetch(state.endpoint+'/__stop',{method:'POST',headers:{'x-gm22-control':state.control}}).catch(()=>{});
for(const p of ['supabase/tests/bruno/GM-22/environments/Local.runtime.private.bru','supabase/tests/bruno/GM-22/environments/runtime.private.json']) await rm(new URL(p,root),{force:true});
console.log(JSON.stringify({stopped:true,namespace:state.namespace}));
