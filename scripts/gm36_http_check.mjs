/** Real loopback HTTP + real GoTrue JWT; image recognizer is explicitly a stub. */
import assert from 'node:assert/strict';
import { createHash,randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFileSync,readdirSync } from 'node:fs';
import { mkdir,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMenuOcrHandler } from '../supabase/functions/menu-ocr/index.ts';
import { supabaseAuthorizer } from '../supabase/functions/menu-ocr/auth.ts';
import { memoryQuota } from '../supabase/functions/menu-ocr/quota.ts';
import { MAX_BODY_BYTES } from '../supabase/functions/menu-ocr/contract.ts';
import { runCommand,cliArgs,validateApiUrl,validateConfig } from './backend.mjs';

if(process.argv.length>2)throw Error('Local owned test only; no deploy/provider arguments');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const python=process.env.GM36_PYTHON??(process.platform==='win32'?'python':'python3');
const folder=resolve(root,'docs/evidence/roadmap-v2/GM-36/http');
const fixtures=resolve(root,'tests/fixtures/menu-ocr-v1');
const fixture=name=>JSON.parse(readFileSync(resolve(fixtures,name+'.json'),'utf8'));
const sources=['scripts/gm36_http_check.mjs','scripts/gm36_auth_cleanup.py',
 ...readdirSync(resolve(root,'supabase/functions/menu-ocr')).map(p=>'supabase/functions/menu-ocr/'+p),
 ...readdirSync(fixtures).filter(p=>p.endsWith('.json')).map(p=>'tests/fixtures/menu-ocr-v1/'+p)];
const hashes=()=>Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));
const report={result:'Fail',checkedAt:new Date().toISOString(),contract:'GM-36.1',
 environment:'Node Web handler over loopback HTTP; actual local GoTrue user verification',
 providerMode:'test-double',edgeRuntime:'Not run; edge_runtime remains disabled',
 realProvider:'Not run; no approved recognizer/provider',publicationPerformed:false,
 artifactHashes:hashes(),cases:[]};
