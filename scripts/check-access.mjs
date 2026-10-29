import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { handleEntityRequest, updateProfile } from '../server/entities.js';

// Exercise the real SQL against SQLite with D1's asynchronous interface and transactional batch.
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
let beforeRun = null;
let beforeBatch = null;
class D1Statement {
  constructor(sql, bindings = []) { this.sql = sql; this.bindings = bindings; }
  bind(...bindings) { return new D1Statement(this.sql, bindings); }
  async first() { return sqlite.prepare(this.sql).get(...this.bindings) || null; }
  async all() { return { results: sqlite.prepare(this.sql).all(...this.bindings) }; }
  async run() { beforeRun?.(this.sql, this.bindings); const result = sqlite.prepare(this.sql).run(...this.bindings); return { meta: { changes: result.changes } }; }
}
const env = { DB: {
  prepare: sql => new D1Statement(sql),
  async batch(statements) {
    beforeBatch?.();
    sqlite.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  },
} };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const fixtures = [
  { id: 'student-one', email: 'one@example.test', full_name: 'Student One', role: 'student', profile_complete: 1, student_id: 'S1', grade: '10' },
  { id: 'student-two', email: 'two@example.test', full_name: 'Student Two', role: 'student', profile_complete: 1, student_id: 'S2', grade: '10' },
  { id: 'student-three', email: 'three@example.test', full_name: 'Student Three', role: 'student', profile_complete: 1, student_id: 'S3', grade: '10' },
  { id: 'coach', email: 'coach@example.test', full_name: 'Coach', role: 'teacher', profile_complete: 1, teacher_status: 'approved', sport_coached: 'Basketball', staff_id: 'T1' },
  { id: 'pending', email: 'pending@example.test', full_name: 'Pending Coach', role: 'teacher', profile_complete: 0, teacher_status: 'pending', sport_coached: 'Basketball', staff_id: 'T2' },
  { id: 'rejected', email: 'rejected@example.test', full_name: 'Rejected Coach', role: 'teacher', profile_complete: 0, teacher_status: 'rejected', sport_coached: 'Basketball', staff_id: 'T3' },
  { id: 'admin', email: 'administrator@example.test', full_name: 'Administrator', role: 'admin', profile_complete: 1 },
  { id: 'pretend-admin', email: 'admin@phsports.edu', full_name: 'Student With Admin Email', role: 'student', profile_complete: 1 },
  { id: 'incomplete', email: 'new@example.test', full_name: 'New Student', role: 'student', profile_complete: 0 },
  { id: 'new-teacher', email: 'new-coach@example.test', full_name: 'New Coach', role: 'student', profile_complete: 0 },
  { id: 'onboarding-fails', email: 'retry-coach@example.test', full_name: 'Retry Coach', role: 'student', profile_complete: 0 },
  { id: 'onboarding-race', email: 'race-coach@example.test', full_name: 'Race Coach', role: 'student', profile_complete: 0 },
  { id: 'review-race', email: 'review-coach@example.test', full_name: 'Review Coach', role: 'student', profile_complete: 0 },
];
for (const value of fixtures) {
  const entries = Object.entries(value);
  sqlite.prepare(`INSERT INTO users (${entries.map(([key]) => key).join(',')}) VALUES (${entries.map(() => '?').join(',')})`).run(...entries.map(([, value]) => value));
}
const user = id => sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id);
const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
async function request(path, { as = 'student-one', method = 'GET', data, userOverride } = {}) {
  const url = new URL(`/api${path}`, 'https://sports.example.test');
  const req = new Request(url, { method, ...(data !== undefined ? { body: JSON.stringify(data), headers: { 'content-type': 'application/json' } } : {}) });
  const context = { request: req, env, url, path: url.pathname.slice(4), method, user: userOverride || (as ? user(as) : null), json };
  try {
    const response = path.startsWith('/auth/updateMe') ? await updateProfile(context) : await handleEntityRequest(context);
    return { status: response?.status ?? 404, data: response ? await response.json() : null };
  } catch (error) {
    if (!error.status) throw error;
    return { status: error.status, data: { error: error.message } };
  }
}
const mutate = (path, data, as = 'student-one', method = 'POST') => request(path, { as, method, data });
let passed = 0;
async function check(name, callback) { await callback(); passed++; console.log(`✓ ${name}`); }

