const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  // === LOCAL ===
  let page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto("http://127.0.0.1:5174/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. Hero
  await page.screenshot({ path: "/tmp/v-local-hero.png" });

  // 2. Scrolled (blur)
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/v-local-scrolled.png" });

  // 3. Tools expanded
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(500);
  await page.locator(".toggle-tools-list").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/v-local-tools.png" });

  // 4. Percent state
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/v-local-percent.png" });

  console.log("[local] errors:", errs.length ? errs.slice(0,3) : "none");
  await page.close();

  // === ORIGINAL ===
  page = await ctx.newPage();
  await page.goto("https://aleph-null.cc/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/v-orig-hero.png" });
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/v-orig-scrolled.png" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(500);
  await page.locator(".toggle-tools-list").click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/v-orig-tools.png" });
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/v-orig-percent.png" });
  await page.close();

  await browser.close();
  console.log("done");
})();