const namespace=randomUUID(),guests=[];let server,base,authBase,key,scenario='golden',calls=0;
let deps;
async function check(name,work){
 try{const actual=await work();report.cases.push({case:name,result:'Pass',...actual});console.log('Pass:',name);}
 catch{report.cases.push({case:name,result:'Fail'});throw Error(name);}
}
async function request(body=fixture('request'),token=guests[0]?.access_token,extra={}){
 const response=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...extra.headers},
 body:typeof body==='string'?body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(10000)});
 return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')};
}
function failure(r,status,keyValue){assert.equal(r.status,status);assert.equal(r.body.messageKey,keyValue);assert.equal(r.cache,'no-store');return {status,messageKey:keyValue};}
try{
 await mkdir(folder,{recursive:true});
 validateConfig(readFileSync(resolve(root,'supabase/config.toml'),'utf8'));
 const status=JSON.parse(await runCommand(process.execPath,cliArgs('status'),{quiet:true}));
 authBase=validateApiUrl(status.API_URL);key=status.ANON_KEY;
 for(let n=0;n<2;n++){
  const response=await fetch(authBase+'/auth/v1/signup',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),
   body:JSON.stringify({data:{display_name:'GM36 synthetic '+n,gm36_test_namespace:namespace,ocrOperator:true}})});
  assert.equal(response.status,200);const guest=await response.json();assert.equal(guest.user.is_anonymous,true);guests.push(guest);
 }
 const recognize=async(_image,signal)=>{
  calls++;
  if(scenario==='error')throw Error('private provider diagnostic must not be echoed');
  if(scenario==='empty')return {items:[]};
  if(scenario==='malformed')return {items:[{name:'invalid unstructured provider output'}]};
  if(scenario==='timeout')return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));
  if(scenario==='slow')await new Promise(r=>setTimeout(r,100));
  return fixture('provider-output');
 };
 deps={enabled:true,authorize:supabaseAuthorizer(authBase,key),allowedUsers:new Set([guests[0].user.id]),
  provider:{mode:'test-double',recognize},quota:memoryQuota(3),timeoutMs:200};
 const handler=createMenuOcrHandler(deps);
 server=createServer(async(req,res)=>{
  if(req.url!=='/functions/v1/menu-ocr'){res.writeHead(404);res.end('{}');return;}
  try{
   const request=new Request(base,{method:req.method,headers:req.headers,
    ...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
   const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end('{"ok":false}');}
 });
 server.requestTimeout=10000;
 await new Promise((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
 base='http://127.0.0.1:'+server.address().port+'/functions/v1/menu-ocr';
 await check('missing JWT rejected before image/provider work',async()=>failure(await request(fixture('request'),null),401,'AUTH_REQUIRED'));
 await check('forged JWT rejected by actual GoTrue user endpoint',async()=>failure(await request(fixture('request'),'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmb3JnZWQifQ.invalid'),401,'AUTH_REQUIRED'));
 await check('valid outsider cannot grant OCR rights through user_metadata or headers',async()=>{
  const before=calls;const r=await request(fixture('request'),guests[1].access_token,{headers:{'X-User-Id':guests[0].user.id,'X-OCR-Role':'operator'}});
  assert.equal(calls,before);return failure(r,403,'OCR_FORBIDDEN');
 });
 await check('disabled production-equivalent handler makes no recognizer call',async()=>{
  deps.enabled=false;const before=calls;try{const r=await request();assert.equal(calls,before);return failure(r,503,'OCR_DISABLED');}finally{deps.enabled=true;}
 });
 await check('real authorized HTTP returns exact three-row draft, never verified',async()=>{
  const r=await request();assert.equal(r.status,200);assert.deepEqual(r.body.data,fixture('expected-draft'));assert.equal(r.body.requestId,fixture('request').requestId);
  await writeFile(resolve(folder,'actual-draft.json'),JSON.stringify(r.body.data,null,2)+'\n');return {status:200,rows:3,publishable:false,sourceRightsVerified:false};
 });
 await check('processing consent and source-rights declaration are mandatory',async()=>{
  const a=fixture('request');a.processingConsent=false;failure(await request(a),400,'CONSENT_REQUIRED');
  const b=fixture('request');b.source.usageRights='unknown';failure(await request(b),400,'SOURCE_RIGHTS_REQUIRED');return {statuses:[400,400]};
 });
 await check('invalid image and arbitrary user/location/publish fields rejected',async()=>{
  const a=fixture('request');a.image.dataBase64='AAAA';failure(await request(a),400,'INVALID_IMAGE');
  const b=fixture('request');b.publishable=true;b.userId=guests[0].user.id;failure(await request(b),400,'INVALID_INPUT');return {statuses:[400,400]};
 });
 await check('malformed and over-limit streamed request bodies rejected',async()=>{
  failure(await request('{'),400,'INVALID_INPUT');return failure(await request(' '.repeat(MAX_BODY_BYTES+1)),413,'PAYLOAD_TOO_LARGE');
 });
 await check('empty, malformed and failed provider have safe distinct errors',async()=>{
  for(const [mode,status,keyValue] of [['empty',422,'OCR_NO_TEXT'],['malformed',502,'OCR_MALFORMED_OUTPUT'],['error',503,'OCR_UNAVAILABLE']]){
   scenario=mode;deps.quota=memoryQuota();const r=await request();failure(r,status,keyValue);assert.ok(!JSON.stringify(r).includes('diagnostic'));
  }scenario='golden';return {statuses:[422,502,503]};
 });
 await check('real HTTP provider timeout returns504 with no draft',async()=>{
  scenario='timeout';deps.quota=memoryQuota();const r=await request();scenario='golden';assert.ok(!Object.hasOwn(r.body,'data'));return failure(r,504,'OCR_TIMEOUT');
 });
 await check('simultaneous attempts invoke recognizer only once',async()=>{
  scenario='slow';deps.quota=memoryQuota();const before=calls;
  const results=await Promise.all([request(),request()]);assert.deepEqual(results.map(r=>r.status).sort(),[200,429]);assert.equal(calls-before,1);scenario='golden';return {statuses:[200,429],providerCalls:1};
 });
 await check('local quota rejects fourth operation without another recognizer call',async()=>{
  deps.quota=memoryQuota();const before=calls;
  for(let n=0;n<3;n++)assert.equal((await request()).status,200);
  const r=await request();failure(r,429,'RATE_LIMITED');assert.equal(calls-before,3);return {accepted:3,limited:1,quotaScope:'single test process only'};
 });
 assert.deepEqual(hashes(),report.artifactHashes);report.result='Pass';
}catch(e){report.failedCase=report.cases.at(-1)?.result==='Fail'?report.cases.at(-1).case:'setup';console.error('GM36 HTTP failed:',report.failedCase);process.exitCode=1;}
finally{
 if(server)await new Promise(r=>server.close(r));
 if(guests.length){try{
  await runCommand(python,[resolve(root,'scripts/gm36_auth_cleanup.py'),namespace,...guests.map(g=>g.user.id)],{quiet:true});report.cleanup='owned synthetic identities removed';
 }catch{report.cleanup='Fail; owned identities need cleanup';report.result='Fail';process.exitCode=1;}}
 await mkdir(folder,{recursive:true});await writeFile(resolve(folder,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({result:report.result,cases:report.cases.length,cleanup:report.cleanup}));
}
