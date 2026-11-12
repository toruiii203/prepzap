/**
 * Playwright browser regression for Studenius PayPal Sandbox UI.
 *
 * All external API/network responses are synthetic fixtures. This does NOT
 * test real PayPal Sandbox authorization, browser accounts or merchant secrets.
 */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const base = "http://127.0.0.1:4197";
const uuid = "00000000-0000-4000-8000-000000000001";
const report = [];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (
  existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined
);
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? {executablePath} : {}),
  args: ["--no-sandbox"],
});
const server = spawn("npm", [
  "exec", "--", "vite", "preview", "--host", "127.0.0.1", "--port", "4197", "--strictPort",
], { detached: true, stdio: "ignore" });

const user = { id: uuid, email: "studenius-test@example.invalid",
  user_metadata: { full_name: "Studenius Test" }, app_metadata: {},
  aud: "authenticated", created_at: "2026-01-01T00:00:00Z", role: "authenticated" };
const profile = { id: uuid, email: user.email, full_name: "Studenius Test",
  plan: "free", onboarding_complete: true, credits_remaining: 50, streak_days: 1,
  total_xp: 20, daily_goal_minutes: 30, questions_answered: 0, accuracy_percent: 0 };
const jwtPart = Buffer.from(JSON.stringify({
  exp: Math.floor(Date.now()/1000) + 3600,
  sub: uuid, role:"authenticated", aud:"authenticated",
})).toString("base64url");
const access = "eyJhbGciOiJIUzI1NiJ9." + jwtPart + ".fixturesignature";
const session = { access_token: access, refresh_token: "fixture-refresh-token",
  token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now()/1000)+3600, user };

