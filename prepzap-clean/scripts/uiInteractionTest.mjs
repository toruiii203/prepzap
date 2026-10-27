import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { seedBrowser } from './uiFixtures.mjs';
const port=4174, base=`http://127.0.0.1:${port}`;
const executablePath=process.env.PUPPETEER_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
const server=spawn('npm',['exec','--','vite','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore',detached:true});
const results=[]; let browser;
try {
  for(let i=0;i<40;i++){ try{if((await fetch(base)).ok)break;}catch{} await new Promise(resolve=>setTimeout(resolve,250)); }
  browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox']});
  mkdirSync('.agent/screenshots',{recursive:true});
  for(const [width,height] of [[320,844],[390,844],[430,932],[844,390],[1280,800]]) {
    for(const theme of ['light','dark']) {
      const page=await browser.newPage();const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.setViewport({width,height,isMobile:width<1000,hasTouch:width<1000});
      await seedBrowser(page,{lesson:true,theme});
      await page.goto(base+'/practice',{waitUntil:'networkidle2'});
      await page.waitForSelector('.quiz-shell .quiz-answer',{visible:true});
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.$eval('.quiz-shell',element=>element.scrollWidth<=window.innerWidth),true,'horizontal overflow');
      assert.equal(await page.$eval('html',element=>getComputedStyle(element).filter),'none');
      await page.click('.quiz-shell .quiz-answer:nth-child(2)');
      await page.click('.quiz-shell .quiz-feedback button');
      await page.screenshot({path:'.agent/interaction-step.png',fullPage:false});
      await page.waitForSelector('.quiz-shell [data-mood="sad"]',{timeout:8000});
      assert.equal(await page.$eval('.quiz-shell [role=status]',element=>element.textContent.includes('Correct answer: Mitosis')),true);
      await page.click('.quiz-shell .quiz-feedback button');
      await page.waitForFunction(()=>document.querySelector('.quiz-shell .quiz-answer')?.getAttribute('data-state')==='idle');
      await page.click('.quiz-shell .quiz-answer:first-child');
      await page.click('.quiz-shell .quiz-feedback button');
      await page.waitForSelector('.quiz-shell [data-mood="happy"]');
      assert.equal(await page.$eval('.quiz-shell .quiz-answer[data-state=correct]',element=>getComputedStyle(element).backgroundColor),'rgb(16, 185, 129)');
      await page.screenshot({path:`.agent/screenshots/quiz-${width}-${theme}.png`,fullPage:false});
      await page.click('.quiz-shell .quiz-feedback button');
      await page.waitForSelector('[data-victory-screen]');
      assert.equal(await page.$eval('[data-victory-screen]',element=>element.contains(document.activeElement)),true);
      assert.equal(await page.$eval('[data-victory-screen]',element=>element.scrollWidth<=window.innerWidth),true,'completion overflow');
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      await page.waitForFunction(()=>document.querySelector('[data-victory-screen] [data-mascot]')?.getAttribute('data-reduced-motion')==='true');
      assert.equal(await page.$$eval('[data-victory-screen] .seedling-art *',elements=>elements.length>0&&elements.every(element=>getComputedStyle(element).animationName==='none')),true);
      await page.screenshot({path:`.agent/screenshots/victory-${width}-${theme}.png`,fullPage:false});
      assert.deepEqual(errors,[]);
      results.push({width,height,theme,quiz:'passed',completion:'passed',reducedMotion:'passed'});
      console.log(`PASS ${width}x${height} ${theme}: correction, retry, mascot, completion focus, reduced motion`);
      await page.close();
    }
  }
  // Long text and keyboard-size changes use a local typed-answer fixture.
  const page=await browser.newPage(); await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await seedBrowser(page,{lesson:true,theme:'dark'});
  await page.evaluateOnNewDocument(()=>{
    const question={q:'Explain this concept in your own words. '.repeat(10),type:'identification',answerText:'Mitosis',subject:'Biology',difficulty:'Easy'};
    localStorage.setItem('pz_practice_queue',JSON.stringify([{id:'long-fixture',question,originalIndex:0,mastery:0,attempts:0,isReTest:false}]));
  });
  await page.goto(base+'/practice',{waitUntil:'networkidle2'});
  await page.waitForSelector('.quiz-shell input');await page.focus('.quiz-shell input');
  await page.setViewport({width:390,height:420,isMobile:true,hasTouch:true});
  await page.type('.quiz-shell input','Mitosis');
  assert.equal(await page.$eval('.quiz-shell',element=>element.scrollWidth<=window.innerWidth),true);
  assert.equal(await page.$eval('.quiz-shell .quiz-feedback button',element=>{const rect=element.getBoundingClientRect();return rect.bottom<=window.innerHeight && rect.height>=44;}),true,'bottom action overlaps resized viewport');
  console.log('PASS long question + typed input at keyboard-sized viewport');
  results.push({longText:true,keyboardViewport:'passed'}); await page.close();
} finally {
  await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{}
  mkdirSync('.agent',{recursive:true});writeFileSync('.agent/interaction-report.json',JSON.stringify(results,null,2));
}
