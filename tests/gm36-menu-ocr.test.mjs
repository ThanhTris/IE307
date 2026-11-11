import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMenuOcrHandler } from '../supabase/functions/menu-ocr/index.ts';
import { parseInput, parseProviderOutput, MAX_BODY_BYTES, OcrError } from '../supabase/functions/menu-ocr/contract.ts';
import { normalizeDraft, parseVndPrice } from '../supabase/functions/menu-ocr/normalize.ts';
import { memoryQuota } from '../supabase/functions/menu-ocr/quota.ts';
import { supabaseAuthorizer } from '../supabase/functions/menu-ocr/auth.ts';
const fixture = name => JSON.parse(readFileSync(new URL('./fixtures/menu-ocr-v1/'+name+'.json',import.meta.url),'utf8'));
const operator='00000000-0036-4000-8000-000000000001', outsider='00000000-0036-4000-8000-000000000002';
const provider=output=>({mode:'test-double',recognize:async()=>output??fixture('provider-output')});
function handler(extra={}) {return createMenuOcrHandler({enabled:true,authorize:async()=>operator,allowedUsers:new Set([operator]),provider:provider(),quota:memoryQuota(),...extra});}
const req=(body=fixture('request'),headers={'Content-Type':'application/json'})=>new Request('http://localhost/menu-ocr',{method:'POST',headers,body:JSON.stringify(body)});
async function error(h,request,status,key){const r=await h(request);assert.equal(r.status,status);const b=await r.json();assert.equal(b.messageKey,key);assert.equal(b.error.messageKey,key);assert.equal(r.headers.get('cache-control'),'no-store');return b;}

