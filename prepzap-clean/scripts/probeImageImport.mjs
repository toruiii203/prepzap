import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import puppeteer from 'puppeteer';
import { fixtureProfile, seedBrowser } from './uiFixtures.mjs';

// A diagnostic, not a passing product test. Uses a disposable browser account
// and synthetic pixels; it never uploads a student's file or calls a live API.
const server=spawn('npm',['exec','--','vite','preview','--host','127.0.0.1','--port','4194','--strictPort'],{stdio:'ignore',detached:true});
let browser;
mkdirSync('.agent/quality',{recursive:true});
try {
  for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:4194')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();await seedBrowser(page);
  await page.evaluateOnNewDocument(()=>localStorage.setItem('pz_tutorial_seen_/sources','true'));
  await page.goto('http://127.0.0.1:4194/sources',{waitUntil:'networkidle0'});
  const original=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    const context=canvas.getContext('2d');const pixels=context.createImageData(512,512);let seed=42;
    for(let index=0;index<pixels.data.length;index+=4){for(let channel=0;channel<3;channel++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels.data[index+channel]=seed>>>24;}pixels.data[index+3]=255;}
    context.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
  });
  const file='.agent/quality/synthetic-import.png';writeFileSync(file,Buffer.from(original.split(',')[1],'base64'));
  await (await page.$('input[type=file]')).uploadFile(file);
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem(`pz_${id}_source_library`)||'[]').some(item=>item.name==='synthetic-import.png'),{},fixtureProfile.id);
  const stored=await page.evaluate(id=>JSON.parse(localStorage.getItem(`pz_${id}_source_library`)||'[]').find(item=>item.name==='synthetic-import.png').content,fixtureProfile.id);
  const decodes=await page.evaluate(async source=>{try{const image=new Image();image.src=source;await image.decode();return true;}catch{return false;}},stored);
  const result={fixtureData:true,originalCharacters:original.length,storedCharacters:stored.length,bytesPreserved:original===stored,storedImageDecodes:decodes,status:original===stored&&decodes?'healthy':'confirmed image-import defect',severity:'P1',migrationApplied:false};
  writeFileSync('.agent/quality/image-import-probe.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
  if (!result.bytesPreserved || !result.storedImageDecodes) process.exitCode = 1;
} finally {await browser?.close();try{process.kill(-server.pid,'SIGTERM');}catch{}}
