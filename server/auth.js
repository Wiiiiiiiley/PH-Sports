import { Buffer } from 'node:buffer';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { HttpError, readJson } from './http.js';

// OWASP's 16 MiB scrypt configuration fits within a Workers isolate's memory limit.
// Keep parameters fixed when parsing stored hashes so corrupted data cannot request
// arbitrary amounts of CPU or memory. New configurations need an explicit version.
const SCRYPT = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };
const HASH_PREFIX = 'scrypt$16384$8$5';
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const IDLE_SECONDS = 24 * 60 * 60;
const USER_FIELDS = ['id', 'email', 'full_name', 'role', 'sport_coached', 'profile_complete', 'teacher_status', 'student_id', 'staff_id', 'grade', 'profile_photo_url', 'created_at', 'updated_at'];
const DUMMY_HASH = `${HASH_PREFIX}$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(64).toString('base64url')}`;
const INVALID_CREDENTIALS = '邮箱或密码不正确。';
const REGISTRATION_FAILED = '无法使用这些信息注册，请登录或联系管理员。';
const epoch = () => Math.floor(Date.now() / 1000);
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => { throw new HttpError(status, message); };

function derive(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT, (error, key) => error ? reject(error) : resolve(key));
  });
}

function validPassword(password, minimum = 15) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const length = Array.from(password).length;
  return length >= minimum && length <= 128 && Buffer.byteLength(password, 'utf8') <= 512;
}

