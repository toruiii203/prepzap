import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { seedBrowser } from './uiFixtures.mjs';

const server = spawn('npm', ['exec','--','vite','preview','--host','127.0.0.1','--port','4189','--strictPort'], { stdio:'ignore', detached:true });
let browser;
const results=[];
mkdirSync('.agent/mascot-rollout', { recursive:true });
try {
  for(let i=0;i<40;i++) {
    try { if((await fetch('http://127.0.0.1:4189')).ok) break; } catch { /* Startup only. */ }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  for(const theme of ['light','dark']) {
    const context=await browser.createBrowserContext();
    const page=await context.newPage();
    await seedBrowser(page,{theme});
    await page.evaluateOnNewDocument(()=>localStorage.setItem('pz_tutorial_seen_/dashboard','true'));
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    for(const width of [390,768,1024,1440,1920,2560]) {
      await page.setViewport({width,height:900});
      await page.goto('http://127.0.0.1:4189/dashboard',{waitUntil:'networkidle0'});
      const geometry=await page.evaluate(()=>{
        const greeting=document.querySelector('.dashboard-greeting');
        const mascot=greeting.querySelector('[data-mascot]');
        const sidebar=document.querySelector('aside.hidden.md\\:flex.fixed');
        const sidebarRight=sidebar&&getComputedStyle(sidebar).display!=='none'?sidebar.getBoundingClientRect().right:0;
        return {mascotLeft:mascot.getBoundingClientRect().left,sidebarRight,overflow:document.documentElement.scrollWidth>innerWidth,oldParts:document.querySelectorAll('[data-part="cap"],[data-part="tail"],[data-mascot="rex"]').length,seedling:!!greeting.querySelector('.seedling-art'),textLeft:greeting.querySelector('div:last-child').getBoundingClientRect().left};
      });
      assert.equal(geometry.seedling,true);
      assert.equal(geometry.oldParts,0);
      if(geometry.overflow) console.log("OVERFLOW",JSON.stringify({theme,width,geometry,offenders:await page.evaluate(()=>[...document.querySelectorAll("body *")].filter(el=>{if(el.getBoundingClientRect().right<=innerWidth+1)return false;for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement){if(["auto","hidden","scroll","clip"].includes(getComputedStyle(parent).overflowX))return false;}return true;}).slice(0,12).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right})))}));
      assert.equal(geometry.overflow,false,JSON.stringify({theme,width,geometry}));
      assert.ok(geometry.mascotLeft>=geometry.sidebarRight,`Mascot hidden by sidebar at ${width}px: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.textLeft>=geometry.sidebarRight,`Greeting text hidden at ${width}px`);
      if(width===1440) await page.screenshot({path:`design/seedling/review/desktop-header-${theme}.png`,clip:{x:0,y:0,width,height:350}});
      results.push({theme,width,...geometry});
    }
    if(theme==='light') {
      const pixels=await page.evaluate(async()=>{
        const paths=['/fox/fox-neutral.png','/animations/rex_waving.webp','/buddies/fox_scholar.png'];
        const values=[];
        for(const path of paths) {
          const image=new Image();image.src=path;await image.decode();
          const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;
          const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,400,400);
          values.push({path,pixel:[...ctx.getImageData(200,200,1,1).data]});
        }
        return values;
      });
      for(const {path,pixel} of pixels) {
        assert.ok(Math.abs(pixel[0]-252)<6&&Math.abs(pixel[1]-235)<6&&Math.abs(pixel[2]-203)<6,`Legacy URL does not show approved cream body: ${path}: ${pixel}`);
      }
      results.push({legacyAssets:pixels});
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  writeFileSync('.agent/mascot-rollout/report.json',JSON.stringify(results,null,2));
  console.log('PASS 12 viewport/theme checks: seedling visible, no sidebar overlap or overflow; legacy asset pixels match approved SVG');
} finally { await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{} }
