import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import puppeteer from 'puppeteer';
import { seedBrowser } from './uiFixtures.mjs';

const stage = process.argv[2] || 'after';
if (!['before', 'after'].includes(stage)) throw new Error('Use before or after');
const folder = `.agent/quality/${stage}`;
mkdirSync(folder, { recursive: true });
const routes = ['/dashboard','/practice','/sources','/flashcards','/notes','/planner','/analytics','/settings','/ai-tutor','/timer','/arena','/friends','/tools'];
const server = spawn('npm', ['exec','--','vite','preview','--host','127.0.0.1','--port','4192','--strictPort'], { stdio:'ignore', detached:true });
let browser;
const results = [];
try {
  for (let i=0;i<40;i++) {
    try { if ((await fetch('http://127.0.0.1:4192')).ok) break; } catch { /* Startup only. */ }
    await new Promise(resolve => setTimeout(resolve,250));
  }
  browser = await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  for (const route of routes) for (const variant of [{width:390,theme:'light'},{width:1440,theme:'dark'}]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({width:variant.width,height:900});
    await seedBrowser(page,{theme:variant.theme});
    await page.evaluateOnNewDocument(() => {
      for (const path of ['/dashboard','/practice','/sources','/flashcards','/notes','/planner','/analytics','/settings','/ai-tutor','/timer','/arena','/friends','/tools']) localStorage.setItem(`pz_tutorial_seen_${path}`,'true');
      window.qualityVitals = {cls:0,longTasks:0,maxTask:0};
      try {
        new PerformanceObserver(list => { for(const item of list.getEntries()) if(!item.hadRecentInput) window.qualityVitals.cls += item.value; }).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(list => { for(const item of list.getEntries()) { window.qualityVitals.longTasks++;window.qualityVitals.maxTask=Math.max(window.qualityVitals.maxTask,item.duration); } }).observe({type:'longtask',buffered:true});
      } catch { /* Browser profiling is supplementary. */ }
    });
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    try {
      await page.goto(`http://127.0.0.1:4192${route}`,{waitUntil:'networkidle0',timeout:25000});
      await page.waitForSelector('[data-motion-page]',{timeout:10000});
      const findings = await page.evaluate(() => {
        const visible = element => {const r=element.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(element).visibility!=='hidden';};
        const name = element => {
          const explicit=element.getAttribute('aria-label')||element.getAttribute('title');
          if(explicit)return explicit.trim();
          const labelled=element.getAttribute('aria-labelledby');
          if(labelled)return labelled.split(' ').map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();
          const label=element.closest('label')||(element.id?document.querySelector(`label[for="${CSS.escape(element.id)}"]`):null);
          if(label)return label.textContent.trim();
          const clone=element.cloneNode(true);clone.querySelectorAll('[aria-hidden=true],.material-symbols-outlined').forEach(node=>node.remove());
          return (clone.textContent||'').trim();
        };
        const controls=[...document.querySelectorAll('button,input:not([type=hidden]),select,textarea')].filter(visible);
        const unnamed=controls.filter(element=>!name(element)&&!(element.tagName==='INPUT'&&element.getAttribute('type')==='submit')).map(element=>({tag:element.tagName,placeholder:element.getAttribute('placeholder'),html:element.outerHTML.slice(0,250)}));
        const smallTargets=controls.filter(element=>{
          if(element.disabled)return false;
          const target=element.closest('label')||element;
          const r=target.getBoundingClientRect();return r.width<44||r.height<44;
        }).map(element=>({name:name(element),tag:element.tagName,width:Math.round((element.closest('label')||element).getBoundingClientRect().width),height:Math.round((element.closest('label')||element).getBoundingClientRect().height)}));
        const tinyText=[...document.querySelectorAll('[data-motion-page] p,[data-motion-page] button,[data-motion-page] label')].filter(visible).filter(element=>parseFloat(getComputedStyle(element).fontSize)<12).length;
        const brokenImages=[...document.images].filter(visible).filter(image=>image.complete&&image.naturalWidth===0).map(image=>({src:image.getAttribute('src'),local:image.src.startsWith(location.origin)}));
        const headings=[...document.querySelectorAll('h1,h2')].filter(visible).map(element=>element.textContent.trim());
        return {overflow:document.documentElement.scrollWidth>innerWidth,unnamed,smallTargets,tinyText,brokenImages,headings,headingCount:headings.length,vitals:window.qualityVitals,transferBytes:performance.getEntriesByType('resource').reduce((sum,entry)=>sum+entry.transferSize,0)};
      });
      const imagePath=`${folder}/${route.slice(1)}-${variant.width}-${variant.theme}.png`;
      await page.screenshot({path:imagePath,fullPage:false});
      results.push({route,...variant,...findings,errors,imagePath});
      console.log(`${route} ${variant.width} ${variant.theme}: overflow=${findings.overflow} unnamed=${findings.unnamed.length} smallTargets=${findings.smallTargets.length} errors=${errors.length}`);
    } catch(error) {results.push({route,...variant,errors:[...errors,error.message]});}
    await context.close();
  }
} finally {
  await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{}
  writeFileSync(`${folder}/report.json`,JSON.stringify({stage,fixtureData:true,limitations:['Chromium emulation, not physical iOS','Heuristic accessibility checks, not WCAG certification','HTTP/auth/AI services are intercepted fixtures'],results},null,2));
}
console.log(`Audited ${results.length} route/viewport/theme combinations; findings in ${folder}/report.json`);
if (stage === "after" && results.some(result => result.errors.length || result.overflow || result.unnamed?.length || result.smallTargets?.length)) process.exitCode = 1;
