#!/usr/bin/env node
/**
 * Coarena local computer server
 * ------------------------------------------------------------------
 * Gives the app a real Chromium you can click, scroll and type into.
 * The browser (PWA / preview) talks to it on http://localhost:8787.
 *
 *   npm i -D playwright        (once)
 *   npx playwright install chromium
 *   node server/index.mjs
 *
 * Endpoints (all JSON, CORS enabled for the app origin):
 *   GET  /health
 *   POST /browser/goto       { url }
 *   POST /browser/screenshot
 *   POST /browser/search     { query }
 *   POST /browser/mouse      { x, y }            0..1 relative to the viewport
 *   POST /browser/click      { text } | { x, y } click by visible text
 *   POST /browser/type       { selector, text, submit }
 *   POST /browser/keys       { text, enter }
 *   POST /browser/scroll     { dy }
 *   POST /browser/back
 *   POST /proxy              { url, method, headers, body }   CORS escape hatch
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = Number(process.env.PORT || 8787);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const json = (res, code, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(body);
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });

const normUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${String(u).replace(/^\/+/, "")}`);

let browser = null;
let page = null;
let lastShot = null;

async function getPage() {
  if (page && !page.isClosed()) return page;
  if (!browser) {
    let playwright;
    try {
      playwright = await import("playwright");
    } catch {
      throw new Error(
        "Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium",
      );
    }
    browser = await playwright.chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
    });
    browser.on("disconnected", () => { browser = null; page = null; });
  }
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 860 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  return page;
}

async function snapshot() {
  const p = await getPage();
  const screenshot = await p.screenshot({ type: "jpeg", quality: 72 });
  const url = p.url();
  let title = "";
  try { title = await p.title(); } catch { /* navigated away */ }
  lastShot = screenshot.toString("base64");
  return { url, title, screenshot: `data:image/jpeg;base64,${lastShot}`, text: await p.locator("body").innerText().catch(() => "") };
}

const handle = {
  "browser/goto": async ({ url }) => {
    const p = await getPage();
    await p.goto(normUrl(url), { waitUntil: "domcontentloaded", timeout: 25000 });
    await p.waitForTimeout(350);
    return snapshot();
  },
  "browser/screenshot": async () => snapshot(),
  "browser/search": async ({ query }) => {
    const p = await getPage();
    await p.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(400);
    const results = await p.evaluate(() =>
      [...document.querySelectorAll("article")]
        .map((a) => ({
          title: a.querySelector("h2")?.innerText?.trim() ?? "",
          url: a.querySelector("a")?.href ?? "",
          snippet: a.querySelector("div")?.innerText?.trim() ?? "",
        }))
        .filter((r) => r.title && r.url)
        .slice(0, 10),
    );
    const snap = await snapshot();
    return { ...snap, results };
  },
  "browser/mouse": async ({ x, y }) => {
    const p = await getPage();
    const vp = p.viewportSize() ?? { width: 1280, height: 860 };
    await p.mouse.click(Number(x) * vp.width, Number(y) * vp.height);
    await p.waitForTimeout(250);
    return snapshot();
  },
  "browser/click": async ({ text, x, y }) => {
    const p = await getPage();
    if (text) {
      const target = p.getByText(text, { exact: false }).first();
      await target.click({ timeout: 8000 });
    } else if (x !== undefined) {
      const vp = p.viewportSize() ?? { width: 1280, height: 860 };
      await p.mouse.click(Number(x) * vp.width, Number(y) * vp.height);
    } else {
      throw new Error("click needs text or x/y");
    }
    await p.waitForTimeout(300);
    return snapshot();
  },
  "browser/type": async ({ selector, text, submit }) => {
    const p = await getPage();
    const field = selector
      ? p.locator(selector).first()
      : p.locator("input:visible, textarea:visible").first();
    await field.click({ timeout: 8000 });
    await field.fill(String(text ?? ""));
    if (submit) await field.press("Enter");
    await p.waitForTimeout(300);
    return snapshot();
  },
  "browser/keys": async ({ text, enter }) => {
    const p = await getPage();
    if (text) await p.keyboard.type(String(text));
    if (enter) await p.keyboard.press("Enter");
    await p.waitForTimeout(250);
    return snapshot();
  },
  "browser/scroll": async ({ dy }) => {
    const p = await getPage();
    await p.evaluate((delta) => window.scrollBy(0, Number(delta) || 0), dy);
    await p.waitForTimeout(250);
    return snapshot();
  },
  "browser/back": async () => {
    const p = await getPage();
    await p.goBack({ timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(250);
    return snapshot();
  },
};

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const path = url.pathname.replace(/\/+$/, "");

    if (path === "/health") {
      let pkg = {};
      try { pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")); } catch { /* */ }
      return json(res, 200, {
        ok: true,
        name: "coarena-computer",
        playwright: !!pkg.devDependencies?.playwright || !!pkg.dependencies?.playwright,
        uptime: Math.round(process.uptime()),
      });
    }

    if (path === "/proxy") {
      const { url: target, method = "GET", headers = {}, body } = await readBody(req);
      const upstream = await fetch(target, { method, headers, body: body ?? undefined });
      const text = await upstream.text();
      return json(res, upstream.ok ? 200 : 502, { ok: upstream.ok, status: upstream.status, body: text });
    }

    const fn = handle[path.replace(/^\//, "")];
    if (!fn) return json(res, 404, { error: `Unknown endpoint ${path}` });
    const out = await fn(await readBody(req));
    return json(res, 200, { ...out, ok: true });
  } catch (e) {
    return json(res, 500, { error: String(e?.message ?? e) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Coarena computer server\n  → http://localhost:${PORT}\n  Health: http://localhost:${PORT}/health\n`);
  console.log("  Waiting for the app to open a page…\n");
});
