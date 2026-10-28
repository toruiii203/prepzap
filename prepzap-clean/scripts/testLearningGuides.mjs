/** Built-UI tests: real IndexedDB, real file extraction, fixture generation/auth only. */
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import { seedBrowser } from "./uiFixtures.mjs";
const fixture = JSON.parse(
  await readFile("scripts/fixtures/roadmap.json", "utf8"),
);
const base = "http://127.0.0.1:4199",
  results = [];
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
const quote = "The derivative of x squared is two x.";
function makePdf(lines) {
  const stream =
    "BT /F1 12 Tf 50 740 Td 18 TL " +
    lines
      .map(
        (line, i) => `${i ? "T* " : ""}(${line.replace(/[()\\]/g, "\\$&")}) Tj`,
      )
      .join(" ") +
    " ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(output));
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, "0") + " 00000 n ")
    .join(
      "\n",
    )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return output;
}
async function hit(page, selector) {
  await page.$eval(selector, (node) =>
    node.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await page.locator(selector).click();
}
async function click(page, text) {
  const handle = await page.evaluateHandle(
    (value) =>
      [...document.querySelectorAll("button")].find((node) => {
        const clone = node.cloneNode(true);
        clone
          .querySelectorAll("svg,[aria-hidden=true],.material-symbols-outlined")
          .forEach((item) => item.remove());
        return (
          node.getBoundingClientRect().width &&
          clone.textContent.trim().replace(/\s+/g, " ") === value
        );
      }),
    text,
  );
  assert.ok(handle.asElement(), `Missing button: ${text}`);
  await handle
    .asElement()
    .evaluate((node) =>
      node.scrollIntoView({ block: "center", behavior: "instant" }),
    );
  await handle.asElement().click();
  await handle.dispose();
}
async function fill(page, label, text) {
  const handle = await page.evaluateHandle(
    (label) =>
      [...document.querySelectorAll("label")]
        .find((node) => node.childNodes[0]?.textContent.trim() === label)
        ?.querySelector("input,textarea"),
    label,
  );
  assert.ok(handle.asElement(), `Missing field ${label}`);
  await handle.asElement().evaluate((node, text) => {
    const set = Object.getOwnPropertyDescriptor(
      node instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    ).set;
    set.call(node, text);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
  await handle.dispose();
}
async function settled(page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".rm-stage")].every(
      (node) => Number(getComputedStyle(node).opacity) === 1,
    ),
  );
}
async function capture(page, name) {
  await settled(page);
  await page.screenshot({ path: `.agent/roadmaps/${name}.png` });
}
async function bounds(page) {
  const r = await page.$eval(".rm-dialog", (node) => {
    const r = node.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      right: r.right,
      bottom: r.bottom,
      w: innerWidth,
      h: innerHeight,
    };
  });
  assert.ok(
    r.x >= -1 && r.y >= -1 && r.right <= r.w + 1 && r.bottom <= r.h + 1,
    JSON.stringify(r),
  );
  assert.equal(
    await page.$eval(
      ".rm-dialog-body",
      (node) => node.scrollWidth > node.clientWidth + 2,
    ),
    false,
  );
}
async function close(page) {
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("[role=dialog]"));
}
async function answerSet(page, count, wrong = false, finish = true) {
  for (let i = 0; i < count; i++) {
    await page.waitForSelector(".rm-options button:not(:disabled)");
    const choices = await page.$$(".rm-options button");
    await choices[wrong ? 1 : 0].evaluate((node) =>
      node.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await choices[wrong ? 1 : 0].click();
    await click(page, "Check answer");
    await page.waitForSelector(".rm-feedback");
    if (i < count - 1) await click(page, "Next question");
    else if (finish)
      await click(page, count === 3 ? "See review status" : "Next stage");
  }
}
try {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  await mkdir(".agent/roadmaps", { recursive: true });
  for (const [width, height] of [
    [320, 844],
    [390, 700],
    [1280, 800],
    [844, 390],
  ])
    for (const theme of ["light", "dark"]) {
      const context = await browser.createBrowserContext(),
        page = await context.newPage(),
        tag = `${width}x${height}-${theme}`,
        errors = [],
        requests = [];
      let reply = "normal";
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewport({ width, height });
      await seedBrowser(page, {
        theme,
        generationContent: (body) => {
          requests.push(body);
          const prompt = body.messages.at(-1).content;
          assert.equal(body.feature, "quick_study");
          assert.ok(
            body.messages.every((item) => typeof item.content === "string"),
          );
          assert.ok(!JSON.stringify(body).includes("PRIVATE_OTHER_FILE"));
          if (reply === "invalid")
            return JSON.stringify({ title: "Incomplete" });
          const isFile = prompt.includes('"sourceText":');
          if (prompt.startsWith("Write 3 NEW"))
            return JSON.stringify(
              fixture.lesson.checkpoint.map((q) => ({
                ...q,
                prompt: "Fresh transfer " + q.prompt,
              })),
            );
          if (prompt.startsWith("Write 2 NEW"))
            return JSON.stringify(
              fixture.lesson.review.map((q) => ({
                ...q,
                prompt: "Fresh review " + q.prompt,
              })),
            );
          const data = structuredClone(
            prompt.startsWith("Build a") ? fixture.outline : fixture.lesson,
          );
          if (isFile) {
            if (data.units)
              data.units.forEach((unit) => (unit.evidence = [quote]));
            else data.evidence = [quote];
          }
          return JSON.stringify(data);
        },
      });
      await page.evaluateOnNewDocument(() => {
        for (const route of ["/dashboard", "/arena"])
          localStorage.setItem("pz_tutorial_seen_" + route, "true");
      });
      await page.goto(base + "/dashboard", { waitUntil: "networkidle0" });
      await page.waitForSelector(".rm-new:not(:disabled)");
      assert.equal(
        await page.evaluate(() =>
          document.body.textContent.includes("Active Recall & Foundations"),
        ),
        false,
      );
      const original = await page.evaluate(() =>
        ["pz_completed_nodes", "pz_current_lesson_node_id", "pz_total_xp"].map(
          (key) => localStorage.getItem(key),
        ),
      );
      await hit(page, '[aria-label="Create a learning roadmap"]');
      await page.waitForSelector(".rm-create");
      await fill(page, "Topic", "Biology");
      assert.ok(
        await page.$eval(".rm-create>.rm-primary", (button) => button.disabled),
      );
      await fill(page, "Choose a focus to keep this useful", "Cell transport");
      await fill(page, "Topic", "Integration");
      await click(page, "Preview my roadmap");
      await page.waitForSelector(".rm-outline");
      await bounds(page);
      await capture(page, tag + "-preview");
      await click(page, "Save this roadmap");
      await page.waitForSelector(".rm-topic-path");
      await bounds(page);
      await capture(page, tag + "-path");
      await hit(page, '[aria-label="Open chapter 1: Reverse a derivative"]');
      await page.waitForSelector(".rm-stage");
      await capture(page, tag + "-lesson");
      await click(page, "Mark as read & try it");
      await page.waitForSelector(".rm-options");
      await answerSet(page, 2);
      await answerSet(page, 2);
      for (let i = 0; i < 2; i++) {
        await page.waitForSelector("textarea");
        await fill(
          page,
          "Explain it from memory",
          "Differentiate the proposed function and compare its derivative with the original function.",
        );
        await click(page, "Compare with a model answer");
        await click(page, "I included these ideas");
        if (i === 0)
          await page.waitForFunction(() =>
            document
              .querySelector(".rm-stage .rm-eyebrow")
              ?.textContent.includes("Recall 2"),
          );
        else await page.waitForSelector(".rm-options");
      }
      await page.waitForSelector(".rm-options");
      await answerSet(page, 3, true, false);
      await page.waitForSelector(".rm-summary");
      assert.ok(
        await page.$eval(".rm-summary", (node) =>
          node.textContent.includes("0 of 3"),
        ),
      );
      await capture(page, tag + "-recovery");
      await click(page, "Generate a fresh checkpoint");
      await page.waitForSelector(".rm-options button:not(:disabled)");
      await answerSet(page, 3, false);
      await page.waitForSelector(".rm-review-wait");
      assert.ok(
        await page.$eval(".rm-review-wait", (node) =>
          node.textContent.includes("Later review opens"),
        ),
      );
      await close(page);
      await page.reload({ waitUntil: "networkidle0" });
      await page.waitForSelector(".rm-saved-card");
      await hit(page, ".rm-saved-card");
      await page.waitForSelector(".rm-topic-path");
      assert.ok(
        await page.$eval(".rm-topic-path", (node) =>
          node.textContent.includes("Ready for review"),
        ),
      );
      await close(page);
      await page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open("StudeniusLearningRoadmaps");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise((resolve, reject) => {
          const transaction = db.transaction("paths", "readwrite"),
            store = transaction.objectStore("paths"),
            req = store.getAll();
          req.onsuccess = () => {
            const path = req.result[0];
            path.progress["0"].readyAt = Date.now() - 25 * 60 * 60 * 1000;
            store.put(path);
            store.put({
              ...path,
              id: "private",
              ownerId: "other-account",
              outline: { ...path.outline, title: "PRIVATE OTHER ACCOUNT" },
            });
          };
          transaction.oncomplete = resolve;
          transaction.onerror = () => reject(transaction.error);
        });
        db.close();
      });
      await page.reload({ waitUntil: "networkidle0" });
      await page.waitForSelector(".rm-saved-card");
      assert.equal(
        await page.evaluate(() =>
          document.body.textContent.includes("PRIVATE OTHER ACCOUNT"),
        ),
        false,
      );
      await hit(page, ".rm-saved-card");
      await page.waitForSelector(".rm-topic-path");
      assert.ok(
        await page.$eval(".rm-topic-path", (node) =>
          node.textContent.includes("Review due"),
        ),
      );
      await hit(page, '[aria-label="Open chapter 1: Reverse a derivative"]');
      await page.waitForSelector(".rm-options");
      for (let i = 0; i < 2; i++) {
        await hit(page, ".rm-options button");
        await click(page, "Check answer");
        await page.waitForSelector(".rm-feedback");
        if (i === 0) await click(page, "Next question");
      }
      await page.waitForFunction(() =>
        document
          .querySelector(".rm-summary")
          ?.textContent.includes("Later review completed"),
      );
      await capture(page, tag + "-review");
      await close(page);
      // File mode: real upload and exact-source evidence validation, one file only.
      await hit(page, '[aria-label="Create a learning roadmap"]');
      await click(page, "Use one file");
      await writeFile(
        ".agent/roadmaps/source.txt",
        `${quote} ${"An antiderivative reverses differentiation. ".repeat(10)}`,
      );
      const input = await page.$('input[aria-label="Upload one roadmap file"]');
      await input.uploadFile(".agent/roadmaps/source.txt");
      await page.waitForSelector(".rm-selected-source");
      await click(page, "Preview my roadmap");
      await page.waitForSelector(".rm-outline");
      assert.ok(requests.at(-1).messages.at(-1).content.includes("source.txt"));
      await capture(page, tag + "-file");
      await close(page);
      if (width === 320 && theme === "light") {
        await hit(page, '[aria-label="Create a learning roadmap"]');
        await click(page, "Use one file");
        await writeFile(".agent/roadmaps/empty.pdf", makePdf([]));
        await (
          await page.$('input[aria-label="Upload one roadmap file"]')
        ).uploadFile(".agent/roadmaps/empty.pdf");
        await page.waitForFunction(() =>
          document
            .querySelector(".rm-error")
            ?.textContent.includes("too little readable text"),
        );
        await writeFile(
          ".agent/roadmaps/course.pdf",
          makePdf([
            quote,
            "An antiderivative reverses differentiation.",
            "Adding a constant does not change a derivative.",
            "Use differentiation to check a proposed answer.",
          ]),
        );
        await (
          await page.$('input[aria-label="Upload one roadmap file"]')
        ).uploadFile(".agent/roadmaps/course.pdf");
        await page.waitForSelector(".rm-selected-source");
        assert.ok(
          await page.$eval(".rm-selected-source", (node) =>
            node.textContent.includes("Read 1 of 1 pages"),
          ),
        );
        await click(page, "Preview my roadmap");
        await page.waitForSelector(".rm-outline");
        await capture(page, tag + "-pdf");
        await close(page);
        const backup = await page.evaluate(async () => {
          const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open("StudeniusLearningRoadmaps");
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          const paths = await new Promise((resolve, reject) => {
            const req = db.transaction("paths").objectStore("paths").getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          db.close();
          return paths.find((path) => path.ownerId === "ui-fixture-student");
        });
        backup.ownerId = "backup-from-another-device";
        await writeFile(".agent/roadmaps/backup.json", JSON.stringify(backup));
        await (
          await page.$('input[aria-label="Restore roadmap backup"]')
        ).uploadFile(".agent/roadmaps/backup.json");
        await page.waitForSelector(".rm-topic-path");
        assert.equal((await page.$$(".rm-saved-card")).length, 2);
        await click(page, "Delete roadmap");
        await click(page, "Keep roadmap");
        await click(page, "Delete roadmap");
        await click(page, "Delete permanently");
        await page.waitForFunction(
          () => !document.querySelector("[role=dialog]"),
        );
        assert.equal((await page.$$(".rm-saved-card")).length, 1);
      }

      await hit(page, '[aria-label="Create a learning roadmap"]');
      await fill(page, "Topic", "Malformed response");
      reply = "invalid";
      await click(page, "Preview my roadmap");
      await page.waitForSelector(".rm-error");
      assert.equal(
        await page.$eval(".rm-field input", (node) => node.value),
        "Malformed response",
      );
      await close(page);
      reply = "normal";
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await hit(page, '[aria-label="Create a learning roadmap"]');
      await fill(page, "Topic", "Offline topic");
      await page.setOfflineMode(true);
      await click(page, "Preview my roadmap");
      await page.waitForSelector(".rm-error");
      await page.setOfflineMode(false);
      await close(page);
      assert.deepEqual(
        await page.evaluate(() =>
          [
            "pz_completed_nodes",
            "pz_current_lesson_node_id",
            "pz_total_xp",
          ].map((key) => localStorage.getItem(key)),
        ),
        original,
      );
      assert.deepEqual(errors, []);
      results.push({
        width,
        height,
        theme,
        passed: true,
        generationRequests: requests.length,
        storage: "real IndexedDB",
        data: "fixture responses; actual local file extraction",
      });
      console.log("PASS roadmap", tag);
      await context.close();
    }
} catch (error) {
  if (browser) {
    const pages = await browser.pages(),
      page = pages.at(-1);
    await page.screenshot({ path: ".agent/roadmaps/failure.png" });
    console.log(
      await page.evaluate(() => document.body.textContent.slice(-2200)),
    );
  }
  throw error;
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
  await writeFile(
    ".agent/roadmaps/results.json",
    JSON.stringify(results, null, 2),
  );
}
assert.equal(results.length, 8);
