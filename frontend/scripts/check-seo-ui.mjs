/** Validate built HTML, the actual Pages runtime, and React hydration. Local D1 only. */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { get as httpGet } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { JSDOM } from 'jsdom';
const base = process.env.SEO_TEST_URL || 'http://127.0.0.1:8791';
const posts = JSON.parse(readFileSync('generated/static-post-details.json', 'utf8'));
const paths = JSON.parse(readFileSync('generated/public-paths.json', 'utf8'));
const output = process.env.SEO_SCREENSHOT_DIR;
if (output) mkdirSync(output, { recursive: true });
const errors = [];
let logs = '';
const server = process.env.SEO_TEST_URL ? null : spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'pages', 'dev', 'dist', '--port', '8791', '--local'], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
server?.stdout.on('data', chunk => { logs = (logs + chunk).slice(-6000); });
server?.stderr.on('data', chunk => { logs = (logs + chunk).slice(-6000); });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server && server.exitCode !== null) throw new Error(logs);
    try { ready = (!server || logs.includes('Ready on')) && (await fetch(base)).ok; } catch {}
    if (ready) break;
    await delay(250);
  }
  assert(ready, logs);
  const get = (path, host = 'mavicer.cc') => new Promise((resolve, reject) => {
    httpGet(base + path, { headers: { Host: host } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: response.headers })));
    }).on('error', reject);
  });
  for (const path of paths) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert(!response.headers.get('X-Robots-Tag')?.includes('noindex'), path);
    const doc = new JSDOM(await response.text()).window.document;
    assert.equal(doc.querySelectorAll('h1').length, 1, path);
    assert.equal(doc.querySelector('link[rel=canonical]').href, 'https://mavicer.cc' + path);
    assert(doc.querySelector('meta[name=description]').content.length > 0);
    assert.equal(doc.querySelector('meta[property="og:url"]').content, 'https://mavicer.cc' + path);
    assert(doc.querySelector('meta[name=robots]').content.startsWith('index'));
    assert.equal(doc.querySelectorAll('title').length, 1);
    for (const img of doc.querySelectorAll('img')) assert(img.hasAttribute('alt'), path + ': missing alt');
  }
  const sitemap = await get('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert(sitemap.headers.get('content-type').includes('xml'));
  const xml = new JSDOM(await sitemap.text(), { contentType: 'application/xml' }).window.document;
  assert.equal(xml.querySelectorAll('url').length, paths.length);
  assert(!(await get('/robots.txt').then(r => r.text())).includes('<html'));
  assert((await get('/robots.txt').then(r => r.text())).includes('https://mavicer.cc/sitemap.xml'));
  for (const path of ['/random-404-check', '/posts/nonexistent-seo-check', '/tags/missing', '/categories/missing']) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    assert(response.headers.get('X-Robots-Tag').includes('noindex'), path);
  }
  for (const path of ['/login', '/register', '/account', '/admin', '/admin/articles/new']) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert(response.headers.get('X-Robots-Tag').includes('noindex'));
    assert((await response.text()).includes('noindex'));
  }
  const preview = await get('/posts/welcome', 'abc.blog-cmc.pages.dev');
  assert(preview.headers.get('X-Robots-Tag').includes('noindex'));
  assert((await preview.text()).includes('content="noindex, follow"'));
  assert((await get('/robots.txt', 'abc.blog-cmc.pages.dev').then(r => r.text())).includes('Disallow: /'));
  assert.equal((await get('/posts/welcome/')).status, 308);
  assert.equal((await get('/posts/welcome.html')).status, 308);
  assert.equal((await get('/api/health')).status, 200);
  assert.equal((await get('/api/auth/me')).status, 401);
  console.log(`HTTP and source HTML: ${paths.length} pages, sitemap, private noindex, preview, redirects and 404 passed`);

  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await nojs.newPage();
  for (const post of posts) {
    await staticPage.goto(base + '/posts/' + post.slug, { waitUntil: 'domcontentloaded' });
    await staticPage.getByRole('heading', { name: post.title, exact: true }).waitFor();
    assert((await staticPage.locator('[aria-label="文章正文"]').innerText()).length > 100, post.slug);
  }
  await nojs.close();
  for (const mode of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: mode === 'dark' ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
    await context.addInitScript(mode => {
      localStorage.setItem('MAVICER_THEME_MODE', mode);
      localStorage.setItem('MAVICER_NEXUS_ANNOUNCEMENT_V1', 'seen');
      localStorage.setItem('MAVICER_APPEARANCE_V1', JSON.stringify({ background: 'alpine', brightness: 95, cardOpacity: 60, fontSize: 16 }));
    }, mode);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error' && /hydration|hydrate|Minified React error|did not match/i.test(msg.text())) errors.push(msg.text()); });
    for (const post of mode === 'light' ? posts : posts.filter(p => p.slug === 'welcome')) {
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await page.route('**/assets/main-*.js', async route => { await gate; await route.continue(); });
      await page.goto(base + '/posts/' + post.slug, { waitUntil: 'commit' });
      await page.locator('article').waitFor();
      await page.evaluate(() => { window.__beforeHydrationArticle = document.querySelector('article'); });
      release();
      await page.waitForLoadState('domcontentloaded');
      await page.getByText('在线互动已连接', { exact: true }).waitFor();
      assert(await page.evaluate(() => window.__beforeHydrationArticle === document.querySelector('article')), `${mode}/${post.slug}: React replaced server HTML; ${errors.join('; ')}`);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), `${post.title} | Mavicer's Blog`);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('dark')), mode === 'dark');
      assert((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--personal-wallpaper'))).includes(mode === 'dark' ? 'alpine-evening' : 'alpine-day'));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow');
      if (output && post.slug === 'welcome') await page.screenshot({ path: `${output}/article-${mode}.png`, fullPage: true });
      await page.unroute('**/assets/main-*.js');
    }
    await page.getByRole('link', { name: "Mavicer's Blog", exact: true }).first().click();
    await page.waitForURL(base + '/');
    assert.equal(await page.title(), "Mavicer's Blog");
    if (mode === 'dark') {
      await page.locator('.navbar-bar').click();
      await page.locator('.navbar-drawer a[href="/archives"]').click();
    } else await page.locator('a[href="/archives"]').first().click();
    await page.waitForURL(base + '/archives');
    assert.equal(await page.title(), "文章归档 | Mavicer's Blog");
    await page.goto(base + '/projects', { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Projects', exact: true }).waitFor();
    assert.equal(await page.locator('h1').count(), 1);
    if (output) await page.screenshot({ path: `${output}/projects-${mode}.png`, fullPage: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('No-JavaScript body, preserved hydration DOM, themes, mobile overflow, SPA metadata and Projects passed');
} catch (error) {
  if (server?.exitCode !== null) console.error(logs);
  throw error;
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    process.kill(-server.pid, 'SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
  }
}
