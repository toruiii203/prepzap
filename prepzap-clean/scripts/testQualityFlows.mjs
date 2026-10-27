import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { fixtureProfile, seedBrowser } from './uiFixtures.mjs';

const server=spawn('npm',['exec','--','vite','preview','--host','127.0.0.1','--port','4193','--strictPort'],{stdio:'ignore',detached:true});
let browser; const results=[];
async function clickText(page,text) {
  const handle=await page.evaluateHandle(label=>[...document.querySelectorAll('button')].find(button=>button.getBoundingClientRect().width&&(()=>{const copy=button.cloneNode(true);copy.querySelectorAll('[aria-hidden=true],.material-symbols-outlined').forEach(icon=>icon.remove());return copy.textContent.trim()===label;})()),text);
  const button=handle.asElement();assert.ok(button,`Missing visible button: ${text}`);await button.click();await handle.dispose();
}
try {
  for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:4193')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  for(const variant of [{width:390,theme:'light'},{width:1440,theme:'dark'}]) {
    const context=await browser.createBrowserContext();const page=await context.newPage();
    await page.setViewport({width:variant.width,height:900});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const studySessions=[{id:'quality-one',user_id:fixtureProfile.id,title:'Cell biology',duration_minutes:25,created_at:new Date(Date.now()-120000).toISOString()},{id:'quality-two',user_id:fixtureProfile.id,title:'Algebra',duration_minutes:35,created_at:new Date(Date.now()-60000).toISOString()}];
    await seedBrowser(page,{...variant,studySessions});
    await page.evaluateOnNewDocument(()=>{localStorage.setItem('pz_tutorial_seen_/dashboard','true');localStorage.setItem('pz_tutorial_seen_/sources','true');});
    await page.goto('http://127.0.0.1:4193/dashboard',{waitUntil:'networkidle0'});
    await clickText(page,'Find my next lesson');
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')?.endsWith(': active')),true);
    const next=await page.$('button[aria-label="Next page"]');if(next&&!await next.evaluate(button=>button.disabled))await next.click();
    const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{if(el.getBoundingClientRect().right<=innerWidth+1)return false;for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement){if(['auto','hidden','scroll','clip'].includes(getComputedStyle(parent).overflowX))return false;}return true;}).slice(0,12).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right,text:el.textContent.slice(0,60)}))}));
    assert.ok(overflow.scroll<=overflow.width,JSON.stringify(overflow));
    await page.click('[aria-label="Hide study tools"]');await page.waitForSelector('[aria-label="Show study tools"]');
    await page.waitForFunction(()=>{const button=document.querySelector('[aria-label="Show study tools"]');if(!button)return false;button.scrollIntoView({behavior:'instant',block:'center'});return true;});
    await new Promise(resolve=>setTimeout(resolve,300));
    await page.click('[aria-label="Show study tools"]');await page.waitForSelector('[aria-label="Hide study tools"]');
    results.push({...variant,flow:'find real next lesson and expand/collapse tools',result:'passed'});

    let queries=0;page.on('request',request=>{if(request.method()==='GET'&&new URL(request.url()).pathname.endsWith('/study_sessions'))queries++;});
    await page.goto('http://127.0.0.1:4193/analytics',{waitUntil:'networkidle0'});
    try { await page.waitForSelector('.analytics-sessions li',{timeout:12000}); } catch(error) { console.log('ANALYTICS FIXTURE DEBUG',queries,await page.evaluate(()=>({text:document.querySelector('.analytics-content')?.innerText,cache:localStorage.getItem('pz_study_sessions'),uid:JSON.parse(localStorage.getItem('pz_auth_cache')||'{}').user?.id})));throw error; }
    assert.equal(await page.$$eval('.analytics-sessions li',items=>items.length),2);
    assert.equal(await page.$eval('.analytics-metrics',element=>element.textContent.includes('1h')),true);
    assert.equal(await page.$eval('.analytics-chart',element=>[...element.querySelectorAll('.analytics-bar')].some(bar=>getComputedStyle(bar).transform!=='matrix(1, 0, 0, 0, 0, 0)')),true,'Recorded study time has no visible chart bar');
    const before=queries;await clickText(page,'Refresh');await page.waitForFunction(()=>!document.querySelector('[aria-labelledby="weekly-title"]').getAttribute('aria-busy')||document.querySelector('[aria-labelledby="weekly-title"]').getAttribute('aria-busy')==='false');
    await page.waitForNetworkIdle();assert.equal(queries-before,1,'Refresh added duplicate session queries');
    await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.qualityShared=text;}}});});
    await clickText(page,'Share progress');await page.waitForFunction(()=>window.qualityShared?.includes('1h')&&window.qualityShared.includes('2 sessions'));
    assert.equal(await page.$$eval('h1',elements=>elements.filter(element=>element.getBoundingClientRect().width).length),1);
    for(const width of [320,768,1024,1440]) {
      await page.setViewport({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Analytics overflow at ${width}px`);
      assert.equal(await page.$$eval('main h1',elements=>elements.filter(element=>element.getBoundingClientRect().width).length),1);
    }
    await page.setViewport({width:variant.width,height:900});
    results.push({...variant,flow:'real totals, visible chart, one refresh query, share values',responsiveWidths:[320,768,1024,1440],result:'passed'});

    await page.goto('http://127.0.0.1:4193/sources',{waitUntil:'networkidle0'});
    await clickText(page,variant.width>=768?'Paste':'Paste text');
    await page.type('input[placeholder^="File name"]','Quality audit.txt');
    await page.type('textarea[placeholder^="Paste study notes"]','Mitosis divides a cell into two daughter cells.');
    await clickText(page,'Save');
    await page.waitForFunction(()=>[...document.querySelectorAll('h3')].some(element=>element.textContent==='Quality audit.txt'));
    const deleting=await page.evaluateHandle(()=>[...document.querySelectorAll('button[aria-label="Delete item"]')].find(button=>button.getBoundingClientRect().width));
    assert.ok(deleting.asElement());await deleting.asElement().click();await deleting.dispose();
    await page.waitForFunction(()=>![...document.querySelectorAll('h3')].some(element=>element.textContent==='Quality audit.txt'));
    assert.deepEqual(errors,[]);
    results.push({...variant,flow:'create and delete local text source',result:'passed'});
    await page.goto('http://127.0.0.1:4193/settings',{waitUntil:'networkidle0'});
    for(const width of [390,768,1440]) {
      await page.setViewport({width,height:900});
      const alignment=await page.evaluate(()=>({panel:document.querySelector('.interface-settings').getBoundingClientRect().left,content:document.querySelector('[data-motion-page] main>div').getBoundingClientRect().left,overflow:document.documentElement.scrollWidth>innerWidth}));
      assert.ok(Math.abs(alignment.panel-alignment.content)<2,JSON.stringify(alignment));assert.equal(alignment.overflow,false);
      if(width>=768)assert.ok(alignment.content>=256,'Settings hidden behind sidebar');
    }
    await page.select('select[aria-label=Appearance]','dark');await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));
    assert.equal(await page.$eval('html',element=>getComputedStyle(element).filter),'none');
    await page.select('select[aria-label=Appearance]','light');await page.waitForFunction(()=>!document.documentElement.classList.contains('dark'));
    const toggle=await page.$('button[role="switch"][aria-label="Streak reminders"]');assert.ok(toggle);
    const previous=await toggle.evaluate(button=>button.getAttribute('aria-checked'));await toggle.click();
    assert.notEqual(await toggle.evaluate(button=>button.getAttribute('aria-checked')),previous);
    assert.equal(await page.evaluate(()=>document.body.textContent.includes('Account deletion unavailable')),true);
    assert.equal(await page.evaluate(()=>document.body.textContent.includes('Yes, delete')),false);
    await page.evaluate(()=>{window.Notification=class {static requestPermission=async()=> 'denied';};});
    await clickText(page,'Allow browser notifications');await page.waitForFunction(()=>document.body.textContent.includes('Notifications not allowed'));
    await page.evaluate(()=>{window.Notification=class {static requestPermission=async()=> 'granted';constructor(){throw new Error('Service worker required');}};});
    await clickText(page,'Allow browser notifications');await page.waitForFunction(()=>document.body.textContent.includes('Test notification unavailable'));
    await page.evaluate(()=>{window.Notification=class {static requestPermission=async()=> {throw new Error('Permission unavailable');};};});
    await clickText(page,'Allow browser notifications');await page.waitForFunction(()=>document.body.textContent.includes('Couldn’t request permission'));
    results.push({...variant,flow:'aligned settings and working semantic theme switch',responsiveWidths:[390,768,1440],result:'passed'});
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log(`PASS ${results.length} functional quality flows; all API/auth responses are local fixtures`);
} finally {mkdirSync('.agent/quality',{recursive:true});writeFileSync('.agent/quality/flows.json',JSON.stringify(results,null,2));await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{}}