await check('guests cannot read or mutate any entity, including the leaderboard', async () => {
  for (const path of ['/users', '/teacher-registrations', '/training-logs', '/team-memberships', '/venue-bookings', '/announcements', '/teams', '/training-leaderboard?sport=Basketball&month=2026-10']) {
    assert.equal((await request(path, { as: null })).status, 401);
    assert.equal((await mutate(path, {}, null)).status, 401);
  }
});
await check('pending, rejected and incomplete accounts cannot access business records', async () => {
  for (const as of ['pending', 'rejected', 'incomplete']) for (const path of ['/announcements', '/training-logs', '/venue-bookings', '/teams']) assert.equal((await request(path, { as })).status, 403);
});
await check('a matching admin email does not grant administrator access', async () => {
  assert.equal((await request('/users', { as: 'pretend-admin' })).status, 403);
  assert.equal((await request('/teacher-registrations', { as: 'pretend-admin' })).data.length, 0);
});
await check('profile setup cannot grant admin or approved teacher access', async () => {
  for (const data of [{ role: 'admin', profile_complete: true }, { role: 'teacher', staff_id: 'T9', sport_coached: 'Basketball', teacher_status: 'approved' }, { role: 'teacher', staff_id: 'T9', sport_coached: 'Basketball', profile_complete: true }]) assert.ok([400, 403].includes((await mutate('/auth/updateMe', data, 'incomplete', 'PATCH')).status));
  assert.equal(user('incomplete').role, 'student');
  assert.equal((await mutate('/auth/updateMe', { profile_complete: true }, 'incomplete', 'PATCH')).status, 400);
  assert.equal((await mutate('/auth/updateMe', { role: 'student', student_id: 'NEW', grade: '9', profile_complete: true }, 'incomplete', 'PATCH')).status, 200);
});
await check('completed users cannot change account permission fields', async () => {
  for (const data of [{ role: 'teacher' }, { teacher_status: 'approved' }, { sport_coached: 'Basketball' }, { profile_complete: false }, { email: 'another@example.test' }, { password_hash: 'forged' }]) assert.ok([400, 403].includes((await mutate('/auth/updateMe', data, 'student-one', 'PATCH')).status));
});
await check('teacher onboarding creates the pending account and review request together and reuses its ID on retries', async () => {
  const data = { role: 'teacher', staff_id: 'TNEW', sport_coached: 'Basketball', profile_complete: false, teacher_status: 'pending' };
  assert.equal((await mutate('/auth/updateMe', data, 'new-teacher', 'PATCH')).status, 200);
  const first = sqlite.prepare("SELECT * FROM teacher_registrations WHERE user_id = 'new-teacher'").get();
  assert.ok(first); assert.equal(first.status, 'pending'); assert.equal(first.staff_id, 'TNEW');
  assert.equal(user('new-teacher').role, 'teacher'); assert.equal(user('new-teacher').teacher_status, 'pending');
  assert.equal(user('new-teacher').profile_complete, 0);
  assert.equal((await mutate('/auth/updateMe', data, 'new-teacher', 'PATCH')).status, 200);
  const legacyRetry = await mutate('/teacher-registrations', { staff_id: 'TNEW', sport_coached: 'Basketball' }, 'new-teacher');
  assert.equal(legacyRetry.status, 201); assert.equal(legacyRetry.data.id, first.id);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM teacher_registrations WHERE user_id = 'new-teacher'").get().count, 1);
  assert.equal((await mutate('/auth/updateMe', { ...data, staff_id: 'TNEW2', sport_coached: 'Rowing' }, 'new-teacher', 'PATCH')).status, 409);
  assert.equal((await mutate('/auth/updateMe', { staff_id: 'TNEW2' }, 'new-teacher', 'PATCH')).status, 409);
  const unchanged = sqlite.prepare("SELECT * FROM teacher_registrations WHERE user_id = 'new-teacher'").get();
  assert.equal(unchanged.id, first.id); assert.equal(unchanged.staff_id, 'TNEW'); assert.equal(unchanged.sport_coached, 'Basketball');
  assert.equal(user('new-teacher').sport_coached, unchanged.sport_coached);
});
await check('teacher registration storage failure rolls back the account transition', async () => {
  sqlite.exec("CREATE TRIGGER simulate_registration_failure BEFORE INSERT ON teacher_registrations WHEN NEW.user_id = 'onboarding-fails' BEGIN SELECT RAISE(ABORT, 'Simulated registration failure'); END;");
  await assert.rejects(() => mutate('/auth/updateMe', { role: 'teacher', staff_id: 'TRETRY', sport_coached: 'Basketball', profile_complete: false, teacher_status: 'pending' }, 'onboarding-fails', 'PATCH'), /Simulated registration failure/);
  assert.equal(user('onboarding-fails').role, 'student'); assert.equal(user('onboarding-fails').staff_id, null);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM teacher_registrations WHERE user_id = 'onboarding-fails'").get().count, 0);
  sqlite.exec('DROP TRIGGER simulate_registration_failure');
});
await check('stale profile requests cannot overwrite a newer teacher submission or approval', async () => {
  const studentSnapshot = user('onboarding-race');
  const teacherData = { role: 'teacher', staff_id: 'TRACE', sport_coached: 'Basketball', profile_complete: false, teacher_status: 'pending' };
  assert.equal((await mutate('/auth/updateMe', teacherData, 'onboarding-race', 'PATCH')).status, 200);
  const teacherSnapshot = user('onboarding-race');
  const staleStudent = await request('/auth/updateMe', { as: 'onboarding-race', method: 'PATCH', userOverride: studentSnapshot, data: { role: 'student', student_id: 'RACE', grade: '10', profile_complete: true } });
  assert.equal(staleStudent.status, 409); assert.equal(user('onboarding-race').role, 'teacher'); assert.equal(user('onboarding-race').profile_complete, 0);
  const registration = sqlite.prepare("SELECT id FROM teacher_registrations WHERE user_id = 'onboarding-race'").get();
  assert.equal((await mutate(`/teacher-registrations/${registration.id}`, { status: 'approved' }, 'admin', 'PATCH')).status, 200);
  const staleTeacher = await request('/auth/updateMe', { as: 'onboarding-race', method: 'PATCH', userOverride: teacherSnapshot, data: teacherData });
  assert.equal(staleTeacher.status, 409); assert.equal(user('onboarding-race').teacher_status, 'approved'); assert.equal(user('onboarding-race').profile_complete, 1);
});
await check('approval predicates reject an account changed after validation without approving its application', async () => {
  assert.equal((await mutate('/auth/updateMe', { role: 'teacher', staff_id: 'TREVIEW', sport_coached: 'Basketball', profile_complete: false }, 'review-race', 'PATCH')).status, 200);
  const registration = sqlite.prepare("SELECT id FROM teacher_registrations WHERE user_id = 'review-race'").get();
  beforeBatch = () => { beforeBatch = null; sqlite.exec("UPDATE users SET staff_id = 'CHANGED_DURING_REVIEW' WHERE id = 'review-race'"); };
  try { assert.equal((await mutate(`/teacher-registrations/${registration.id}`, { status: 'approved' }, 'admin', 'PATCH')).status, 409); }
  finally { beforeBatch = null; }
  assert.equal(sqlite.prepare('SELECT status FROM teacher_registrations WHERE id = ?').get(registration.id).status, 'pending');
  assert.equal(user('review-race').teacher_status, 'pending'); assert.equal(user('review-race').profile_complete, 0);
});
await check('memberships stamp canonical identity, reject spoofing and remain idempotent', async () => {
  assert.equal((await mutate('/team-memberships', { sport: 'Basketball', user_email: 'two@example.test' })).status, 403);
  assert.equal((await mutate('/team-memberships', { sport: 'Basketball', role: 'captain' })).status, 403);
  const first = await mutate('/team-memberships', { sport: 'Basketball' });
  const second = await mutate('/team-memberships', { sport: 'Basketball' });
  assert.equal(first.status, 201); assert.equal(first.data.id, second.data.id);
  assert.equal(first.data.user_email, user('student-one').email);
  assert.equal(first.data.user_name, user('student-one').full_name);
  await mutate('/team-memberships', { sport: 'Basketball' }, 'student-two');
  await mutate('/team-memberships', { sport: 'Football' }, 'student-three');
});
await check('membership directories are scoped to joined sports and coached sport', async () => {
  const student = await request('/team-memberships'); assert.equal(student.data.length, 2);
  assert.ok(student.data.every(row => row.sport === 'Basketball'));
  const coach = await request('/team-memberships', { as: 'coach' }); assert.equal(coach.data.length, 2);
  const other = await request('/team-memberships?filter=%7B%22sport%22%3A%22Football%22%7D'); assert.deepEqual(other.data, []);
});
await check('membership ID mutations cannot target another student', async () => {
  const member = sqlite.prepare('SELECT * FROM team_memberships WHERE user_email = ?').get(user('student-two').email);
  assert.equal((await request(`/team-memberships/${member.id}`, { method: 'DELETE' })).status, 403);
  assert.equal((await request(`/team-memberships/${member.id}`, { method: 'DELETE', as: 'coach' })).status, 403);
});
await check('list detection, filters, sorts and limits work and reject untrusted SQL fields', async () => {
  assert.equal((await request('/team-memberships?filter=%7B%22user_email%22%3A%22one%40example.test%22%7D&sort=-created_date&limit=1')).data.length, 1);
  for (const query of ['sort=created_at%3BDELETE%20FROM%20users', 'filter=%7B%22unknown%22%3A%22x%22%7D', 'filter=[]', 'filter=%7B', 'limit=501', 'limit=-1', 'anything=1']) assert.equal((await request(`/team-memberships?${query}`)).status, 400);
  assert.equal((await mutate('/team-memberships', { sport: 'Basketball', 'sport) VALUES (1); --': 'x' })).status, 400);
});
let logId;
await check('training records store structured metrics and canonical identity', async () => {
  const created = await mutate('/training-logs', { sport: 'Basketball', date: today, duration: 60, session_type: 'team', notes: 'Private notes', data: { heart_rate: 100 } });
  assert.equal(created.status, 400);
  const valid = await mutate('/training-logs', { sport: 'Basketball', date: today, duration: 60, session_type: 'team', notes: 'Private notes', data: { shots_made: 25 } });
  assert.equal(valid.status, 201); logId = valid.data.id;
  assert.deepEqual(valid.data.data, { shots_made: 25 }); assert.ok(valid.data.created_date);
  assert.equal((await mutate('/training-logs', { sport: 'Football', date: today, duration: 60 })).status, 403);
  assert.equal((await mutate('/training-logs', { sport: 'Basketball', user_email: 'two@example.test', date: today, duration: 60 })).status, 403);
});
await check('students cannot read or edit another student’s raw training data', async () => {
  const list = await request('/training-logs', { as: 'student-two' }); assert.deepEqual(list.data, []);
  assert.equal((await request(`/training-logs/${logId}`, { as: 'student-two' })).status, 404);
  assert.equal((await mutate(`/training-logs/${logId}`, { notes: 'Overwrite' }, 'student-two', 'PATCH')).status, 403);
  assert.equal((await request(`/training-logs/${logId}`, { as: 'student-two', method: 'DELETE' })).status, 403);
  assert.equal((await request('/training-logs', { as: 'coach' })).data.length, 1);
});
await check('joined sport leaderboards expose aggregate scores without training notes or health data', async () => {
  const result = await request(`/training-leaderboard?sport=Basketball&month=${today.slice(0, 7)}`, { as: 'student-two' });
  assert.equal(result.status, 200); assert.equal(result.data.length, 2);
  assert.equal(result.data[0].sessions, 1); assert.equal(result.data[0].score, 1);
  assert.equal(result.data[0].user_name, 'Student One');
  for (const entry of result.data) assert.deepEqual(Object.keys(entry).sort(), ['rank', 'score', 'sessions', 'user_email', 'user_name']);
  assert.equal((await request(`/training-leaderboard?sport=Football&month=${today.slice(0, 7)}`)).status, 403);
});
let announcementId;
await check('announcements require a coach, stamp identity and restrict sport access', async () => {
  const data = { sport: 'Basketball', title: 'Practice', content: 'Meet at the gym', priority: 'normal' };
  assert.equal((await mutate('/announcements', data)).status, 403);
  assert.equal((await mutate('/announcements', { ...data, sport: 'Football' }, 'coach')).status, 403);
  const created = await mutate('/announcements', data, 'coach'); assert.equal(created.status, 201);
  announcementId = created.data.id; assert.equal(created.data.teacher_email, user('coach').email);
  assert.equal((await request('/announcements')).data.length, 1);
  assert.equal((await request('/announcements', { as: 'student-three' })).data.length, 0);
  assert.equal((await request(`/announcements/${announcementId}`, { as: 'student-three' })).status, 404);
  assert.equal((await request(`/announcements/${announcementId}`, { method: 'DELETE' })).status, 403);
});
let bookingId;
const booking = { sport: 'Basketball', venue: 'Main Gymnasium', date: today, time_slot: '09:00', duration: 60, purpose: 'practice', status: 'pending' };
await check('booking validation rejects forged identity, status, sport, venue and invalid times', async () => {
  for (const data of [{ booked_by_email: 'two@example.test' }, { booked_by_name: 'Forged Coach' }, { status: 'approved' }, { sport: 'Football' }, { venue: 'Unknown Venue' }, { date: '2000-01-01' }, { time_slot: '09:15' }, { time_slot: '21:30', duration: 120 }]) assert.ok([400, 403].includes((await mutate('/venue-bookings', { ...booking, ...data })).status));
  const result = await mutate('/venue-bookings', booking); assert.equal(result.status, 201); bookingId = result.data.id;
  assert.equal(result.data.user_id, 'student-one'); assert.equal(result.data.booked_by_name, 'Student One');
});
await check('overlapping venue reservations are rejected, including a different sport sharing the venue', async () => {
  assert.equal((await mutate('/venue-bookings', { ...booking, time_slot: '09:30' }, 'student-two')).status, 409);
  await mutate('/team-memberships', { sport: 'Volleyball' }, 'student-two');
  assert.equal((await mutate('/venue-bookings', { ...booking, sport: 'Volleyball' }, 'student-two')).status, 409);
  assert.equal((await mutate('/venue-bookings', { ...booking, time_slot: '10:00' }, 'student-two')).status, 201);
});
await check('the shared calendar redacts personal booking fields for other students and unrelated coaches', async () => {
  const result = await request(`/venue-bookings/${bookingId}`, { as: 'student-two' }); assert.equal(result.status, 200);
  assert.equal(result.data.booked_by_name, 'Reserved');
  for (const field of ['booked_by_email', 'user_id', 'user_name', 'purpose', 'teacher_comment']) assert.equal(result.data[field], undefined);
  assert.equal((await request(`/venue-bookings/${bookingId}`, { as: 'coach' })).data.booked_by_name, 'Student One');
  assert.equal((await request('/venue-bookings?filter=%7B%22booked_by_email%22%3A%22one%40example.test%22%7D', { as: 'student-two' })).status, 403);
});
await check('booking approvals require the sport’s coach or administrator', async () => {
  assert.equal((await mutate(`/venue-bookings/${bookingId}`, { status: 'approved' }, 'student-one', 'PATCH')).status, 403);
  assert.equal((await mutate(`/venue-bookings/${bookingId}`, { status: 'approved', booked_by_email: 'hijack@example.test' }, 'coach', 'PATCH')).status, 400);
  assert.equal((await mutate(`/venue-bookings/${bookingId}`, { status: 'approved', teacher_comment: 'Approved by coach' }, 'coach', 'PATCH')).status, 200);
  assert.equal((await mutate(`/venue-bookings/${bookingId}`, { status: 'rejected' }, 'coach', 'PATCH')).status, 409);
  assert.equal((await request(`/venue-bookings/${bookingId}`, { method: 'DELETE' })).status, 403);
});
await check('a pending booking approved during cancellation cannot be deleted by its owner', async () => {
  const created = await mutate('/venue-bookings', { ...booking, time_slot: '13:00' }); assert.equal(created.status, 201);
  beforeRun = sql => {
    if (!sql.startsWith('DELETE FROM venue_bookings')) return;
    beforeRun = null;
    sqlite.prepare("UPDATE venue_bookings SET status = 'approved' WHERE id = ?").run(created.data.id);
  };
  try { assert.equal((await request(`/venue-bookings/${created.data.id}`, { method: 'DELETE' })).status, 409); }
  finally { beforeRun = null; }
  assert.equal(sqlite.prepare('SELECT status FROM venue_bookings WHERE id = ?').get(created.data.id).status, 'approved');
});
let registrationId;
await check('teacher registrations are private, reject self-approval and cannot be impersonated', async () => {
  assert.equal((await mutate('/teacher-registrations', { status: 'approved' }, 'pending')).status, 403);
  assert.equal((await mutate('/teacher-registrations', { user_email: 'other@example.test' }, 'pending')).status, 403);
  const created = await mutate('/teacher-registrations', { staff_id: 'T2', sport_coached: 'Basketball', status: 'pending' }, 'pending');
  assert.equal(created.status, 201); registrationId = created.data.id;
  assert.equal((await request('/teacher-registrations', { as: 'pending' })).data.length, 1);
  assert.equal((await request('/teacher-registrations', { as: 'student-one' })).data.length, 0);
  assert.equal((await request(`/teacher-registrations/${registrationId}`)).status, 404);
  assert.equal((await mutate(`/teacher-registrations/${registrationId}`, { status: 'approved' }, 'pending', 'PATCH')).status, 403);
});
await check('administrator teacher approval updates the application and account together', async () => {
  const result = await mutate(`/teacher-registrations/${registrationId}`, { status: 'approved', admin_comment: 'Verified' }, 'admin', 'PATCH');
  assert.equal(result.status, 200); assert.equal(result.data.status, 'approved');
  assert.equal(user('pending').teacher_status, 'approved'); assert.equal(user('pending').profile_complete, 1);
  assert.equal((await request('/training-logs', { as: 'pending' })).status, 200);
  assert.equal((await mutate(`/teacher-registrations/${registrationId}`, { status: 'rejected' }, 'admin', 'PATCH')).status, 409);
});
await check('administrator user lists never expose password material and cannot assign roles through generic updates', async () => {
  // Auth migrations may add credentials; projection must stay safe as schema evolves.
  try { sqlite.exec('ALTER TABLE users ADD COLUMN password_hash TEXT'); } catch { /* already in schema */ }
  sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run('secret-credential-material', 'student-one');
  const list = await request('/users', { as: 'admin' }); assert.equal(list.status, 200);
  assert.ok(list.data.every(row => !('password_hash' in row)));
  assert.equal((await request('/users/student-one', { as: 'admin' })).data.password_hash, undefined);
  assert.equal((await mutate('/users/student-one', { role: 'admin' }, 'admin', 'PATCH')).status, 400);
  assert.equal((await mutate('/users/student-one', { full_name: 'Updated Student' }, 'admin', 'PATCH')).status, 200);
});

sqlite.close();
console.log(`Backend access regression checks passed: ${passed}`);