for(const [text,expected] of [['35.000 đ',[35000,35000]],['35,000 VND',[35000,35000]],['35 000',[35000,35000]],['35k',[35000,35000]],['35,5k',[35500,35500]],['35k - 45k',[35000,45000]],['35000–45000 ₫',[35000,45000]],['0',[0,0]]]) {
  test('VND price '+text,()=>assert.deepEqual(parseVndPrice(text),expected));
}
for(const text of ['','35.5','35/45k','35k-30k','35.000,000','USD 5','từ 35k','-100','1000000001','35k-45k-50k','NaN','35k đ đ']) {
  test('ambiguous/invalid price remains unknown: '+text,()=>assert.equal(parseVndPrice(text),null));
}
for(const text of ['35-45k','35-45.000 đ','35-45000 đ','35-45 000 đ']) {
  test('abbreviated range cannot confirm an implied thousand scale: '+text,()=>assert.equal(parseVndPrice(text),null));
  test('high confidence cannot confirm ambiguous range or its price source: '+text,()=>{
    const output=fixture('provider-output');
    output.items=[{...output.items[0],priceText:text,priceConfidence:0.99,currency:'VND',unit:'portion'}];
    const row=normalizeDraft(output,parseInput(fixture('request')),'test-double').items[0];
    for(const key of ['priceMin','priceMax','currency','unit'])assert.equal(row[key],null);
    assert.equal(row.fieldSources.price,null);
    assert.ok(row.issues.includes('PRICE_UNKNOWN_OR_AMBIGUOUS'));
    assert.equal(row.confidence.price,0.99);assert.equal(row.reviewStatus,'draft');
  });
}
for(const [text,expected] of [['35k-45k',[35000,45000]],['35000-45000 đ',[35000,45000]],['35000-45k',[35000,45000]],['0-45k',[0,45000]]]) {
  test('fully specified range retains explicit VND amounts: '+text,()=>{
    assert.deepEqual(parseVndPrice(text),expected);
    const output=fixture('provider-output');output.items=[{...output.items[0],priceText:text,priceConfidence:0.99}];
    const row=normalizeDraft(output,parseInput(fixture('request')),'test-double').items[0];
    assert.deepEqual([row.priceMin,row.priceMax],expected);
    assert.equal(row.fieldSources.price,fixture('request').source.sourceRef);
    assert.ok(!row.issues.includes('PRICE_UNKNOWN_OR_AMBIGUOUS'));
  });
}
test('independent golden: Vietnamese NFC, price interval, low confidence and unknown unit',()=>{
  assert.deepEqual(normalizeDraft(fixture('provider-output'),parseInput(fixture('request')),'test-double'),fixture('expected-draft'));
});
test('no category, allergy, location, schedule, version or verified data can come from provider',()=>{
  for(const field of ['allergens','venueId','coverageId','scheduleId','reviewStatus','userId','sourceRef']){
    const p=fixture('provider-output');p.items[0][field]='forged';
    assert.throws(()=>parseProviderOutput(p),e=>e.code==='OCR_MALFORMED_OUTPUT');
  }
});
test('reject malformed/provider quantities instead of coercing confidence or currency',()=>{
  for(const [key,value] of [['nameConfidence','0.99'],['nameConfidence',NaN],['priceConfidence',1.1],['unit','per_person'],['currency','USD'],['name',true]]){
    const p=fixture('provider-output');p.items[0][key]=value;assert.throws(()=>parseProviderOutput(p),e=>e.code==='OCR_MALFORMED_OUTPUT');
  }
  assert.throws(()=>parseProviderOutput({items:Array(51).fill(fixture('provider-output').items[0])}),e=>e.code==='OCR_MALFORMED_OUTPUT');
});
test('confidence boundary inclusive, never default price/currency/unit',()=>{
  const p=fixture('provider-output');p.items=[{...p.items[0],nameConfidence:0.85,priceConfidence:0.85}];
  const d=normalizeDraft(p,parseInput(fixture('request')),'test-double');assert.equal(d.items[0].priceMin,35000);
  p.items[0].currency=null;const unknown=normalizeDraft(p,parseInput(fixture('request')),'test-double');assert.equal(unknown.items[0].priceMin,null);assert.equal(unknown.items[0].currency,null);
});
test('request rejects URLs, unknown keys, arbitrary caller IDs and data URIs',()=>{
  for(const mutate of [v=>v.userId=operator,v=>v.image.url='https://example.invalid/menu.png',v=>v.image.dataBase64='data:image/png;base64,AAAA',v=>v.requestId='x'.repeat(129)]){
    const value=fixture('request');mutate(value);assert.throws(()=>parseInput(value),OcrError);
  }
});
test('missing, unknown or unlicensed source rights and consent are not implicit',()=>{
  for(const mutate of [v=>v.processingConsent=false,v=>v.processingConsent='true',v=>v.source.usageRights='unknown',v=>{v.source.usageRights='licensed';v.source.license=null;}]){
    const value=fixture('request');mutate(value);assert.throws(()=>parseInput(value),OcrError);
  }
});
test('invalid image: MIME mismatch, malformed base64, truncated container, zero or excessive dimensions',()=>{
  for(const mutate of [v=>v.image.mimeType='image/svg+xml',v=>v.image.dataBase64='AA=A',v=>v.image.dataBase64='AAAA',v=>v.image.mimeType='image/jpeg',v=>{
    const bytes=Buffer.from(v.image.dataBase64,'base64');bytes.writeUInt32BE(0,16);v.image.dataBase64=bytes.toString('base64');
  },v=>{const bytes=Buffer.from(v.image.dataBase64,'base64');bytes.writeUInt32BE(5000,20);v.image.dataBase64=bytes.toString('base64');}]){
    const value=fixture('request');mutate(value);assert.throws(()=>parseInput(value),e=>e.code==='INVALID_IMAGE');
  }
});
test('no authentication, outsider and disabled/missing adapters never invoke recognizer',async()=>{
  let calls=0;const p={mode:'test-double',recognize:async()=>{calls++;return fixture('provider-output');}};
  await error(handler({provider:p,authorize:async()=>null}),req(),401,'AUTH_REQUIRED');
  await error(handler({provider:p,authorize:async()=>outsider}),req(),403,'OCR_FORBIDDEN');
  await error(handler({provider:p,enabled:false}),req(),503,'OCR_DISABLED');
  await error(handler({provider:null}),req(),503,'OCR_UNAVAILABLE');
  await error(handler({provider:p,quota:null}),req(),503,'OCR_UNAVAILABLE');assert.equal(calls,0);
});
test('HTTP method, media type, malformed JSON and streaming length independent of Content-Length',async()=>{
  const h=handler();await error(h,new Request('http://localhost/menu-ocr'),405,'METHOD_NOT_ALLOWED');
  await error(h,req({},{}),415,'UNSUPPORTED_MEDIA_TYPE');
  await error(h,new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}),400,'INVALID_INPUT');
  const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_BODY_BYTES+1));c.close();}});
  await error(h,new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':'1'},body:stream,duplex:'half'}),413,'PAYLOAD_TOO_LARGE');
});
test('handler returns the exact golden draft without images/tokens/provider raw text',async()=>{
  const response=await handler()(req());assert.equal(response.status,200);const body=await response.json();assert.deepEqual(body.data,fixture('expected-draft'));
  const text=JSON.stringify(body);for(const field of ['dataBase64','bytes','processingConsent','priceText','license','Authorization'])assert.ok(!text.includes('"'+field+'"'));
});
test('slow request body times out before provider/quota work',async()=>{
  let cancelled=false,calls=0;
  const body=new ReadableStream({cancel(){cancelled=true;}});
  const h=handler({bodyTimeoutMs:10,provider:{mode:'test-double',recognize:async()=>{calls++;return fixture('provider-output');}}});
  await error(h,new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json'},body,duplex:'half'}),408,'REQUEST_TIMEOUT');
  assert.equal(cancelled,true);assert.equal(calls,0);
});
test('empty/provider-malformed/failure paths are safe and do not echo provider exception',async()=>{
  await error(handler({provider:provider({items:[]})}),req(),422,'OCR_NO_TEXT');
  await error(handler({provider:provider({items:'raw private text'})}),req(),502,'OCR_MALFORMED_OUTPUT');
  const body=await error(handler({provider:{mode:'test-double',recognize:async()=>{throw Error('secret provider key/image');}}}),req(),503,'OCR_UNAVAILABLE');
  assert.ok(!JSON.stringify(body).includes('secret'));
});
test('quota isolates callers, resets expired idle windows and bounds memory',()=>{
  let now=100;const q=memoryQuota(1,10,()=>now,2);const a=q.acquire(operator);a.release();assert.equal(q.acquire(operator),null);
  const b=q.acquire(outsider);assert.ok(b);assert.equal(q.acquire('third'),null);b.release();now=111;
  assert.ok(q.acquire(operator));assert.ok(q.acquire('third'));
});
test('concurrent duplicate attempts have only one recognizer call',async()=>{
  let done,calls=0;const h=handler({provider:{mode:'test-double',recognize:()=>{calls++;return new Promise(resolve=>done=resolve);}}});
  const first=h(req());await new Promise(r=>setTimeout(r,10));await error(h,req(),429,'RATE_LIMITED');assert.equal(calls,1);
  done(fixture('provider-output'));assert.equal((await first).status,200);
});
test('provider timeout aborts and a late provider keeps its lease until actually settled',async()=>{
  let done,signal;const h=handler({timeoutMs:10,provider:{mode:'test-double',recognize:(_,s)=>{signal=s;return new Promise(resolve=>done=resolve);}}});
  await error(h,req(),504,'OCR_TIMEOUT');assert.equal(signal.aborted,true);await error(h,req(),429,'RATE_LIMITED');
  done(fixture('provider-output'));await new Promise(r=>setTimeout(r,0));
  // A late answer was not returned or persisted, and no image/result cache exists.
});
test('Auth verifier forwards only Authorization and public key to fixed project endpoint',async()=>{
  let captured;const auth=supabaseAuthorizer('https://project.example.invalid','public-placeholder',async(url,init)=>{
    captured={url:String(url),...init};return Response.json({id:operator,user_metadata:{isAdmin:true}});
  });
  assert.equal(await auth(new Request('http://localhost',{headers:{Authorization:'Bearer opaque-test-token','X-User-Id':outsider}})),operator);
  assert.equal(captured.url,'https://project.example.invalid/auth/v1/user');assert.equal(captured.headers.Authorization,'Bearer opaque-test-token');assert.equal(captured.redirect,'error');
  assert.equal(await auth(new Request('http://localhost')),null);
  assert.equal(await supabaseAuthorizer('https://project.example.invalid','public',async()=>new Response('',{status:401}))(new Request('http://localhost',{headers:{Authorization:'Bearer x'}})),null);
  await assert.rejects(supabaseAuthorizer('https://project.example.invalid','public',async()=>{throw Error('secret');})(new Request('http://localhost',{headers:{Authorization:'Bearer x'}})),e=>e.code==='AUTH_UNAVAILABLE');
});
