import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { seedBrowser } from './uiFixtures.mjs';
const base='http://127.0.0.1:4195';
const server=spawn('npm',['exec','--','vite','preview','--host','127.0.0.1','--port','4195','--strictPort'],{stdio:'ignore',detached:true});
let browser; const results=[];
async function generate(page) {
  const button=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(element=>element.getBoundingClientRect().width&&/^(Generate Quiz|Generate Mastery Quiz)$/i.test(element.innerText.replace('bolt','').replace(/\s+/g,' ').trim())));
  if(!button.asElement()){await page.screenshot({path:'.agent/emotional-motion/missing-generation.png'});console.log(await page.evaluate(()=>[...document.querySelectorAll('button')].filter(element=>element.getBoundingClientRect().width).map(element=>element.innerText)));}
  assert.ok(button.asElement(),'Visible generation action missing');await button.asElement().click();await button.dispose();
}
try {
  for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  mkdirSync('.agent/emotional-motion',{recursive:true});
  for(const [width,height] of [[320,844],[390,844],[844,390],[1440,900]])for(const theme of ['light','dark']) {
    const context=await browser.createBrowserContext();const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));await page.setViewport({width,height});
    await seedBrowser(page,{theme,generationDelayMs:1200});
    await page.evaluateOnNewDocument(()=>{localStorage.setItem('pz_tutorial_seen_/dashboard','true');const now=new Date();const day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');localStorage.setItem('pz_popup_seen_v1:ui-fixture-student',JSON.stringify({version:1,day,types:['daily-streak']}));});
    await page.goto(base+'/practice',{waitUntil:'networkidle0'});await generate(page);
    await page.waitForSelector('[role=dialog] .study-generation-note');
    assert.equal(await page.$eval('[role=dialog] ol',element=>element.getAttribute('aria-busy')),'true');
    assert.equal(await page.$eval('[role=dialog]',element=>element.contains(document.activeElement)),true,'Focus escaped modal');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:`.agent/emotional-motion/generating-${width}-${theme}.png`});
    await page.waitForFunction(()=>!document.querySelector('.study-generation-dialog'));
    await page.waitForFunction(()=>document.body.innerText.includes('Which process divides a cell?'));
    await page.goto(base+'/dashboard',{waitUntil:'networkidle0'});
    await page.waitForSelector('.path-seedling [data-pose=peek]');
    await page.$eval('.path-seedling',element=>element.scrollIntoView({block:'center',behavior:'instant'}));
    const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(element=>element.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(element=>({tag:element.tagName,cls:element.getAttribute('class'),right:element.getBoundingClientRect().right}))}));
    await page.screenshot({path:`.agent/emotional-motion/path-${width}-${theme}.png`});
    assert.ok(overflow.scroll<=overflow.width,JSON.stringify(overflow));
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
    assert.equal(await page.$$eval('.path-seedling svg *,.path-active-ring',elements=>elements.length>0&&elements.every(element=>getComputedStyle(element).animationName==='none')),true);
    await page.screenshot({path:`.agent/emotional-motion/path-${width}-${theme}.png`});
    assert.deepEqual(errors,[]);results.push({width,height,theme,fixtureData:true,generation:'passed',modalFocus:'passed',path:'passed',reducedMotion:'passed'});
    await context.close();
  }
  for(const scenario of ['background','failure']) {
    const context=await browser.createBrowserContext();const page=await context.newPage();await page.setViewport({width:390,height:844});
    await seedBrowser(page,{generationDelayMs:1200,...(scenario==='failure'?{generationContent:'[]'}:{})});
    let failureSeen=false;page.on('dialog',async dialog=>{failureSeen=dialog.message().includes('Failed to generate quiz');await dialog.dismiss();});
    await page.goto(base+'/practice',{waitUntil:'networkidle0'});await generate(page);await page.waitForSelector('.study-generation-dialog');
    if(scenario==='background'){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.study-generation-dialog'));await page.waitForFunction(()=>document.body.innerText.includes('Which process divides a cell?'));}
    else {await page.waitForFunction(()=>!document.querySelector('.study-generation-dialog'));assert.equal(failureSeen,true);}
    results.push({scenario,result:'passed',fixtureData:true});await context.close();
  }
  console.log(`PASS ${results.length} emotional motion scenarios using local fixtures`);
} finally {writeFileSync('.agent/emotional-motion/results.json',JSON.stringify(results,null,2));await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{}}
