import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from './helpers/api.mjs';

function setup(t, options = {}) {
  const f = fixture({ origin: 'https://mavicer.cc', ...options });
  let now = 1_800_000_000_000;
  t.mock.method(Date, 'now', () => now);
  const advance = (seconds) => { now += seconds * 1000; };
  const event = (path = '/') => ({ path, event_id: crypto.randomUUID() });
  const send = (kind, data, cookie = '', headers = {}) => f.request('/visits', { method: 'POST', cookie, headers, body: { kind, ...data } });
  t.after(() => f.sqlite.close());
  return { ...f, advance, event, send };
}

test('counter starts at 650, ignores legacy inflated totals, and GET never counts a visit', async (t) => {
  const f = setup(t);
  f.sqlite.exec('CREATE TABLE visits_cache (pv INTEGER); INSERT INTO visits_cache VALUES (50000000)');
  for (let i = 0; i < 3; i++) {
    const result = await f.request('/visits');
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, { pv: 650, online: 0 });
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal(f.sqlite.prepare('SELECT pv FROM visits_cache').get().pv, 50000000);
});

test('qualification needs a server-issued start and ten seconds; a start alone is not online', async (t) => {
  const f = setup(t), e = f.event();
  assert.equal((await f.send('pageview', e)).status, 409);
  const start = await f.send('start', e);
  assert.deepEqual(start.data, { pv: 650, online: 0 });
  assert.match(start.headers.get('Set-Cookie'), /HttpOnly; SameSite=Lax; Secure/);
  f.advance(9);
  assert.equal((await f.send('pageview', e, start.cookie)).status, 409);
  f.advance(1);
  assert.deepEqual((await f.send('pageview', e, start.cookie)).data, { pv: 651, online: 1 });
});

test('retries, rapid refreshes, tabs and heartbeats do not inflate counts; later pages do', async (t) => {
  const f = setup(t), e = f.event();
  const { cookie } = await f.send('start', e);
  f.advance(10);
  assert.equal((await f.send('pageview', e, cookie)).data.pv, 651);
  const next = f.event('/about');
  await f.send('start', next, cookie); f.advance(10);
  assert.deepEqual((await f.send('pageview', next, cookie)).data, { pv: 652, online: 1 });
  assert.equal((await f.send('pageview', e, cookie)).data.pv, 652, 'old event replay is idempotent after another page');
  const refresh = f.event();
  await f.send('start', refresh, cookie); f.advance(10);
  assert.equal((await f.send('pageview', refresh, cookie)).data.pv, 652, 'same page inside thirty seconds merges');
  assert.deepEqual((await f.send('heartbeat', { path: '/' }, cookie)).data, { pv: 652, online: 1 });
  f.advance(11);
  assert.equal((await f.send('pageview', refresh, cookie)).data.pv, 652, 'a merged event stays idempotent on later retries');
  const later = f.event();
  await f.send('start', later, cookie); f.advance(10);
  assert.equal((await f.send('pageview', later, cookie)).data.pv, 653, 'a new later revisit counts');
  f.sqlite.exec("DELETE FROM app_migration WHERE version = 'visits-v1'");
  assert.equal((await f.request('/visits')).data.pv, 653, 'repeated migration cannot reset accumulated views');
});

test('independent browsers count separately and online expires at ninety seconds without losing history', async (t) => {
  const f = setup(t), a = f.event(), b = f.event();
  const ca = (await f.send('start', a)).cookie;
  const cb = (await f.send('start', b)).cookie;
  f.advance(10);
  await f.send('pageview', a, ca);
  assert.deepEqual((await f.send('pageview', b, cb)).data, { pv: 652, online: 2 });
  f.advance(89);
  assert.equal((await f.request('/visits')).data.online, 2);
  await f.send('heartbeat', { path: '/' }, ca);
  f.advance(1);
  assert.deepEqual((await f.request('/visits')).data, { pv: 652, online: 1 });
  f.advance(90);
  assert.deepEqual((await f.request('/visits')).data, { pv: 652, online: 0 });
});

test('bots, previews, admin pages, foreign origins and malformed events never become visits', async (t) => {
  const f = setup(t);
  for (const ua of ['Googlebot/2.1', 'Mozilla/5.0 HeadlessChrome/140', 'curl/8.0', 'python-requests/2']) {
    assert.deepEqual((await f.send('start', f.event(), '', { 'User-Agent': ua })).data, { pv: 650, online: 0 });
  }
  assert.deepEqual((await f.send('start', f.event('/admin'))).data, { pv: 650, online: 0 });
  assert.equal((await f.send('start', f.event(), '', { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await f.send('start', f.event(), '', { Origin: '' })).status, 403);
  assert.equal((await f.send('start', { ...f.event(), path: '//evil.test' })).status, 422);
  assert.equal((await f.send('start', { ...f.event(), path: '/?private=secret' })).status, 422);
  assert.equal((await f.send('pageview', { ...f.event(), event_id: 'forged' })).status, 422);
  assert.equal((await f.send('heartbeat', { path: '/' })).status, 409);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM blog_visit_presence').get().n, 0);
  const preview = fixture({ origin: 'https://abc123.blog-cmc.pages.dev' });
  try {
    const r = await preview.request('/visits', { method: 'POST', body: { kind: 'start', ...f.event() } });
    assert.deepEqual(r.data, { pv: 650, online: 0 });
    assert.equal(preview.sqlite.prepare('SELECT COUNT(*) AS n FROM blog_visit_pending').get().n, 0);
  } finally { preview.sqlite.close(); }
});

test('overdue qualification restarts and rate limits survive repeated requests', async (t) => {
  const f = setup(t), e = f.event();
  const { cookie } = await f.send('start', e);
  f.advance(901);
  assert.equal((await f.send('pageview', e, cookie)).status, 409);
  f.sqlite.exec("UPDATE account_rate_limit SET hits = 999, expires_at = 2000000000 WHERE key LIKE 'visits-ip:%'");
  assert.equal((await f.send('start', f.event(), cookie)).status, 429);
  assert.deepEqual((await f.request('/visits')).data, { pv: 650, online: 0 });
});

test('a failed visitor migration returns 503 and can be retried without creating a fake zero', async (t) => {
  const f = setup(t);
  const original = f.DB.prepare;
  let fail = true;
  f.DB.prepare = function (sql) {
    if (fail && sql.includes('CREATE TABLE IF NOT EXISTS blog_visit_total')) { fail = false; throw new Error('simulated visitor migration failure'); }
    return original.call(this, sql);
  };
  assert.equal((await f.request('/visits')).status, 503);
  assert.deepEqual((await f.request('/visits')).data, { pv: 650, online: 0 });
});
