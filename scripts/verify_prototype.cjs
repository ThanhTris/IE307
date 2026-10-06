const {chromium}=require(process.env.PROTOTYPE_PLAYWRIGHT_PATH || 'playwright');
const path=require('path'),fs=require('fs'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'docs/evidence/GM-00');
fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.join(root,'design/prototypes/gi-cung-duoc.html')).href;
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const passed=[];
 async function check(label,fn){await fn();passed.push(label)}
 const action=a=>page.locator(`[data-action="${a}"]`);
 const contains=async text=>{if(!await page.locator('#screen').innerText().then(t=>t.includes(text)))throw Error('Missing: '+text)};
 await page.goto(url);
 await page.screenshot({path:path.join(out,'ui-desktop.png'),fullPage:true,animations:'disabled'});
 await check('Host create/preferences/ready gate and full ballot',async()=>{
  await action('create').click();await page.locator('#name').fill('Minh');
  await action('created').click();await page.locator('[data-action="cat"][data-value="Nướng"]').click();await action('lobby').click();
  if(!await action('start').isDisabled())throw Error('start ready gate missing');
  await action('ready').click();await action('start').click();
  if(!await action('submit').isDisabled())throw Error('empty ballot accepted');
  for(let i=0;i<8;i++)await page.locator(`[data-action="vote"][data-value="${i===0?'WANT':'OK'}"]`).click();
  await action('submit').click();await contains('Hôm nay ăn');await contains('Phở bò');
 });
 await check('Fallback preserves NO, offline blocks submit, terminal winner stable',async()=>{
  await page.locator('#scenario').selectOption('fallback');await action('fill').click();await action('offline').click();await action('submit').click();await contains('Đang mất kết nối');
  await action('offline').click();await action('submit').click();await contains('VÒNG 2');
  if(await page.locator('[data-action="keep"]').count()!==4)throw Error('NO dishes leaked into eligible pool');
  await page.screenshot({path:path.join(out,'ui-final-round.png'),fullPage:true,animations:'disabled'});
  await action('finish').click();await contains('Hôm nay ăn');
  const winner=await page.locator('#screen h2').innerText();await action('theme').click();if(await page.locator('#screen h2').innerText()!==winner)throw Error('winner changed');
  const maps=await page.locator('a.primary-link').getAttribute('href');if(!maps.includes('api=1&query='))throw Error('maps missing');
  await action('theme').click();
 });
 await check('Empty intersection terminates without round 3',async()=>{
  await page.locator('#scenario').selectOption('empty');await action('fill').click();await action('submit').click();await contains('Chưa khớp khẩu vị');
  if(await action('finish').count())throw Error('extra round available');
 });
 await check('Removing all final candidates produces no consensus',async()=>{
  await page.locator('#scenario').selectOption('fallback');await action('fill').click();await action('submit').click();
  const ids=await page.locator('[data-action="keep"]').evaluateAll(es=>es.map(e=>e.dataset.value));
  for(const id of ids)await page.locator(`[data-action="keep"][data-value="${id}"]`).click();
  await action('finish').click();await contains('Chưa khớp khẩu vị');
 });
 await check('Join invalid code / camera fallback / member role',async()=>{
  await action('reset').click();await action('join').click();await page.locator('#code').fill('999999');await action('joined').click();await contains('Không tìm thấy phòng');
  await action('qr').click();await contains('Camera chưa được triển khai');
  await page.locator('#code').fill('123456');await action('joined').click();await action('lobby').click();await action('ready').click();
  if(!await action('start').isDisabled())throw Error('member can start');
  await action('mockstart').click();await contains('VÒNG 1');
 });
 await check('Waiting ballot is locked; sample completion resumes; expired room is terminal',async()=>{
  await page.locator('#scenario').selectOption('waiting');await action('fill').click();await action('submit').click();await contains('Chờ bạn');
  if(await page.locator('[data-action="vote"]').count())throw Error('locked vote editable');
  await action('mocksubmit').click();await contains('VÒNG 2');await action('expire').click();await contains('hết hạn');
  if(await action('finish').count())throw Error('expired submit available');
 });
 await check('Layouts 320 / 390 / 768 have no horizontal overflow',async()=>{
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:900});await action('reset').click();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw Error('overflow '+width);
   if(width===390)await page.screenshot({path:path.join(out,'ui-mobile.png'),fullPage:true,animations:'disabled'});
   await action('fill').click();const voteOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(voteOverflow)throw Error('vote overflow '+width);
  }
 });
 await page.setViewportSize({width:390,height:900});await action('reset').click();await action('theme').click();
 await page.screenshot({path:path.join(out,'ui-dark.png'),fullPage:true,animations:'disabled'});
 if(errors.length)throw Error('JS errors: '+errors.join('; '));
 fs.writeFileSync(path.join(out,'prototype-checks.json'),JSON.stringify({date:'2026-10-06',engine:'Playwright Chromium headless',scope:'HTML prototype only; no React Native/backend',passed,pageErrors:errors},null,2));
 console.log(JSON.stringify({passed:passed.length,pageErrors:errors.length,screenshots:4},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
