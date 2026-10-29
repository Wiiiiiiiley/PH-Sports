import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { onRequest } from '../functions/api/[[path]].js';
import { hashPassword } from '../server/auth.js';

// Real SQLite executes the production SQL. The small adapter only supplies D1's
// prepare/bind/first/all/run/batch interface, including transaction rollback.
const migrations = await Promise.all(['0000_baseline.sql', '0001_auth.sql', '0002_app_fields.sql']
  .map(name => readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8')));
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const migration of migrations) sqlite.exec(migration);
  class Statement {
    constructor(sql, values = []) { this.sql = sql; this.values = values; }
    bind(...values) { return new Statement(this.sql, values); }
    async first() { return sqlite.prepare(this.sql).get(...this.values) || null; }
    async all() { return { results: sqlite.prepare(this.sql).all(...this.values) }; }
    execute() { const result = sqlite.prepare(this.sql).run(...this.values); return { success: true, meta: { changes: Number(result.changes) } }; }
    async run() { return this.execute(); }
  }
  return {
    sqlite,
    env: {
      DB: {
        prepare: sql => new Statement(sql),
        async batch(statements) {
          sqlite.exec('BEGIN');
          try {
            const results = statements.map(statement => statement.execute());
            sqlite.exec('COMMIT');
            return results;
          } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
        },
      },
    },
  };
}

