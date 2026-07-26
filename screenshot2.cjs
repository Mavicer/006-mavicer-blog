// Capture multiple states for comparison
const { chromium } = require("playwright");

const LOCAL = "http://127.0.0.1:5174";
const ORIG = "https://aleph-null.cc";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  // === LOCAL: scroll content, tool hover ===
  let page = await ctx.newPage();
  const localErrors = [];
  page.on("pageerror", (e) => localErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") localErrors.push(m.text()); });
  await page.goto(LOCAL + "/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);

  // 1. Banner (hero)
  await page.screenshot({ path: "/tmp/d-local-hero.png" });

  // 2. Scroll to content (test background blur / transition)
  await page.evaluate(() => {
    document.querySelector(".main-content-container")?.scrollIntoView({ behavior: "smooth" });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/d-local-scrolled.png" });

  // 3. Tool expand + hover
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(800);
  const cog = page.locator(".toggle-tools-list");
  await cog.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/d-local-tools-expanded.png" });

  // 4. Scroll to trigger percent
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/d-local-percent.png" });
  console.log("[local] errors:", localErrors.length ? localErrors.slice(0, 5) : "none");
  await page.close();

  // === ORIG: same states ===
  page = await ctx.newPage();
  await page.goto(ORIG + "/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/d-orig-hero.png" });
  await page.evaluate(() => {
    document.querySelector(".main-content-container")?.scrollIntoView({ behavior: "smooth" });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/d-orig-scrolled.png" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(800);
  const origCog = page.locator(".toggle-tools-list");
  await origCog.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/d-orig-tools-expanded.png" });
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/d-orig-percent.png" });
  console.log("[orig] captured");
  await browser.close();
  console.log("done");
})();
