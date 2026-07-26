const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  // LOCAL: hero, scrolled (blur test), percent state
  let page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto("http://127.0.0.1:5174/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/v-local-hero.png" });

  // Check subtitle is being typed (should have non-empty text or be cycling)
  const subText = await page.locator("#subtitle").textContent();
  console.log("[local] subtitle:", JSON.stringify(subText));

  // Scroll to trigger blur
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/v-local-scrolled.png" });

  // Check background blur filter applied
  const blurVal = await page.evaluate(() => {
    const el = document.querySelector(".home-banner-background");
    return el ? getComputedStyle(el).filter : "no-element";
  });
  console.log("[local] background filter:", blurVal);

  // Check percent badge exists in DOM (even if hidden by display:none)
  const percentExists = await page.locator(".tool-scroll-to-top .percent").count();
  console.log("[local] percent badge in DOM:", percentExists);

  // Scroll back to top, check tool-scroll-to-top has .show class
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(500);
  // now scroll down a bit to show it
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
  await page.waitForTimeout(500);
  const showClass = await page.locator(".tool-scroll-to-top").evaluate(el => el.className);
  console.log("[local] scroll-to-top classes:", JSON.stringify(showClass));

  // Check reader dock
  const readerDock = await page.locator(".aleph-reader-dock").count();
  console.log("[local] reader-dock in DOM:", readerDock);

  // Check account dock
  const accountDock = await page.locator(".aleph-account-dock").count();
  console.log("[local] account-dock in DOM:", accountDock);

  console.log("[local] errors:", errs.length ? errs.slice(0,3) : "none");
  await page.close();
  await browser.close();
  console.log("done");
})();
