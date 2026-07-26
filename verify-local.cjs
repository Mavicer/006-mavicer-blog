const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  let page = await ctx.newPage();
  await page.goto("http://127.0.0.1:5174/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2500);

  // Hero
  await page.screenshot({ path: "/tmp/v-local-hero.png" });

  // Scroll to content (blur)
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "/tmp/v-local-scrolled.png" });

  // Tools expanded
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(600);
  await page.locator(".toggle-tools-list").click({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/v-local-tools.png" });

  // Percent
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/v-local-percent.png" });

  await browser.close();
  console.log("done");
})();