async function ready() {
  for(let i=0;i<100;i++){
    try {if((await fetch(base)).ok) return;}
    catch {}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error("Vite preview never started");
}
async function setup(width = 390) {
  const context=await browser.newContext({ viewport:{ width, height: 844 }, colorScheme:"light" });
  await context.addInitScript(({ session, user, profile })=>{
    const cache = { session, user, profile, cachedAt: Date.now() };
    localStorage.setItem("pz_auth_cache", JSON.stringify(cache));
    localStorage.setItem("pz-auth-storage", JSON.stringify(session));
    localStorage.setItem("pz_sound_muted", "true");
    localStorage.setItem("pz_tutorial_seen_/pro", "true");
  },{session,user,profile});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror", err=>errors.push(err.message));
  await page.route("**/*", async route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(url.hostname==="127.0.0.1"||url.hostname==="localhost")
      return route.continue();
    if(url.hostname==="fixture.supabase.co"){
      const headers = {"access-control-allow-origin":"*","content-type":"application/json"};
      if(url.pathname.includes("/auth/v1/user"))
        return route.fulfill({status:200,headers,body:JSON.stringify(user)});
      if(url.pathname.includes("/rest/v1/profiles"))
        return route.fulfill({status:200,headers,body:JSON.stringify(profile)});
      return route.fulfill({status:200,headers,body:"[]"});
    }
    if(url.hostname.endsWith(".sandbox.paypal.com"))
      return route.fulfill({status:200,contentType:"text/html",
        body:"<!doctype html><title>Mock Sandbox Page</title><h1>Mock PayPal approval page</h1>"});
    return route.abort();
  });
  return {page,context,errors};
}
async function view(page,path="/pro") {
  const resp=await page.goto(base+path,{waitUntil:"domcontentloaded"});
  assert(resp?.ok(), "Cannot open "+path);
  await page.getByRole("heading",{name:"Optimize Your Study Efficiency"}).waitFor({timeout:25000});
  await page.waitForTimeout(750);
  assert.equal(new URL(page.url()).pathname,"/pro","Authenticated user redirected away from /pro");
}
try {
  await ready();
  mkdirSync(".agent/paypal-playwright",{recursive:true});

  // Desktop: button, plan switching, own API call, and explicit error state.
  {
    const {page,context,errors}=await setup(1280);
    let attempts=0;
    await page.route("**/api/paypal-sandbox", async route=>{
      attempts++;
      const body=route.request().postDataJSON();
      assert.deepEqual(body,{action:"create",plan:"Yearly"});
      assert.equal(route.request().headers().authorization,"Bearer "+access);
      await route.fulfill({status:503,contentType:"application/json",
        body:JSON.stringify({error:"Sandbox credentials are not configured."})});
    });
    await view(page);
    await page.getByRole("button",{name:"Yearly"}).first().click();
    await page.getByRole("button",{name:/Try PayPal Sandbox/}).click();
    await page.getByRole("status").filter({hasText:"Sandbox credentials are not configured."}).waitFor();
    assert.equal(attempts,1,"Sandbox API should be called exactly once");
    await page.screenshot({path:".agent/paypal-playwright/error-desktop.png",fullPage:true});
    assert.deepEqual(errors,[],"No unexpected JS crashes");
    report.push({case:"desktop sandbox unavailable",result:"passed",mocked:true});
    await context.close();
  }

  // Mobile: approval redirects only to a recognized Sandbox domain.
  {
    const {page,context,errors}=await setup(390);
    let attempts=0;
    await page.route("**/api/paypal-sandbox", async route=>{
      attempts++;
      const body=route.request().postDataJSON();
      assert.deepEqual(body,{action:"create",plan:"Monthly"});
      await route.fulfill({status:200,contentType:"application/json",
        body:JSON.stringify({orderId:"4G12345678901234",
          approvalUrl:"https://www.sandbox.paypal.com/checkoutnow?token=4G12345678901234",sandbox:true})});
    });
    await view(page);
    await page.getByRole("button",{name:/Try PayPal Sandbox/}).click();
    await page.getByRole("heading",{name:"Mock PayPal approval page"}).waitFor({timeout:12000});
    assert.equal(attempts,1);
    assert(new URL(page.url()).hostname.endsWith(".sandbox.paypal.com"));
    assert.deepEqual(errors,[]);
    report.push({case:"mobile sandbox approval redirect",result:"passed",mocked:true});
    await context.close();
  }

  // Mobile: returned capture receipt is explicitly a no-money test, not Pro.
  {
    const {page,context,errors}=await setup(390);
    let captures=0;
    await page.route("**/api/paypal-sandbox", async route=>{
      captures++;
      const body=route.request().postDataJSON();
      assert.deepEqual(body,{action:"capture",orderId:"4G12345678901234"});
      await route.fulfill({status:200,contentType:"application/json",
        body:JSON.stringify({sandbox:true,captured:true,premiumGranted:false,plan:"Monthly"})});
    });
    await view(page,"/pro?paypal_demo=approved&token=4G12345678901234");
    await page.getByRole("status").filter({hasText:"Sandbox capture confirmed."}).waitFor({timeout:12000});
    assert.equal(captures,1);
    assert.equal(await page.getByText("You're already VIP!").count(),0,
      "Sandbox capture must not grant Pro");
    await page.screenshot({path:".agent/paypal-playwright/capture-mobile.png",fullPage:true});
    assert.deepEqual(errors,[]);
    report.push({case:"mobile sandbox capture receipt without real Pro",result:"passed",mocked:true});
    await context.close();
  }

  // Mobile cancellation should never call capture or claim a payment.
  {
    const {page,context,errors}=await setup(390);
    let captures=0;
    await page.route("**/api/paypal-sandbox",route=>{captures++;return route.abort();});
    await view(page,"/pro?paypal_demo=cancelled");
    await page.getByRole("status").filter({hasText:"checkout cancelled"}).waitFor();
    assert.equal(captures,0);
    assert.deepEqual(errors,[]);
    report.push({case:"mobile checkout cancellation",result:"passed",mocked:true});
    await context.close();
  }
} catch (error) {
  console.error("Playwright sandbox smoke failed",error);
  report.push({case:"failure",result:"failed",error:String(error)});
  process.exitCode=1;
} finally {
  writeFileSync(".agent/paypal-playwright/results.json",JSON.stringify(report,null,2));
  await browser.close();
  try {process.kill(-server.pid,"SIGTERM");}catch{}
  console.log(JSON.stringify(report,null,2));
}
