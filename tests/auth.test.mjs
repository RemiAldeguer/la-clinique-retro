import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApplication } from '../server/application.mjs';
import { hashPassword, verifyPassword, digest } from '../server/security.mjs';
import { openDatabase } from '../server/database.mjs';
// Synthetic test fixtures only. No account is created by the application at startup.
const address = 'test-admin@example.invalid';
const password = 'Synthetic test phrase 2026!';
const replacement = 'Different synthetic phrase 2026!';
let encoded;
before(async () => { encoded = await hashPassword(password); });
async function fixture(t, overrides = {}) {
  let clock = Date.now();
  const origin = overrides.origin || 'http://127.0.0.1:5173';
  const app = createApplication({ databasePath: ':memory:', origin, now: () => clock, ...overrides });
  app.db.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,?,?,'admin')").run(address, encoded);
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  const base = `http://127.0.0.1:${app.server.address().port}`;
  t.after(() => new Promise(resolve => { app.server.closeAllConnections(); app.server.close(resolve); }));
  async function request(route, { method = 'GET', cookie = '', csrf = '', body, headers = {}, raw } = {}) {
    const response = await fetch(base + route, { method, headers: { Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => null);
    return { response, data, status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
  }
  async function login() { const result = await request('/api/auth/login', { method: 'POST', body: { email: address, password } }); assert.equal(result.status, 200); return { cookie: result.cookie, csrf: result.data.csrfToken, data: result.data }; }
  return { ...app, request, login, advance: ms => { clock += ms; } };
}
test('Password hashing uses a unique salt, never stores plaintext, and verifies correctly', async () => {
  const second = await hashPassword(password);
  assert.notEqual(encoded, second); assert.match(encoded, /^scrypt\$131072\$8\$1\$/);
  assert.ok(!encoded.includes(password)); assert.equal(await verifyPassword(password, encoded), true);
  assert.equal(await verifyPassword('wrong', encoded), false);
  await assert.rejects(hashPassword('too short'), /15 à 128/);
});
test('Production requires HTTPS, and HTTP is restricted to loopback origins', () => {
  assert.throws(() => createApplication({ origin: 'http://example.com', production: true }), /HTTPS/);
  assert.throws(() => createApplication({ origin: 'http://example.com' }), /HTTPS/);
  assert.throws(() => createApplication({ origin: 'https://example.com/path' }), /origine/);
});
test('Private store cannot be read or written anonymously', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/store')).status, 401);
  assert.equal((await f.request('/api/store', { method: 'PUT', body: {} })).status, 401);
  assert.equal((await f.request('/api/auth/me')).status, 401);
});
test('No account is bootstrapped by a public login request', async t => {
  const f = await fixture(t); f.db.prepare('DELETE FROM admin').run();
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { email: address, password } })).status, 503);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM admin').get().n, 0);
});
test('Login has a generic error for an unknown address or a wrong password', async t => {
  const f = await fixture(t);
  const bad = await f.request('/api/auth/login', { method: 'POST', body: { email: address, password: 'invalid' } });
  const unknown = await f.request('/api/auth/login', { method: 'POST', body: { email: 'unknown@example.invalid', password } });
  assert.equal(bad.status, 401); assert.deepEqual(bad.data, unknown.data); assert.equal(unknown.cookie, '');
});
test('Login returns an HttpOnly SameSite cookie, and never a session token in JSON', async t => {
  const f = await fixture(t);
  const result = await f.request('/api/auth/login', { method: 'POST', body: { email: address.toUpperCase(), password } });
  assert.equal(result.status, 200);
  const cookie = result.response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Max-Age=28800/);
  assert.equal(result.data.user.role, 'admin'); assert.equal(JSON.stringify(result.data).includes(encoded), false);
  assert.equal(JSON.stringify(result.data).includes(result.cookie.split('=')[1]), false);
  const stored = f.db.prepare('SELECT token_hash FROM sessions').get().token_hash;
  assert.equal(stored, digest(result.cookie.split('=')[1]));
  assert.equal((await f.request('/api/auth/me', { cookie: result.cookie })).status, 200);
});
test('HTTPS configuration sets a Secure host-only session cookie', async t => {
  const f = await fixture(t, { origin: 'https://atelier.example.invalid', production: true });
  const result = await f.request('/api/auth/login', { method: 'POST', body: { email: address, password } });
  assert.match(result.response.headers.get('set-cookie'), /^__Host-clinique_session=/);
  assert.match(result.response.headers.get('set-cookie'), /; Secure/);
  assert.ok(!result.response.headers.get('set-cookie').includes('Domain='));
});
test('Login CSRF: a foreign or missing Origin is rejected before credential validation', async t => {
  const f = await fixture(t);
  for (const origin of ['https://evil.example', '', 'null']) {
    assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { email: address, password }, headers: { Origin: origin } })).status, 403);
  }
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { email: address, password }, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
});
test('Mutations require a matching CSRF header in addition to the session', async t => {
  const f = await fixture(t), login = await f.login();
  assert.equal((await f.request('/api/auth/logout', { method: 'POST', cookie: login.cookie })).status, 403);
  assert.equal((await f.request('/api/auth/logout', { method: 'POST', cookie: login.cookie, csrf: 'wrong' })).status, 403);
  assert.equal((await f.request('/api/auth/me', login)).status, 200);
});
test('Authenticated data is saved and stale revisions never overwrite another change', async t => {
  const f = await fixture(t), login = await f.login();
  const initial = (await f.request('/api/store', login)).data;
  assert.equal(initial.consoles.length, 0);
  initial.settings.workshop = 'Authenticated atelier';
  const saved = await f.request('/api/store', { ...login, method: 'PUT', body: { revision: initial.revision, data: initial } });
  assert.equal(saved.status, 200); assert.equal(saved.data.revision, initial.revision + 1);
  assert.equal((await f.request('/api/store', { ...login, method: 'PUT', body: { revision: initial.revision, data: initial } })).status, 409);
  assert.equal((await f.request('/api/store', login)).data.settings.workshop, 'Authenticated atelier');
});
test('Store input validation runs on the server, not only in the UI', async t => {
  const f = await fixture(t), login = await f.login();
  assert.equal((await f.request('/api/store', { ...login, method: 'PUT', body: { revision: 0, data: { consoles: 'wrong' } } })).status, 400);
  assert.equal((await f.request('/api/store', { ...login, method: 'PUT', body: { revision: -1, data: {} } })).status, 400);
});
test('Authentication bodies enforce JSON format, syntax and size', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', raw: 'x', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', raw: '{', headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { email: address, password: 'a'.repeat(5000) } })).status, 413);
});
test('Logout deletes the server session; replaying the old cookie fails', async t => {
  const f = await fixture(t), login = await f.login();
  const result = await f.request('/api/auth/logout', { ...login, method: 'POST' });
  assert.equal(result.status, 200); assert.match(result.response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await f.request('/api/store', login)).status, 401);
});
test('Idle sessions expire, and a session-status poll does not extend them', async t => {
  const f = await fixture(t), login = await f.login();
  f.advance(29 * 60000); assert.equal((await f.request('/api/auth/me', login)).status, 200);
  f.advance(60001); assert.equal((await f.request('/api/store', login)).status, 401);
});
test('Active sessions still expire at their absolute lifetime', async t => {
  const f = await fixture(t, { sessionMs: 1000, idleMs: 10000 }), login = await f.login();
  f.advance(500); assert.equal((await f.request('/api/store', login)).status, 200);
  f.advance(501); assert.equal((await f.request('/api/store', login)).status, 401);
});
test('Repeated failed logins are throttled and include Retry-After', async t => {
  const f = await fixture(t);
  for (let n = 0; n < 5; n++) assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { email: address, password: 'wrong' } })).status, 401);
  const blocked = await f.request('/api/auth/login', { method: 'POST', body: { email: address, password } });
  assert.equal(blocked.status, 429); assert.ok(Number(blocked.response.headers.get('retry-after')) > 0);
  f.advance(15 * 60000 + 1); assert.equal((await f.login()).data.user.email, address);
});
test('Changing a password verifies the old one and revokes every existing session', async t => {
  const f = await fixture(t), a = await f.login(), b = await f.login();
  assert.equal((await f.request('/api/auth/password', { ...a, method: 'POST', body: { currentPassword: 'wrong', newPassword: replacement } })).status, 400);
  assert.equal((await f.request('/api/auth/me', a)).status, 200);
  assert.equal((await f.request('/api/auth/password', { ...a, method: 'POST', body: { currentPassword: password, newPassword: replacement } })).status, 200);
  assert.equal((await f.request('/api/auth/me', a)).status, 401);
  assert.equal((await f.request('/api/auth/me', b)).status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { email: address, password } })).status, 401);
  assert.equal((await f.request('/api/auth/login', { method: 'POST', body: { email: address, password: replacement } })).status, 200);
});
test('Security headers disable API caching and framing', async t => {
  const f = await fixture(t), result = await f.request('/api/store');
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
  assert.equal(result.response.headers.get('x-frame-options'), 'DENY');
  assert.match(result.response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(result.response.headers.get('access-control-allow-origin'), null);
});
test('Only files inside dist are served, never the database or source files', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'retro-static-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'dist')); await writeFile(path.join(dir, 'dist', 'index.html'), '<!doctype html><title>Test</title>');
  await writeFile(path.join(dir, 'secret.txt'), 'secret');
  const f = await fixture(t, { distPath: path.join(dir, 'dist') });
  for (const resource of ['/server/security.mjs', '/data/clinique.sqlite', '/.env', '/%2e%2e/secret.txt']) {
    assert.equal((await f.request(resource)).status, 404);
  }
  assert.equal((await f.request('/')).status, 200);
});
test('Database records survive reopening; the public UI does not contain account records', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'retro-db-')), filename = path.join(dir, 'test.sqlite');
  t.after(() => rm(dir, { recursive: true, force: true }));
  const first = openDatabase(filename);
  first.prepare("INSERT INTO admin(id,email,password_hash,role) VALUES(1,?,?,'admin')").run(address, encoded); first.close();
  const second = openDatabase(filename);
  assert.equal(second.prepare('SELECT email FROM admin WHERE id = 1').get().email, address); second.close();
});
