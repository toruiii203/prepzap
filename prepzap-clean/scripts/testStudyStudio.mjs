import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
const html=await readFile('design/study-studio/review/prototype.html');
assert.deepEqual(await readFile('public/design-review/study-studio.html'),html,'Published review differs from tested prototype');
const server=createServer((request,response)=>{response.writeHead(200,{'content-type':'text/html; charset=utf-8'});response.end(html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];await mkdir('.agent/study-studio',{recursive:true});
async function click(page,text){const handle=await page.evaluateHandle(value=>[...document.querySelectorAll('button')].find(button=>{if(!button.getBoundingClientRect().width)return false;const copy=button.cloneNode(true);copy.querySelectorAll('svg,.selected-mark,.answer>span,[aria-hidden=true]').forEach(item=>item.remove());return copy.textContent.trim().replace(/\s+/g,' ')===value;}),text);assert.ok(handle.asElement(),`Missing button ${text}`);await handle.asElement().click();await handle.dispose();}
async function scene(page,name){await page.waitForSelector(`[data-scene="${name}"]`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow in ${name}`);}
try{
 for(const [width,height]of [[320,844],[390,844],[430,932],[844,390],[1440,1000]])for(const theme of ['light','dark']){
  const context=await browser.createBrowserContext();const page=await context.newPage();const errors=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('data:'))external.push(request.url());});
  await page.setViewport({width,height});await page.goto(base,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
  if(theme==='dark')await page.evaluate(()=>[...document.querySelectorAll('label')].find(label=>label.textContent==='Dark').querySelector('input').click());
  await scene(page,'subject');await page.screenshot({path:`.agent/study-studio/subject-${width}-${theme}.png`,fullPage:true});
  const disabled=await page.$eval('.scene-actions .primary',button=>button.disabled);assert.equal(disabled,true);
  await click(page,'Math');await click(page,'Let’s begin');await scene(page,'response');
  assert.equal(await page.$eval('.scene-actions .primary',button=>button.disabled),false,'Reaction forces a wait');
  await page.screenshot({path:`.agent/study-studio/response-${width}-${theme}.png`,fullPage:true});
  await click(page,'Try a question');await scene(page,'question');await click(page,'36');await click(page,'Check answer');await scene(page,'feedback');
  assert.equal(await page.$eval('.explanation',element=>element.textContent.includes('42')),true);assert.equal(await page.$eval('svg.seedling-art',element=>element.dataset.pose),'encourage');
  await page.click('button[aria-label="Go back"]');await scene(page,'question');await click(page,'42');await click(page,'Check answer');await scene(page,'feedback');await click(page,'Keep going');await scene(page,'save');
  await click(page,'Continue with Google');await page.waitForSelector('[role=dialog]');assert.equal(await page.$eval('[role=dialog]',element=>element.contains(document.activeElement)),true);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role=dialog]'));
  assert.equal(await page.evaluate(()=>document.activeElement.textContent.includes('Continue with Google')),true,'Modal did not restore focus');
  await click(page,'Explore the dashboard concept');await scene(page,'home');await page.screenshot({path:`.agent/study-studio/home-${width}-${theme}.png`,fullPage:true});
  await click(page,'Preview a celebration');await page.waitForSelector('[role=dialog]');await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role=dialog]'));await click(page,'Art board');
  await page.waitForSelector('.art-board');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.$$eval('img',images=>images.every(image=>image.complete&&image.naturalWidth>0)),true);
  await page.screenshot({path:`.agent/study-studio/board-${width}-${theme}.png`,fullPage:true});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.waitForFunction(()=>[...document.querySelectorAll('[data-mascot]')].every(element=>element.dataset.reducedMotion==='true'));
  assert.equal(await page.$$eval('.seedling-art *',elements=>elements.every(element=>getComputedStyle(element).animationName==='none')),true);
  const targets=await page.evaluate(()=>[...document.querySelectorAll('button,input,select')].filter(element=>element.getBoundingClientRect().width&&!element.disabled).filter(element=>{const target=element.closest('label')||element;const rect=target.getBoundingClientRect();return rect.width<44||rect.height<44;}).map(element=>element.outerHTML.slice(0,160)));assert.deepEqual(targets,[],'Undersized control');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.equal(await page.evaluate(()=>localStorage.length),0,'Prototype wrote persistent state');
  console.log(`PASS ${width} ${theme}: onboarding, dashboard, focus, reduced motion`);
  results.push({width,height,theme,flow:'passed',focus:'passed',reducedMotion:'passed',externalRequests:0,storageWrites:0});await context.close();
 }
 const page=await browser.newPage();await page.goto(base,{waitUntil:'networkidle0'});await click(page,'More subjects or something else');await click(page,'Something else');await page.type('.custom-subject input','Architecture and an unusually long descriptive subject');await click(page,'Let’s begin');await scene(page,'response');await click(page,'Skip the warm-up');await scene(page,'save');await page.click('[aria-label="Go back"]');await scene(page,'response');await click(page,'Try a question');await click(page,'Skip for now');await scene(page,'feedback');assert.equal(await page.$eval('h1',element=>element.textContent),'We can start together.');await page.close();
 results.push({flow:'custom subject, skip and exact back navigation',result:'passed'});
 console.log(`PASS ${results.length} studio scenarios; no external requests, storage writes or live accounts`);
}finally{await writeFile('.agent/study-studio/results.json',JSON.stringify(results,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
