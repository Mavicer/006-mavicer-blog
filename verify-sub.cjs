const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  let page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto("http://127.0.0.1:5174/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Check subtitle after 3s (should have typed "Create beyond the lines" by now)
  const subText = await page.locator("#subtitle").textContent();
  console.log("subtitle after 3s:", JSON.stringify(subText));
  
  // Check if element exists and what type
  const subTag = await page.locator("#subtitle").evaluate(el => el.tagName + " | textContent=" + JSON.stringify(el.textContent) + " | innerHTML=" + JSON.stringify(el.innerHTML));
  console.log("subtitle element:", subTag);
  
  // Wait more and check again
  await page.waitForTimeout(3000);
  const subText2 = await page.locator("#subtitle").textContent();
  console.log("subtitle after 6s:", JSON.stringify(subText2));
  
  console.log("errors:", errs.length ? errs : "none");
  await browser.close();
})();
