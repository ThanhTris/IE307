/** Run frozen upstream HTTP business assertions with separate GM21 evidence. */
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const suite=process.argv[2];
if(!['gm19','gm20'].includes(suite)||process.argv.length!==3)throw Error('Choose gm19 or gm20');
const task=suite==='gm19'?'GM-19':'GM-20';
const original=await readFile(new URL(`./${suite}_http_check.mjs`,import.meta.url),'utf8');
let adapted=original.replaceAll(`docs/evidence/roadmap-v2/${task}/`,`docs/evidence/roadmap-v2/GM-21/gm20-integration/upstream-${suite}/`);
// GM21 deliberately invalidates all ready flags on a room-consent edit.
// Prepare the whole roster's preferences before any member confirms readiness;
// this adapts fixture setup, never the frozen business scenario assertions.
const adaptations=['evidence destination only'];
if(suite==='gm20'){
 const before=` for(const g of people) {
  if(history) vv=success(await request('update_preferences',g.access_token,mutation(made.roomId,vv,{cuisine_ids:[],category_ids:[],history_consent:true}))).version;
  vv=success(await request('set_ready',g.access_token,mutation(made.roomId,vv,{ready:true}))).version;
 }`;
 const after=` if(history) for(const g of people) vv=success(await request('update_preferences',g.access_token,mutation(made.roomId,vv,{cuisine_ids:[],category_ids:[],history_consent:true}))).version;
 for(const g of people) vv=success(await request('set_ready',g.access_token,mutation(made.roomId,vv,{ready:true}))).version;`;
 assert.ok(adapted.includes(before),'Upstream setup changed; review adapter');
 adapted=adapted.replace(before,after);adaptations.push('owned setup: all room consent preferences before all ready confirmations');
}
assert.ok(!adapted.includes(`docs/evidence/roadmap-v2/${task}/`),'All evidence must remain in GM21');
const scenarios=s=>s.slice(s.indexOf('async function tests()'),s.indexOf('\ntry {',s.indexOf('async function tests()')));
assert.ok(scenarios(original).length>1000);
assert.equal(scenarios(original),scenarios(adapted));
const hash=s=>createHash('sha256').update(s).digest('hex');
const temp=new URL(`./.gm21-${suite}-${randomUUID()}.tmp.mjs`,import.meta.url);
const folder=new URL(`../docs/evidence/roadmap-v2/GM-21/gm20-integration/upstream-${suite}/`,import.meta.url);
await mkdir(folder,{recursive:true});await writeFile(temp,adapted,{flag:'wx',mode:0o600});
try{
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[fileURLToPath(temp)],{shell:false,stdio:'inherit',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});child.once('error',reject);child.once('close',c=>resolve(c??1));});
 await writeFile(new URL('adapter.json',folder),JSON.stringify({upstream:`scripts/${suite}_http_check.mjs`,upstreamSha256:hash(original),scenarioSha256:hash(scenarios(original)),scenariosUnchanged:true,adaptations,exitCode:code},null,2)+'\n');process.exitCode=code;
}finally{assert.equal(hash(await readFile(temp)),hash(adapted));await unlink(temp);}