// Shared by offline administrator provisioning; plaintext passwords never enter SQL.
export async function hashPassword(password) {
  if (!validPassword(password)) fail(400, '密码须为 15 至 128 个字符。');
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${HASH_PREFIX}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

async function verifyPassword(password, encoded) {
  let parts = typeof encoded === 'string' ? encoded.split('$') : [];
  const valid = parts.length === 6 && parts.slice(0, 4).join('$') === HASH_PREFIX &&
    /^[A-Za-z0-9_-]{22}$/.test(parts[4]) && /^[A-Za-z0-9_-]{86}$/.test(parts[5]);
  if (!valid) parts = DUMMY_HASH.split('$');
  const key = await derive(password, Buffer.from(parts[4], 'base64url'));
  const matches = timingSafeEqual(key, Buffer.from(parts[5], 'base64url'));
  return valid && matches;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') fail(400, '请输入有效的邮箱地址。');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, '请输入有效的邮箱地址。');
  return email;
}

function allowedKeys(body, allowed) {
  if (Object.keys(body).some(key => !allowed.includes(key))) fail(400, '包含不支持的字段。');
}

function safeUser(user) {
  return {
    ...Object.fromEntries(USER_FIELDS.filter(key => user[key] !== undefined).map(key => [key, user[key]])),
    profile_complete: !!user.profile_complete,
    created_date: user.created_at,
  };
}

function cookieSettings(request) {
  const url = new URL(request.url);
  if (url.protocol === 'https:') return { name: '__Host-ph_sports_session', secure: '; Secure' };
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return { name: 'ph_sports_session', secure: '' };
  fail(400, '登录服务需要使用 HTTPS。');
}

function sessionCookie(request, token, maxAge = SESSION_SECONDS) {
  const { name, secure } = cookieSettings(request);
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function sessionToken(request) {
  const { name } = cookieSettings(request);
  const cookies = (request.headers.get('Cookie') || '').split(';').map(part => part.trim());
  const matches = cookies.filter(part => part.startsWith(`${name}=`));
  // Ambiguous duplicate cookies are rejected instead of choosing an attacker cookie.
  if (matches.length !== 1) return null;
  const token = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

async function createSession(db, request, userId) {
  const token = randomBytes(32).toString('base64url');
  const now = epoch();
  const tokenHash = digest(token);
  const previous = sessionToken(request);
  const statements = [];
  if (previous) statements.push(db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(digest(previous)));
  // Bounded cleanup prevents expired sessions from accumulating indefinitely.
  statements.push(db.prepare('DELETE FROM auth_sessions WHERE token_hash IN (SELECT token_hash FROM auth_sessions WHERE expires_at <= ? OR last_seen_at <= ? LIMIT 100)').bind(now, now - IDLE_SECONDS));
  statements.push(db.prepare('DELETE FROM auth_sessions WHERE token_hash IN (SELECT token_hash FROM auth_sessions WHERE user_id = ? ORDER BY created_at DESC, token_hash DESC LIMIT -1 OFFSET 9)').bind(userId));
  statements.push(db.prepare('INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)').bind(tokenHash, userId, now, now + SESSION_SECONDS, now));
  await db.batch(statements);
  return sessionCookie(request, token);
}

export async function requireUser({ request, env }) {
  const token = sessionToken(request);
  if (!token) fail(401, '请先登录。');
  const now = epoch();
  // Expiry and idle timeout are checked atomically with the touch. Deleted/revoked
  // sessions never become valid again, even if their cookie has not expired yet.
  const session = await env.DB.prepare(`UPDATE auth_sessions SET last_seen_at = ?
    WHERE token_hash = ? AND expires_at > ? AND last_seen_at > ?
    RETURNING user_id, created_at, expires_at, last_seen_at`)
    .bind(now, digest(token), now, now - IDLE_SECONDS).first();
  if (!session) fail(401, '登录已失效，请重新登录。');
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first();
  if (!user) fail(401, '登录已失效，请重新登录。');
  return { user: safeUser(user), session };
}

async function throttle(db, key, maximum, seconds) {
  const now = epoch();
  // One UPSERT avoids the read-then-write race of in-memory or SELECT counters.
  const bucket = await db.prepare(`INSERT INTO auth_rate_limits (bucket_key, window_started_at, attempt_count)
    VALUES (?, ?, 1) ON CONFLICT (bucket_key) DO UPDATE SET
      attempt_count = CASE WHEN window_started_at <= ? THEN 1 ELSE attempt_count + 1 END,
      window_started_at = CASE WHEN window_started_at <= ? THEN ? ELSE window_started_at END
    RETURNING attempt_count, window_started_at`)
    .bind(digest(key), now, now - seconds, now - seconds, now).first();
  if (bucket.attempt_count > maximum) {
    const error = new HttpError(429, '尝试次数过多，请稍后重试。');
    error.headers = { 'Retry-After': String(Math.max(1, bucket.window_started_at + seconds - now)) };
    throw error;
  }
}

async function throttleIp(request, env, action) {
  // Cloudflare supplies this header itself. Never trust X-Forwarded-For supplied by
  // clients; without the edge header, local requests share a conservative bucket.
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  await throttle(env.DB, `${action}:ip:${ip}`, action === 'register' ? 10 : 60, 15 * 60);
  await env.DB.prepare('DELETE FROM auth_rate_limits WHERE bucket_key IN (SELECT bucket_key FROM auth_rate_limits WHERE window_started_at <= ? LIMIT 100)').bind(epoch() - 15 * 60).run();
}

export async function handleAuthRequest({ request, env, path, method, json }) {
  if (!['/auth/login', '/auth/register', '/auth/logout', '/auth/me'].includes(path)) return null;
  const expected = path === '/auth/me' ? 'GET' : 'POST';
  if (method !== expected) fail(405, '不支持此请求方式。');
  // Validate transport before expensive password work or database mutations.
  cookieSettings(request);

  if (path === '/auth/me') return json((await requireUser({ request, env })).user);

  if (path === '/auth/logout') {
    const token = sessionToken(request);
    if (token) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(digest(token)).run();
    return json({ success: true }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
  }

  const registering = path === '/auth/register';
  await throttleIp(request, env, registering ? 'register' : 'login');
  const body = await readJson(request);
  allowedKeys(body, registering ? ['email', 'password', 'full_name'] : ['email', 'password']);
  const email = normalizeEmail(body.email);
  await throttle(env.DB, `${registering ? 'register' : 'login'}:email:${email}`, 10, 15 * 60);
  if (!validPassword(body.password, registering ? 15 : 1)) {
    fail(registering ? 400 : 401, registering ? '密码须为 15 至 128 个字符。' : INVALID_CREDENTIALS);
  }

  if (!registering) {
    const record = await env.DB.prepare(`SELECT users.*, auth_credentials.password_hash
      FROM users LEFT JOIN auth_credentials ON auth_credentials.user_id = users.id
      WHERE lower(users.email) = ?`).bind(email).first();
    const matches = await verifyPassword(body.password, record?.password_hash || DUMMY_HASH);
    if (!record || !record.password_hash || !matches) fail(401, INVALID_CREDENTIALS);
    const cookie = await createSession(env.DB, request, record.id);
    return json(safeUser(record), 200, { 'Set-Cookie': cookie });
  }

  if (typeof body.full_name !== 'string' || !body.full_name.trim() || body.full_name.trim().length > 100) fail(400, '请填写姓名，且不超过 100 个字符。');
  const passwordHash = await hashPassword(body.password);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE lower(email) = ?').bind(email).first();
  // Legacy records must be provisioned by an administrator; public signup can
  // never attach a password to an existing student, teacher, or administrator.
  if (existing || email === 'admin@phsports.edu') fail(409, REGISTRATION_FAILED);
  const id = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, email, full_name, role, profile_complete, teacher_status) VALUES (?, ?, ?, 'student', 0, 'pending')").bind(id, email, body.full_name.trim()),
      env.DB.prepare('INSERT INTO auth_credentials (user_id, password_hash) VALUES (?, ?)').bind(id, passwordHash),
    ]);
  } catch (error) {
    // A simultaneous signup for the same address must not replace credentials.
    if (/UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(String(error?.message))) fail(409, REGISTRATION_FAILED);
    throw error;
  }
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  const cookie = await createSession(env.DB, request, id);
  return json(safeUser(user), 201, { 'Set-Cookie': cookie });
}
