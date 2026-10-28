import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import { seedBrowser } from "./uiFixtures.mjs";
const base = "http://127.0.0.1:4199";
const server = spawn(
  "npm",
  [
    "exec",
    "--",
    "vite",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4199",
    "--strictPort",
  ],
  { stdio: "ignore", detached: true },
);
let browser;
const results = [];
async function click(page, text) {
  const handle = await page.evaluateHandle(
    (value) =>
      [...document.querySelectorAll("button")].find((node) => {
        const copy = node.cloneNode(true);
        copy
          .querySelectorAll("svg,[aria-hidden=true],.material-symbols-outlined")
          .forEach((item) => item.remove());
        return (
          node.getBoundingClientRect().width &&
          copy.textContent.trim().replace(/\s+/g, " ") === value
        );
      }),
    text,
  );
  assert.ok(handle.asElement(), `Missing ${text}`);
  await handle.asElement().click();
  await handle.dispose();
}
async function bounds(page, selector, tag) {
  const box = await page.$eval(selector, (node) => {
    const r = node.getBoundingClientRect();
    return {
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: innerWidth,
      height: innerHeight,
    };
  });
  assert.ok(
    box.left >= -1 &&
      box.right <= box.width + 1 &&
      box.top >= -1 &&
      box.bottom <= box.height + 1,
    `${tag}: clipped ${JSON.stringify(box)}`,
  );
}
async function openGuidebook(page) {
  await page.$eval('[aria-label="Open Guidebook"]', (node) =>
    node.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.locator('[aria-label="Open Guidebook"]').click();
}
async function math(page) {
  await click(page, "Math");
  await page.waitForSelector(".guidebook-topic");
  await page.evaluate(() =>
    [...document.querySelectorAll(".guidebook-topic")]
      .find(
        (node) =>
          node.querySelector("strong")?.textContent === "Integral basics",
      )
      .click(),
  );
  await page.waitForSelector(".guidebook-path");
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".guidebook-path li")].every(
      (node) => Number(getComputedStyle(node).opacity) === 1,
    ),
  );
}
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  await mkdir(".agent/learning-guides", { recursive: true });
  for (const [width, height] of [
    [320, 844],
    [390, 700],
    [390, 844],
    [1280, 800],
    [844, 390],
  ])
    for (const theme of ["light", "dark"]) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.bringToFront();
      const tag = `${width}x${height}-${theme}`,
        errors = [],
        roomRequests = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (/rest\/v1\/(exam_rooms|room_presence)/.test(request.url()))
          roomRequests.push(request.url());
      });
      await page.setViewport({ width, height });
      await seedBrowser(page, { theme });
      await page.evaluateOnNewDocument(() => {
        for (const route of [
          "/dashboard",
          "/arena",
          "/practice",
          "/sources",
          "/notes",
        ])
          localStorage.setItem("pz_tutorial_seen_" + route, "true");
      });
      await page.goto(base + "/dashboard", { waitUntil: "networkidle0" });
      await page.evaluate(() => document.fonts.ready);
      const before = await page.evaluate(() =>
        [
          "pz_completed_nodes",
          "pz_current_lesson_node_id",
          "pz_practice_questions",
        ].map((key) => localStorage.getItem(key)),
      );
      await page.click('[aria-label="Show page guide"]');
      await page.waitForSelector(".page-guide-card");
      await page.waitForFunction(
        () =>
          document.querySelector(".page-guide-card")?.dataset.anchored ===
          "true",
      );
      await bounds(page, ".page-guide-card", tag + " coach");
      await page.screenshot({
        path: `.agent/learning-guides/${tag}-page-guide.png`,
      });
      await click(page, "Next");
      await click(page, "Next");
      await click(page, "Got it");
      await page.waitForFunction(
        () => !document.querySelector("[role=dialog]"),
      );
      await page.click('[aria-label="Show page guide"]');
      await page.waitForSelector(".page-guide-card");
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("[role=dialog]"),
      );
      await openGuidebook(page);
      await page.waitForSelector(".guidebook-dialog");
      await bounds(page, ".guidebook-dialog", tag + " guidebook");
      await math(page);
      await page.screenshot({
        path: `.agent/learning-guides/${tag}-topic-path.png`,
      });
      await page.click('[aria-label="Read Reverse the derivative"]');
      await page.waitForSelector(".guidebook-options");
      await bounds(page, ".guidebook-actions button", tag + " lesson action");
      await page.screenshot({
        path: `.agent/learning-guides/${tag}-lesson.png`,
      });
      await click(page, "2x^2");
      await click(page, "Check my understanding");
      await page.waitForSelector(".guidebook-feedback[data-correct=false]");
      await click(page, "Try the check again");
      await click(page, "x^2");
      await click(page, "Check my understanding");
      await page.waitForSelector(".guidebook-feedback[data-correct=true]");
      await page.screenshot({
        path: `.agent/learning-guides/${tag}-feedback.png`,
      });
      await page.click('[aria-label="Back to topic map"]');
      assert.ok(
        await page.$eval(".guidebook-progress", (node) =>
          node.textContent.includes("1 of 4"),
        ),
      );
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("[role=dialog]"),
      );
      await openGuidebook(page);
      await page.waitForSelector(".guidebook-progress");
      assert.ok(
        await page.$eval(".guidebook-progress", (node) =>
          node.textContent.includes("1 of 4"),
        ),
      );
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("[role=dialog]"),
      );
      const after = await page.evaluate(() =>
        [
          "pz_completed_nodes",
          "pz_current_lesson_node_id",
          "pz_practice_questions",
        ].map((key) => localStorage.getItem(key)),
      );
      assert.deepEqual(after, before);
      assert.equal(
        await page.evaluate(() =>
          Object.keys(localStorage).some((key) =>
            /guidebook|topic-guide/i.test(key),
          ),
        ),
        false,
      );
      await page.reload({ waitUntil: "networkidle0" });
      await page.screenshot({
        path: `.agent/learning-guides/${tag}-reload.png`,
      });
      await openGuidebook(page);
      await page.waitForSelector(".guidebook-dialog");
      await math(page);
      assert.ok(
        await page.$eval(".guidebook-progress", (node) =>
          node.textContent.includes("0 of 4"),
        ),
      );
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("[role=dialog]"),
      );
      await page.goto(base + "/arena", { waitUntil: "networkidle0" });
      assert.equal(
        await page.evaluate(() =>
          document.body.textContent.includes("Exam Rooms"),
        ),
        false,
      );
      assert.deepEqual(roomRequests, []);
      await page.screenshot({
        path: `.agent/learning-guides/${tag}-arena.png`,
      });
      await click(page, "Open Live battles");
      await page.waitForFunction(() => location.pathname === "/rooms");
      await page.click('[aria-label="Show page guide"]');
      await page.waitForSelector(".page-guide-card");
      await bounds(page, ".page-guide-card", tag + " live battles guide");
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("[role=dialog]"),
      );
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await page.click('[aria-label="Show page guide"]');
      await page.waitForSelector(".page-guide-card");
      assert.equal(
        await page.$eval(
          ".page-guide-step",
          (node) => getComputedStyle(node).animationName,
        ),
        "none",
      );
      assert.deepEqual(errors, []);
      results.push({
        width,
        height,
        theme,
        result: "passed",
        checksPersisted: false,
        roomQueriesOnArena: 0,
      });
      console.log("PASS learning guides", tag);
      await context.close();
    }
} catch (error) {
  if (browser) {
    const pages = await browser.pages();
    const last = pages[pages.length - 1];
    await last.screenshot({ path: ".agent/learning-guides/failure.png" });
    console.log(
      await last.evaluate(() => ({
        url: location.pathname,
        dialogs: [...document.querySelectorAll("[role=dialog]")].map((node) =>
          node.textContent.slice(0, 160),
        ),
        bodyStyle: document.body.getAttribute("style"), errorDetails:document.querySelector("details")?.textContent,
        buttons: [
          ...document.querySelectorAll('[aria-label="Open Guidebook"]'),
        ].map((node) => ({
          html: node.outerHTML,
          rect: node.getBoundingClientRect().toJSON(),
        })),
      })),
    );
  }
  throw error;
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
  await writeFile(
    ".agent/learning-guides/results.json",
    JSON.stringify(results, null, 2),
  );
}
assert.equal(results.length, 10);
