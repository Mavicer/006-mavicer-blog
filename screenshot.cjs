const { chromium } = require("playwright");
const LOCAL = "http://127.0.0.1:5174";
const ORIG = "https://aleph-null.cc";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  for (const [name, url, dark] of [
    ["local-home-light", LOCAL + "/", false],
    ["local-home-dark", LOCAL + "/", true],
    ["orig-home", ORIG + "/", false],
  ]) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    if (dark) {
      await page.evaluate(() => { document.documentElement.classList.add("dark"); localStorage.setItem("mavicer-theme","dark"); });
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/shot-${name}.png` });
    console.log(`[${name}] errors:`, errors.length ? errors.slice(0,5) : "none");
    await page.close();
  }
  // content + article
  const c = await ctx.newPage();
  await c.goto(LOCAL + "/", { waitUntil: "networkidle", timeout: 30000 });
  await c.evaluate(() => document.querySelector(".main-content-container")?.scrollIntoView());
  await c.waitForTimeout(1200);
  await c.screenshot({ path: "/tmp/shot-local-home-content.png" });
  await c.close();
  const a = await ctx.newPage();
  await a.goto(LOCAL + "/posts/hello-world", { waitUntil: "networkidle", timeout: 30000 });
  await a.waitForTimeout(1200);
  await a.screenshot({ path: "/tmp/shot-local-article.png" });
  await a.close();
  await browser.close();
  console.log("done");
})().catch((e)=>{ console.error(e); process.exit(1); });