let ipSequence = 0;
async function request(fixture, path, { method = 'GET', body, cookie, headers = {}, origin = 'https://sports.example', raw } = {}) {
  const response = await onRequest({
    env: fixture.env,
    request: new Request(`${origin}/api${path}`, {
      method,
      headers: {
        'CF-Connecting-IP': `198.51.100.${++ipSequence}`,
        ...(method !== 'GET' ? { 'X-PH-Sports-Request': '1', Origin: origin, 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  });
  const data = await response.json();
  return { response, data, status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const PASSWORD = 'correct horse battery staple';
const credentials = email => ({ email, password: PASSWORD });
const register = (fixture, email = 'student@example.test', options = {}) => request(fixture, '/auth/register', { ...options, method: 'POST', body: { ...credentials(email), full_name: 'Test Student', ...options.body } });
const login = (fixture, email = 'student@example.test', options = {}) => request(fixture, '/auth/login', { method: 'POST', body: credentials(email), ...options });
const tokenHash = cookie => createHash('sha256').update(cookie.slice(cookie.indexOf('=') + 1)).digest('hex');

let passed = 0;
async function check(name, callback) {
  const fixture = database();
  try { await callback(fixture); passed++; console.log(`✓ ${name}`); }
  finally { fixture.sqlite.close(); }
}

await check('unauthenticated API requests and fabricated URL/Bearer tokens are rejected', async fixture => {
  for (const path of ['/auth/me', '/users', '/training-logs', '/venue-bookings', '/teams', '/announcements']) {
    assert.equal((await request(fixture, path)).status, 401);
    assert.equal((await request(fixture, `${path}?access_token=admin@phsports.edu`, { headers: { Authorization: 'Bearer admin@phsports.edu' } })).status, 401);
  }
  assert.equal(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
});

await check('registration stores only a salted password hash and hashed opaque session', async fixture => {
  const result = await register(fixture, ' STUDENT@Example.Test ');
  assert.equal(result.status, 201);
  assert.equal(result.data.email, 'student@example.test');
  assert.equal(result.data.role, 'student');
  assert.equal(result.data.profile_complete, false);
  assert.equal(result.data.password_hash, undefined);
  assert.equal(result.data.created_date, result.data.created_at);
  const cookie = result.response.headers.get('set-cookie');
  for (const attribute of ['__Host-ph_sports_session=', 'HttpOnly', 'SameSite=Lax', 'Secure', 'Path=/', 'Max-Age=604800']) assert.ok(cookie.includes(attribute));
  assert.match(result.cookie, /^__Host-ph_sports_session=[A-Za-z0-9_-]{43}$/);
  const record = fixture.sqlite.prepare('SELECT * FROM auth_credentials').get();
  assert.match(record.password_hash, /^scrypt\$16384\$8\$5\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/);
  assert.ok(!record.password_hash.includes(PASSWORD));
  assert.notEqual(record.password_hash, await hashPassword(PASSWORD));
  const session = fixture.sqlite.prepare('SELECT * FROM auth_sessions').get();
  assert.equal(session.token_hash, tokenHash(result.cookie));
  assert.ok(!JSON.stringify(session).includes(result.cookie.split('=')[1]));
  assert.equal((await request(fixture, '/auth/me', { cookie: result.cookie })).data.id, result.data.id);
});

await check('registration rejects absent and blank names without creating accounts', async fixture => {
  for (const full_name of [undefined, '', '   ', '\t\n', '\u3000']) {
    const result = await register(fixture, 'blank-name@example.test', { body: { full_name } });
    assert.equal(result.status, 400);
  }
  assert.equal(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0);
});

await check('login normalizes email and returns identical errors for bad and unknown credentials', async fixture => {
  await register(fixture);
  const wrong = await login(fixture, undefined, { body: { email: 'student@example.test', password: 'wrong password that is long' } });
  const missing = await login(fixture, 'missing@example.test');
  assert.equal(wrong.status, 401);
  assert.deepEqual(missing.data, wrong.data);
  const good = await login(fixture, 'STUDENT@EXAMPLE.TEST');
  assert.equal(good.status, 200);
  assert.equal(good.data.password_hash, undefined);
  assert.equal((await request(fixture, '/auth/me', { cookie: good.cookie })).status, 200);
});

await check('public registration cannot set roles or claim legacy or reserved administrator emails', async fixture => {
  const elevated = await register(fixture, 'new@example.test', { body: { ...credentials('new@example.test'), role: 'admin' } });
  assert.equal(elevated.status, 400);
  assert.equal((await register(fixture, 'admin@phsports.edu')).status, 409);
  fixture.sqlite.prepare("INSERT INTO users (id,email,role) VALUES ('legacy', 'legacy@example.test', 'admin')").run();
  assert.equal((await register(fixture, 'legacy@example.test')).status, 409);
  assert.equal((await login(fixture, 'legacy@example.test')).status, 401);
  assert.equal(fixture.sqlite.prepare("SELECT COUNT(*) AS count FROM auth_credentials WHERE user_id = 'legacy'").get().count, 0);
});

await check('duplicate signup leaves existing credentials unchanged', async fixture => {
  const first = await register(fixture);
  const stored = fixture.sqlite.prepare('SELECT password_hash FROM auth_credentials').get().password_hash;
  assert.equal((await register(fixture)).status, 409);
  assert.equal(fixture.sqlite.prepare('SELECT password_hash FROM auth_credentials').get().password_hash, stored);
  assert.equal((await request(fixture, '/auth/me', { cookie: first.cookie })).status, 200);
});

await check('session tokens rotate on login and logout revokes a stolen cookie server-side', async fixture => {
  const original = await register(fixture);
  const replacement = await login(fixture, undefined, { cookie: original.cookie });
  assert.notEqual(replacement.cookie, original.cookie);
  assert.equal((await request(fixture, '/auth/me', { cookie: original.cookie })).status, 401);
  assert.equal((await request(fixture, '/auth/me', { cookie: replacement.cookie })).status, 200);
  const logout = await request(fixture, '/auth/logout', { method: 'POST', cookie: replacement.cookie });
  assert.equal(logout.status, 200);
  assert.ok(logout.response.headers.get('set-cookie').includes('Max-Age=0'));
  assert.equal((await request(fixture, '/auth/me', { cookie: replacement.cookie })).status, 401);
  assert.equal((await request(fixture, '/auth/logout', { method: 'POST' })).status, 200);
});

await check('absolute expiration, idle expiration, malformed and ambiguous cookies reject sessions', async fixture => {
  const initial = await register(fixture);
  fixture.sqlite.prepare('UPDATE auth_sessions SET expires_at = ?').run(Math.floor(Date.now() / 1000) - 1);
  assert.equal((await request(fixture, '/auth/me', { cookie: initial.cookie })).status, 401);
  const second = await login(fixture);
  fixture.sqlite.prepare('UPDATE auth_sessions SET last_seen_at = ?').run(Math.floor(Date.now() / 1000) - 86401);
  assert.equal((await request(fixture, '/auth/me', { cookie: second.cookie })).status, 401);
  const third = await login(fixture);
  assert.equal((await request(fixture, '/auth/me', { cookie: `${third.cookie}; ${third.cookie}` })).status, 401);
  assert.equal((await request(fixture, '/auth/me', { cookie: '__Host-ph_sports_session=arbitrary' })).status, 401);
});

await check('cross-site writes and missing application headers cannot login, signup, or logout', async fixture => {
  for (const path of ['/auth/login', '/auth/register', '/auth/logout']) {
    assert.equal((await request(fixture, path, { method: 'POST', body: credentials('student@example.test'), headers: { Origin: 'https://attacker.example' } })).status, 403);
    assert.equal((await request(fixture, path, { method: 'POST', body: credentials('student@example.test'), headers: { 'X-PH-Sports-Request': '' } })).status, 403);
    assert.equal((await request(fixture, path, { method: 'POST', body: credentials('student@example.test'), headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  }
});

await check('password limits count Unicode characters and request/field limits reject invalid input', async fixture => {
  for (const password of ['a'.repeat(14), 'a'.repeat(129), '😀'.repeat(14)]) {
    assert.equal((await register(fixture, `invalid-${ipSequence}@example.test`, { body: { email: `invalid-${ipSequence}@example.test`, password } })).status, 400);
  }
  const unicode = await register(fixture, 'unicode@example.test', { body: { email: 'unicode@example.test', password: '😀'.repeat(15) } });
  assert.equal(unicode.status, 201);
  assert.equal((await login(fixture, undefined, { body: { email: 'unicode@example.test', password: '😀'.repeat(15) } })).status, 200);
  assert.equal((await register(fixture, 'long@example.test', { body: { ...credentials('long@example.test'), full_name: 'x'.repeat(101) } })).status, 400);
  assert.equal((await request(fixture, '/auth/register', { method: 'POST', raw: 'x'.repeat(16385) })).status, 413);
  assert.equal((await request(fixture, '/auth/register', { method: 'POST', raw: '[]' })).status, 400);
  assert.equal((await request(fixture, '/auth/register', { method: 'POST', raw: '{}' , headers: { 'Content-Type': 'text/plain' } })).status, 415);
});

await check('email throttle persists across IPs and resets only after its window', async fixture => {
  for (let attempt = 0; attempt < 10; attempt++) assert.equal((await login(fixture, 'rate@example.test')).status, 401);
  const blocked = await login(fixture, 'RATE@example.test');
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.response.headers.get('retry-after')) > 0);
  const keys = fixture.sqlite.prepare('SELECT bucket_key FROM auth_rate_limits').all();
  assert.ok(keys.every(row => /^[a-f0-9]{64}$/.test(row.bucket_key)));
  fixture.sqlite.prepare('UPDATE auth_rate_limits SET window_started_at = ?').run(Math.floor(Date.now() / 1000) - 901);
  assert.equal((await login(fixture, 'rate@example.test')).status, 401);
});

await check('IP throttle cannot be bypassed by cycling email addresses', async fixture => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = await login(fixture, `rate-${attempt}@example.test`, { body: { email: `rate-${attempt}@example.test`, password: '' }, headers: { 'CF-Connecting-IP': '192.0.2.1' } });
    assert.equal(result.status, 401);
  }
  assert.equal((await login(fixture, 'another@example.test', { headers: { 'CF-Connecting-IP': '192.0.2.1' } })).status, 429);
});

await check('local development cookies work while non-local plaintext HTTP is rejected', async fixture => {
  const local = await register(fixture, 'local@example.test', { origin: 'http://localhost:8788' });
  assert.equal(local.status, 201);
  assert.ok(local.cookie.startsWith('ph_sports_session='));
  assert.ok(!local.response.headers.get('set-cookie').includes('; Secure'));
  assert.equal((await request(fixture, '/auth/me', { cookie: local.cookie, origin: 'http://localhost:8788' })).status, 200);
  assert.equal((await register(fixture, 'remote@example.test', { origin: 'http://sports.example' })).status, 400);
});

console.log(`\n${passed} server authentication checks passed.`);
