/** Run against `npm run dev:api` with an isolated local D1 database. */
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.VISITS_TEST_URL || 'http://127.0.0.1:8788';
assert.ok(new URL(base).hostname === '127.0.0.1' || new URL(base).hostname === 'localhost', 'Use a local database for count-changing checks');
const output = process.env.VISITS_SCREENSHOT_DIR;
if (output) mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
  await context.addInitScript(() => {
    localStorage.setItem('MAVICER_THEME_MODE', 'light');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.testVisibility || 'visible' });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const stats = async () => (await context.request.get(base + '/api/visits')).json();
  const baseline = (await stats()).pv;
  const posted = kind => page.waitForResponse(response => response.url().endsWith('/api/visits') && response.request().method() === 'POST' && response.request().postDataJSON()?.kind === kind);
  const started = posted('start');
  await page.goto(base + '/about', { waitUntil: 'domcontentloaded' });
  await started;
  await page.waitForTimeout(9000);
  assert.deepEqual(await stats(), { pv: baseline, online: 0 }, 'Nine seconds does not qualify');
  const qualified = await posted('pageview');
  assert.equal(qualified.status(), 200);
  assert.deepEqual(await stats(), { pv: baseline + 1, online: 1 });
  await page.locator('.footer-visits').scrollIntoViewIfNeeded();
  assert.doesNotMatch(await page.locator('footer').innerText(), /React 驱动|Redefine|自.*起统计/);
  const block = await page.locator('.footer-visits').boundingBox();
  const footer = await page.locator('footer').boundingBox();
  assert.ok(block.x < footer.x + 100 && block.width < 240, 'Desktop counter occupies the left footer block');
  if (output) await page.locator('footer').screenshot({ path: output + '/footer-desktop.png' });

  // Real SPA navigation plus controlled Page Visibility events: hidden time
  // must not contribute to qualification; the API and database remain real.
  const nextStart = posted('start');
  await page.getByRole('link', { name: '归档', exact: true }).first().click();
  await nextStart;
  await page.waitForTimeout(4000);
  await page.evaluate(() => { window.testVisibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(8000);
  assert.equal((await stats()).pv, baseline + 1, 'Background time does not qualify the second page');
  const secondView = posted('pageview');
  await page.evaluate(() => { window.testVisibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  await secondView;
  assert.deepEqual(await stats(), { pv: baseline + 2, online: 1 }, 'One browser remains one online presence');

  const tab = await context.newPage();
  const tabView = tab.waitForResponse(r => r.url().endsWith('/api/visits') && r.request().method() === 'POST' && r.request().postDataJSON()?.kind === 'pageview');
  await tab.goto(base + '/archives', { waitUntil: 'domcontentloaded' });
  await tabView;
  assert.deepEqual(await stats(), { pv: baseline + 2, online: 1 }, 'Second tab and quick same-page refresh are merged');
  await tab.close();

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('.footer-visits').scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
    if (width < 1024) assert.equal(await page.locator('.footer-visits').evaluate(el => getComputedStyle(el).position), 'static');
    if (output && width === 390) await page.locator('footer').screenshot({ path: output + '/footer-mobile.png' });
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForFunction(() => getComputedStyle(document.body).backgroundColor === 'rgb(32, 33, 36)');
  if (output) await page.locator('footer').screenshot({ path: output + '/footer-dark.png' });

  // Failure retains the real last count, hides stale online data and offers retry.
  await page.route('**/api/visits', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"unavailable"}' }));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.getByRole('button', { name: '重试', exact: true }).waitFor();
  assert.match(await page.locator('.footer-visits').innerText(), /当前在线 — 人/);
  assert.match(await page.locator('.footer-visits').innerText(), new RegExp(String(baseline + 2)));
  await page.unroute('**/api/visits');
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.footer-visits button'));
  assert.equal((await stats()).pv, baseline + 2, 'Retry does not add another page view');
  assert.deepEqual(errors, []);
  console.log('Visitor UI passed: real API/SQLite, ten-second threshold, hidden-time pause, SPA views, shared-tab presence, quick-refresh merge, desktop-left/mobile layout, dark mode, outage/retry and no browser errors.');
} finally { await browser.close(); }
