import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import {seedBrowser} from './uiFixtures.mjs';
const stage='regression';
const server=spawn('npm',['exec','--','vite','preview','--host','127.0.0.1','--port','4180','--strictPort'],{stdio:'ignore',detached:true,cwd:process.cwd()});
let browser;
try{
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:4180')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await seedBrowser(page,{theme:'light'});
 await page.evaluateOnNewDocument(()=>localStorage.setItem('pz_tutorial_seen_/sources','true')); 
 await page.goto('http://127.0.0.1:4180/tools',{waitUntil:'networkidle2'});
 await page.waitForFunction(()=>document.querySelector('.studenius-app')&&document.body.innerText.includes('All Study Tools'));
 const results=[];
 for(const name of ['Practice','Library','Practice','Library']){
  await page.evaluate(()=>{
   window.benchmarkStart=performance.now();window.benchmarkFullSkeleton=false;
   window.benchmarkShell=document.querySelector('.studenius-app');
   window.benchmarkObserver=new MutationObserver(()=>{if(document.querySelector('[aria-label="Loading your study space"]'))window.benchmarkFullSkeleton=true;});
   window.benchmarkObserver.observe(document.getElementById('root'),{subtree:true,childList:true});
  });
  await page.click(`nav[aria-label="Mobile Navigation"] button[aria-label="${name}"]`);
  const pattern=name==='Practice'?'Ready when you are':'Source Library';
  try { await page.waitForFunction(text=>document.querySelector('.studenius-app')&&[...document.querySelectorAll('h1,h2')].some(element=>element.textContent.trim()===text)&&!document.querySelector('[aria-label="Loading your study space"]'),{timeout:5000},pattern); } catch(error) { console.log('NAV DEBUG',name,page.url(),(await page.evaluate(()=>document.body.innerText)).slice(0,1600)); await page.screenshot({path:'.agent/navigation-debug.png'}); throw error; }
  const measured=await page.evaluate(()=>{window.benchmarkObserver.disconnect();return{ms:Math.round(performance.now()-window.benchmarkStart),shellPreserved:window.benchmarkShell===document.querySelector('.studenius-app'),fullScreenSkeleton:window.benchmarkFullSkeleton};});
  assert.equal(measured.shellPreserved,true,'Navigation remounted the protected app shell');
  assert.equal(measured.fullScreenSkeleton,false,'Navigation flashed a full-screen skeleton');
  results.push({name,...measured});console.log('PASS',name,JSON.stringify(measured));
 }
 await page.evaluate(()=>{const style=getComputedStyle(document.documentElement);if(style.getPropertyValue('--primary').trim()!=='3 64% 41%')throw new Error('Original crimson primary was not restored');});
 console.log('PASS original palette and stable navigation');mkdirSync('.agent',{recursive:true});writeFileSync(`.agent/navigation-${stage}.json`,JSON.stringify(results,null,2));
}finally{await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{}}
