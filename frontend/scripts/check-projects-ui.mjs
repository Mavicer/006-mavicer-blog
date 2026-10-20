/** Run after npm run build. Uses installed Chrome; override PLAYWRIGHT_CHANNEL if needed. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:5191';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '5191', '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) throw new Error('Preview server failed to start');
    try { ready = (await fetch(base)).ok; } catch { /* Wait for preview startup. */ }
    if (ready) break;
    await delay(250);
  }
  assert.ok(ready, 'Preview server starts');
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  await context.addInitScript(() => localStorage.setItem('MAVICER_THEME_MODE', 'light'));
  const page = await context.newPage();
  let status = 503;
  const repo = { name: '007-visuallab', html_url: 'https://github.com/Mavicer/007-visuallab', description: null, language: 'Python', stars: 7, forks: 0, topics: [], updated_at: '2026-10-19' };
  await page.route('**/api/projects', route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 200 ? [repo, { ...repo, name: '008-example', html_url: 'https://github.com/Mavicer/008-example' }] : { detail: 'unavailable' }) }));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  let gifRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/visuallab-demo.gif')) gifRequests++; });
  await page.goto(base + '/projects');
  await page.getByText('GitHub 统计暂时无法更新，作品展示与访问不受影响。', { exact: true }).waitFor();
  assert.equal(await page.locator('.project-work').count(), 4, 'Outage keeps all four works visible');
  await page.locator('.project-media img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  const gif = readFileSync(new URL('../public/images/projects/visuallab-demo.gif', import.meta.url));
  const loop = gif.indexOf(Buffer.from('NETSCAPE2.0'));
  assert.ok(loop >= 0 && gif.readUInt16LE(loop + 13) === 0, 'Demo asset repeats indefinitely');
  await page.waitForFunction(() => document.querySelector('.project-media img')?.getAttribute('src')?.endsWith('visuallab-demo.gif'));
  assert.ok(gifRequests >= 1, 'Visible cover starts the looping demo');
  await page.getByRole('button', { name: '暂停 VisualLab 循环演示', exact: true }).click();
  assert.ok((await page.locator('.project-media img').first().getAttribute('src')).endsWith('visuallab-poster.jpg'));
  await page.getByRole('button', { name: '播放 VisualLab 循环演示', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.project-media img')?.getAttribute('src')?.endsWith('visuallab-demo.gif'));
  const nexus = page.locator('.project-work').filter({ has: page.getByRole('heading', { name: 'Nexus', exact: true }) });
  assert.ok((await nexus.locator('img').getAttribute('src')).endsWith('nexus-home.png'));
  const trigger = page.getByRole('button', { name: '查看 VisualLab 项目', exact: true });
  await trigger.click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.getByRole('button', { name: '关闭项目详情' }).evaluate(el => el === document.activeElement), true);
  assert.ok((await page.locator('dialog img').getAttribute('src')).endsWith('visuallab-poster.jpg'), 'Details start with a static poster');
  assert.ok((await page.locator('.project-media img').first().getAttribute('src')).endsWith('visuallab-poster.jpg'), 'Background animation pauses while details are open');
  assert.match(await page.getByRole('dialog').innerText(), /不代表模型准确率/);
  await page.getByRole('button', { name: '播放拖尾演示' }).click();
  await page.locator('dialog img').evaluate(image => image.decode());
  assert.ok((await page.locator('dialog img').getAttribute('src')).endsWith('visuallab-demo.gif'), 'Explicit play runs the actual demo');
  await page.getByRole('button', { name: '停止演示' }).click();
  assert.ok((await page.locator('dialog img').getAttribute('src')).endsWith('visuallab-poster.jpg'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Escape restores trigger focus');
  await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
  for (const name of ["Mavicer's Blog", 'Nexus', 'Wanderful']) {
    await page.getByRole('button', { name: `查看 ${name} 项目`, exact: true }).click();
    assert.equal(await page.getByRole('dialog').getByRole('heading', { name, exact: true }).count(), 1);
    if (name === 'Nexus') assert.match(await page.getByRole('dialog').innerText(), /当前未提供公开在线体验/);
    await page.getByRole('button', { name: '关闭项目详情' }).click();
  }
  status = 200;
  await page.getByRole('button', { name: '重新获取统计' }).click();
  await page.getByRole('heading', { name: '更多公开仓库' }).waitFor();
  assert.equal(await page.getByRole('link', { name: '008-example' }).count(), 1, 'New repos remain discoverable');
  status = 503;
  await page.reload();
  await page.getByRole('button', { name: '重新获取统计' }).waitFor();
  assert.match(await page.locator('.project-live-stat').first().innerText(), /7/, 'Success cache survives subsequent outage');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Gallery fits ${width}px`);
    await page.getByRole('button', { name: '查看 Nexus 项目', exact: true }).click();
    assert.ok(await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth), `Dialog fits ${width}px`);
    await page.keyboard.press('Escape');
  }
  const quiet = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1080 } });
  const quietPage = await quiet.newPage();
  await quietPage.goto(base + '/projects');
  await quietPage.getByRole('button', { name: '播放 VisualLab 循环演示', exact: true }).waitFor();
  assert.ok((await quietPage.locator('.project-media img').first().getAttribute('src')).endsWith('visuallab-poster.jpg'), 'Reduced motion defaults to a still');
  await quietPage.getByRole('button', { name: '播放 VisualLab 循环演示', exact: true }).click();
  await quietPage.waitForFunction(() => document.querySelector('.project-media img')?.getAttribute('src')?.endsWith('visuallab-demo.gif'));
  await quiet.close();
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.locator('.toggle-tools-list').click();
  await page.locator('.tool-dark-light-toggle').click();
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  assert.equal(await page.locator('.project-work').evaluateAll(elements => elements.every(el => getComputedStyle(el).backgroundColor === 'rgb(32, 33, 36)')), true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await page.locator('.project-shot').first().evaluate(el => parseFloat(getComputedStyle(el).transitionDuration) < 0.001));
  await page.getByRole('link', { name: '归档', exact: true }).first().click();
  await page.waitForURL('**/archives');
  assert.equal(await page.locator('.projects-page').count(), 0);
  await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
  console.log('Projects UI passed: four works during outage, media decode, looping/pause/reduced-motion override, real Nexus screenshot, dialog focus/Escape, retry/cache, new repositories, responsive layouts, dark mode, reduced motion and navigation.');
} finally {
  await browser?.close();
  server.kill();
}
