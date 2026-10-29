import { HttpError, readJson } from './http.js';

const SPORTS = ['Rowing', 'Basketball', 'Volleyball', 'Football', 'Tennis', 'Table Tennis', 'Badminton', 'Ultimate Frisbee', 'Billiards Club'];
const VENUES = {
  Basketball: ['Main Gymnasium', 'Outdoor Court A', 'Outdoor Court B'],
  Football: ['Main Football Field', 'Training Pitch', 'Indoor Arena'],
  Volleyball: ['Main Gymnasium', 'Beach Court', 'Indoor Court B'],
  Badminton: ['Sports Hall A', 'Sports Hall B'],
  'Table Tennis': ['Activity Room 1', 'Activity Room 2'],
  Tennis: ['Tennis Court 1', 'Tennis Court 2', 'Tennis Court 3'],
  'Ultimate Frisbee': ['Main Football Field', 'Training Pitch', 'Open Field'],
  'Billiards Club': ['Billiards Room A', 'Billiards Room B'],
};
const METRICS = {
  Rowing: ['distance', 'avg_split_time', 'heart_rate'],
  Basketball: ['shot_attempts', 'shots_made', 'three_point_attempts', 'three_point_made', 'ft_attempts', 'ft_made', 'dribbling_drills', 'defensive_drills'],
  Volleyball: ['serve_attempts', 'serves_successful', 'spike_attempts', 'spikes_successful', 'dig_attempts', 'digs_successful', 'setting_drills'],
  Football: ['distance_ran', 'passing_drills', 'shooting_attempts', 'shots_on_target', 'dribbling_drills', 'defensive_drills'],
  Tennis: ['serve_attempts', 'aces', 'double_faults', 'avg_rally_duration', 'backhand_drills', 'forehand_drills'],
  'Table Tennis': ['rally_sets', 'serve_practice', 'spin_drill_sets', 'footwork_drills'],
  Badminton: ['serve_practice', 'smash_attempts', 'smash_accuracy', 'drop_shot_drills', 'footwork_drills'],
  'Ultimate Frisbee': ['throws_completed', 'throw_attempts', 'catches', 'drops', 'disc_drills', 'endzone_plays'],
  'Billiards Club': ['frames_played', 'frames_won', 'highest_break'],
};
const SESSIONS = {
  Rowing: ['endurance', 'intervals', 'technique'], Basketball: ['individual', 'team', 'scrimmage'],
  Volleyball: ['individual', 'team', 'scrimmage'], Football: ['individual', 'team', 'match'],
  Tennis: ['solo', 'rally', 'match'], 'Table Tennis': ['solo', 'rally', 'match'], Badminton: ['solo', 'rally', 'match'],
  'Ultimate Frisbee': ['individual', 'team', 'scrimmage'], 'Billiards Club': ['potting', 'positional', 'safety', 'free practice'],
};
// Every SQL identifier comes from this server-owned map; request keys are never SQL identifiers.
const ENTITIES = {
  users: { table: 'users', filters: ['id', 'email', 'role', 'teacher_status'], sorts: ['created_at', 'full_name', 'email', 'role'] },
  'teacher-registrations': { table: 'teacher_registrations', filters: ['id', 'user_id', 'user_email', 'sport_coached', 'status'], sorts: ['created_at', 'user_name', 'status'] },
  'venue-bookings': { table: 'venue_bookings', filters: ['id', 'user_id', 'booked_by_email', 'sport', 'venue', 'date', 'status'], sorts: ['created_at', 'date', 'time_slot', 'status'] },
  announcements: { table: 'announcements', filters: ['id', 'teacher_email', 'sport', 'priority'], sorts: ['created_at', 'title', 'priority'] },
  'team-memberships': { table: 'team_memberships', filters: ['id', 'user_email', 'sport'], sorts: ['created_at', 'user_name', 'sport'] },
  teams: { table: 'teams', filters: ['id', 'sport', 'coach_id'], sorts: ['created_at', 'name', 'sport'] },
  'training-logs': { table: 'training_logs', filters: ['id', 'user_email', 'sport', 'date'], sorts: ['created_at', 'date', 'duration'] },
};
const USER_FIELDS = ['id', 'email', 'full_name', 'role', 'sport_coached', 'profile_complete', 'teacher_status', 'student_id', 'staff_id', 'grade', 'profile_photo_url', 'created_at', 'updated_at'];
const admin = user => user.role === 'admin';
const teacher = user => user.role === 'teacher' && user.teacher_status === 'approved';
const fail = (status, message) => { throw new HttpError(status, message); };
const requireAdmin = user => { if (!admin(user)) fail(403, 'Administrator access required'); };
const own = (user, row, field = 'user_email') => row[field] === user.email;
const changed = result => Number(result?.meta?.changes ?? result?.changes ?? 0) > 0;
const rows = async statement => (await statement.all()).results || [];
const pick = (object, fields) => Object.fromEntries(fields.filter(key => object[key] !== undefined).map(key => [key, object[key]]));

function safeUser(row) {
  if (!row) return row;
  return { ...pick(row, USER_FIELDS), profile_complete: !!row.profile_complete, created_date: row.created_at };
}
function serialize(row, entity, user) {
  if (!row) return row;
  if (entity === 'users') return safeUser(row);
  const result = { ...row, created_date: row.created_at };
  if (entity === 'training-logs') {
    try { result.data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {}); }
    catch { result.data = {}; }
  }
  if (entity === 'venue-bookings' && !admin(user) && row.user_id !== user.id && !own(user, row, 'booked_by_email') && !(teacher(user) && row.sport === user.sport_coached)) {
    return { ...pick(result, ['id', 'sport', 'venue', 'date', 'time_slot', 'duration', 'status', 'created_at', 'created_date']), booked_by_name: 'Reserved' };
  }
  return result;
}

async function body(request) {
  return readJson(request);
}
function keys(value, allowed) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(400, `Unsupported field: ${key}`);
  if (!Object.keys(value).length) fail(400, 'At least one field is required');
}
function textField(value, field, max = 200, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, `Invalid ${field}`);
  return value.trim();
}
function choice(value, allowed, field) {
  if (!allowed.includes(value)) fail(400, `Invalid ${field}`);
  return value;
}
function sport(value) { return choice(value, SPORTS, 'sport'); }
function dateField(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail(400, 'Invalid date');
  return value;
}
function identity(value, user, mapping) {
  for (const [key, property] of Object.entries(mapping)) {
    if (value[key] !== undefined && value[key] !== user[property]) fail(403, `Cannot change ${key}`);
  }
}
function ready(user) {
  if (admin(user)) return;
  if (user.role === 'teacher' && user.teacher_status !== 'approved') fail(403, 'Teacher approval required');
  if (!user.profile_complete) fail(403, 'Complete your profile first');
  if (!['student', 'teacher'].includes(user.role)) fail(403, 'Account access is unavailable');
}
async function joined(env, user, selectedSport) {
  return !!await env.DB.prepare('SELECT id FROM team_memberships WHERE user_email = ? AND sport = ? LIMIT 1').bind(user.email, selectedSport).first();
}
async function sportAccess(env, user, selectedSport) {
  sport(selectedSport);
  if (admin(user)) return;
  if (teacher(user) && user.sport_coached === selectedSport) return;
  if (user.role === 'student' && await joined(env, user, selectedSport)) return;
  fail(403, 'You do not have access to this sport');
}

// Applies the same visibility scope to list and ID reads and to every supplied filter.
function readScope(entity, user) {
  if (admin(user)) return { clause: '1 = 1', values: [] };
  if (entity === 'users') { requireAdmin(user); }
  if (entity === 'teacher-registrations') return { clause: 'user_id = ?', values: [user.id] };
  if (entity === 'venue-bookings') {
    return teacher(user)
      ? { clause: '(status != ? OR user_id = ? OR sport = ?)', values: ['rejected', user.id, user.sport_coached] }
      : { clause: '(status != ? OR user_id = ?)', values: ['rejected', user.id] };
  }
  if (teacher(user)) return { clause: 'sport = ?', values: [user.sport_coached] };
  if (entity === 'training-logs') return { clause: 'user_email = ?', values: [user.email] };
  if (entity === 'team-memberships') {
    if (!user.profile_complete) return { clause: 'user_email = ?', values: [user.email] };
    return { clause: '(user_email = ? OR sport IN (SELECT sport FROM team_memberships WHERE user_email = ?))', values: [user.email, user.email] };
  }
  return { clause: 'sport IN (SELECT sport FROM team_memberships WHERE user_email = ?)', values: [user.email] };
}
function queryOptions(url, config, entity, user) {
  for (const key of url.searchParams.keys()) if (!['filter', 'sort', 'limit'].includes(key)) fail(400, `Unsupported query: ${key}`);
  let filter = {};
  if (url.searchParams.has('filter')) {
    try { filter = JSON.parse(url.searchParams.get('filter')); } catch { fail(400, 'Invalid filter'); }
    if (!filter || Array.isArray(filter) || typeof filter !== 'object') fail(400, 'Invalid filter');
  }
  const clauses = [], values = [];
  for (const [key, value] of Object.entries(filter)) {
    if (!config.filters.includes(key) || (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') || String(value).length > 300) fail(400, `Invalid filter field: ${key}`);
    // Availability may be public to authenticated users, but identities cannot be probed with an email filter.
    if (entity === 'venue-bookings' && !admin(user) && !(teacher(user) && filter.sport === user.sport_coached) && ((key === 'booked_by_email' && value !== user.email) || (key === 'user_id' && value !== user.id))) fail(403, 'Cannot filter other users outside your sport');
    clauses.push(`${key} = ?`); values.push(typeof value === 'boolean' ? Number(value) : value);
  }
  const rawSort = url.searchParams.get('sort') || '-created_at';
  const sort = rawSort.replace(/^-/, '').replace(/^created_date$/, 'created_at');
  if (!config.sorts.includes(sort)) fail(400, 'Invalid sort field');
  const rawLimit = url.searchParams.get('limit') || '100';
  if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 500) fail(400, 'Limit must be between 1 and 500');
  return { clauses, values, order: `${sort} ${rawSort.startsWith('-') ? 'DESC' : 'ASC'}`, limit: Number(rawLimit) };
}
async function insert(env, table, value) {
  const entries = Object.entries(value);
  await env.DB.prepare(`INSERT INTO ${table} (${entries.map(([key]) => key).join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`).bind(...entries.map(([, value]) => value)).run();
  return env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(value.id).first();
}
async function update(env, table, id, value) {
  const entries = Object.entries(value);
  await env.DB.prepare(`UPDATE ${table} SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`).bind(...entries.map(([, value]) => value), id).run();
  return env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
}

export async function updateProfile({ request, env, user, json }) {
  if (!user) fail(401, 'Sign in required');
  const value = await body(request);
  keys(value, ['full_name', 'grade', 'student_id', 'staff_id', 'profile_photo_url', 'role', 'profile_complete', 'sport_coached', 'teacher_status']);
  const updates = {};
  for (const field of ['full_name', 'student_id', 'staff_id']) if (value[field] !== undefined) updates[field] = textField(value[field], field, field === 'full_name' ? 100 : 80);
  if (value.grade !== undefined) updates.grade = choice(value.grade, ['7', '8', '9', '10', '11', '12'], 'grade');
  if (value.profile_photo_url !== undefined) {
    const photo = textField(value.profile_photo_url, 'profile_photo_url', 2048, false);
    if (photo && !/^https:\/\//i.test(photo) && !/^\/[^/\\]/.test(photo)) fail(400, 'Profile photos require an HTTPS or local URL');
    updates.profile_photo_url = photo;
  }
  const onboardingFields = ['role', 'profile_complete', 'sport_coached', 'teacher_status'];
  if (onboardingFields.some(field => value[field] !== undefined)) {
    // Role selection is a one-time onboarding choice; teacher access always waits for admin review.
    if (admin(user) || user.profile_complete || (user.role === 'teacher' && user.teacher_status === 'approved')) fail(403, 'Account permissions cannot be changed here');
    const selectedRole = value.role ?? user.role;
    choice(selectedRole, ['student', 'teacher'], 'role');
    if (user.role === 'teacher' && selectedRole !== 'teacher') fail(403, 'Teacher review cannot be bypassed');
    if (selectedRole === 'student') {
      if (value.teacher_status !== undefined || value.sport_coached !== undefined) fail(403, 'Teacher fields cannot be set on a student profile');
      if (value.profile_complete !== undefined && typeof value.profile_complete !== 'boolean') fail(400, 'Invalid profile_complete');
      if (value.profile_complete === true) {
        textField(updates.student_id ?? user.student_id, 'student_id', 80);
        choice(updates.grade ?? user.grade, ['7', '8', '9', '10', '11', '12'], 'grade');
      }
      updates.role = 'student';
      updates.profile_complete = value.profile_complete === true ? 1 : 0;
    } else {
      if (value.profile_complete !== undefined && value.profile_complete !== false) fail(403, 'Teacher approval is required to complete the profile');
      if (value.teacher_status !== undefined && value.teacher_status !== 'pending') fail(403, 'Teacher approval is managed by an administrator');
      updates.staff_id = textField(updates.staff_id ?? user.staff_id, 'staff_id', 80);
      updates.sport_coached = sport(value.sport_coached ?? user.sport_coached);
      updates.role = 'teacher';
      updates.profile_complete = 0;
      updates.teacher_status = 'pending';
    }
  }
  const entries = Object.entries(updates);
  if (!entries.length) fail(400, 'No profile fields supplied');
  if (user.role === 'teacher' || updates.role === 'teacher') {
    const pending = await env.DB.prepare("SELECT staff_id, sport_coached FROM teacher_registrations WHERE user_id = ? AND status = 'pending' LIMIT 1").bind(user.id).first();
    if (pending && (pending.staff_id !== (updates.staff_id ?? user.staff_id) || pending.sport_coached !== (updates.sport_coached ?? user.sport_coached))) fail(409, 'Your pending application cannot be changed while it is under review');
  }
  // A session snapshot may become stale while another request completes onboarding or approval.
  // Every profile write preserves that account state instead of overwriting newer permissions.
  const profileUpdate = env.DB.prepare(`UPDATE users SET ${entries.map(([key]) => `${key} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = ? AND profile_complete = ? AND teacher_status IS ?`).bind(...entries.map(([, value]) => value), user.id, user.role, Number(!!user.profile_complete), user.teacher_status);
  if (updates.role === 'teacher') {
    // The account must never become pending without a matching application for administrators.
    // Conditional insertion and synchronization also make retries reuse the pending request ID.
    const results = await env.DB.batch([
      profileUpdate,
      env.DB.prepare("INSERT INTO teacher_registrations (id, user_id, full_name, email, sport, user_email, user_name, staff_id, sport_coached, status) SELECT ?, id, full_name, email, sport_coached, email, full_name, staff_id, sport_coached, 'pending' FROM users WHERE id = ? AND role = 'teacher' AND teacher_status = 'pending' AND profile_complete = 0 AND NOT EXISTS (SELECT 1 FROM teacher_registrations WHERE user_id = ? AND status = 'pending')").bind(crypto.randomUUID(), user.id, user.id),
      env.DB.prepare("UPDATE teacher_registrations SET full_name = (SELECT full_name FROM users WHERE id = ?), user_name = (SELECT full_name FROM users WHERE id = ?) WHERE user_id = ? AND status = 'pending' AND EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'teacher' AND teacher_status = 'pending' AND profile_complete = 0)").bind(user.id, user.id, user.id, user.id),
    ]);
    if (!changed(results[0])) fail(409, 'Your account changed while the application was being submitted');
  } else {
    if (!changed(await profileUpdate.run())) fail(409, 'Your account changed while the profile was being saved');
  }
  return json(safeUser(await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first()));
}

async function createRegistration(env, user, value) {
  keys(value, ['user_email', 'user_name', 'user_id', 'staff_id', 'sport_coached', 'status']);
  identity(value, user, { user_id: 'id', user_email: 'email', user_name: 'full_name' });
  if (user.role !== 'teacher' || user.teacher_status === 'approved') fail(403, 'Teacher onboarding is required');
  if (value.status !== undefined && value.status !== 'pending') fail(403, 'Registration must await administrator approval');
  const staff = textField(value.staff_id ?? user.staff_id, 'staff_id', 80);
  const coachedSport = sport(value.sport_coached ?? user.sport_coached);
  if (staff !== user.staff_id || coachedSport !== user.sport_coached) fail(400, 'Registration must match your profile');
  const pending = await env.DB.prepare("SELECT * FROM teacher_registrations WHERE user_id = ? AND status = 'pending' LIMIT 1").bind(user.id).first();
  if (pending) {
    if (pending.staff_id !== staff || pending.sport_coached !== coachedSport || pending.user_email !== user.email) fail(409, 'Submit your updated teacher profile before retrying');
    return pending;
  }
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO teacher_registrations (id, user_id, full_name, email, sport, user_email, user_name, staff_id, sport_coached, status) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending' WHERE NOT EXISTS (SELECT 1 FROM teacher_registrations WHERE user_id = ? AND status = 'pending')").bind(id, user.id, user.full_name, user.email, coachedSport, user.email, user.full_name, staff, coachedSport, user.id),
    env.DB.prepare("UPDATE users SET teacher_status = 'pending', profile_complete = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'teacher' AND teacher_status != 'approved'").bind(user.id),
  ]);
  return env.DB.prepare("SELECT * FROM teacher_registrations WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1").bind(user.id).first();
}
async function reviewRegistration(env, user, row, value) {
  requireAdmin(user);
  keys(value, ['status', 'admin_comment']);
  choice(value.status, ['approved', 'rejected'], 'status');
  const comment = value.admin_comment === undefined ? '' : textField(value.admin_comment, 'admin_comment', 2000, false);
  if (row.status !== 'pending') fail(409, 'Registration has already been reviewed');
  const applicant = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(row.user_id).first();
  if (!applicant || applicant.role !== 'teacher' || applicant.profile_complete || applicant.teacher_status !== 'pending' || applicant.sport_coached !== row.sport_coached || applicant.staff_id !== row.staff_id) fail(409, 'The application no longer matches the account');
  const results = await env.DB.batch([
    env.DB.prepare("UPDATE teacher_registrations SET status = ?, admin_comment = ? WHERE id = ? AND status = 'pending' AND staff_id IS ? AND sport_coached IS ? AND EXISTS (SELECT 1 FROM users WHERE id = ? AND role = 'teacher' AND profile_complete = 0 AND teacher_status = 'pending' AND staff_id IS ? AND sport_coached IS ?)").bind(value.status, comment, row.id, row.staff_id, row.sport_coached, row.user_id, row.staff_id, row.sport_coached),
    env.DB.prepare("UPDATE users SET teacher_status = ?, profile_complete = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'teacher' AND profile_complete = 0 AND teacher_status = 'pending' AND staff_id IS ? AND sport_coached IS ? AND EXISTS (SELECT 1 FROM teacher_registrations WHERE id = ? AND status = ? AND staff_id IS ? AND sport_coached IS ?)").bind(value.status, value.status === 'approved' ? 1 : 0, row.user_id, row.staff_id, row.sport_coached, row.id, value.status, row.staff_id, row.sport_coached),
  ]);
  if (!changed(results[0]) || !changed(results[1])) fail(409, 'The application changed while it was being reviewed');
  const reviewed = await env.DB.prepare('SELECT * FROM teacher_registrations WHERE id = ?').bind(row.id).first();
  if (reviewed.status !== value.status) fail(409, 'Registration has already been reviewed');
  return reviewed;
}

async function createMembership(env, user, value) {
  keys(value, ['user_email', 'user_name', 'sport', 'role']);
  if (user.role !== 'student' && !admin(user)) fail(403, 'Only students can join a team');
  let member = user;
  if (admin(user) && value.user_email && value.user_email !== user.email) {
    member = await env.DB.prepare('SELECT id, email, full_name, role FROM users WHERE email = ?').bind(value.user_email).first();
    if (!member || member.role !== 'student') fail(400, 'A student account is required');
  } else identity(value, user, { user_email: 'email', user_name: 'full_name' });
  if (value.role !== undefined && value.role !== 'member') fail(403, 'Team role cannot be assigned here');
  const selectedSport = sport(value.sport);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO team_memberships (id, user_email, user_name, sport, role) SELECT ?, ?, ?, ?, 'member' WHERE NOT EXISTS (SELECT 1 FROM team_memberships WHERE user_email = ? AND sport = ?)").bind(id, member.email, member.full_name, selectedSport, member.email, selectedSport).run();
  return env.DB.prepare('SELECT * FROM team_memberships WHERE user_email = ? AND sport = ? ORDER BY created_at LIMIT 1').bind(member.email, selectedSport).first();
}
function trainingValue(value, user, previous = null) {
  keys(value, ['user_email', 'user_name', 'sport', 'date', 'duration', 'session_type', 'notes', 'data']);
  identity(value, user, { user_email: 'email', user_name: 'full_name' });
  const merged = { ...(previous || {}), ...value };
  const selectedSport = sport(merged.sport);
  dateField(merged.date);
  if (typeof merged.duration !== 'number' || !Number.isFinite(merged.duration) || merged.duration <= 0 || merged.duration > 1440) fail(400, 'Duration must be between 0 and 1440 minutes');
  const session = merged.session_type || '';
  if (session) choice(session, SESSIONS[selectedSport], 'session_type');
  const notes = textField(merged.notes ?? '', 'notes', 5000, false);
  let data = merged.data ?? {};
  if (previous && typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
  if (!data || Array.isArray(data) || typeof data !== 'object') fail(400, 'Invalid training data');
  for (const [key, field] of Object.entries(data)) if (!METRICS[selectedSport].includes(key) || typeof field !== 'number' || !Number.isFinite(field) || field < 0 || field > 10000000) fail(400, `Invalid training metric: ${key}`);
  return { user_email: user.email, user_name: user.full_name, sport: selectedSport, date: merged.date, duration: merged.duration, session_type: session, notes, data: JSON.stringify(data) };
}
function announcementValue(value, user, previous = null) {
  keys(value, ['teacher_email', 'teacher_name', 'sport', 'title', 'content', 'priority']);
  identity(value, user, { teacher_email: 'email', teacher_name: 'full_name' });
  const merged = { ...(previous || {}), ...value };
  return { teacher_email: user.email, teacher_name: user.full_name, sport: sport(merged.sport), title: textField(merged.title, 'title', 200), content: textField(merged.content, 'content', 10000), priority: choice(merged.priority ?? 'normal', ['normal', 'important', 'urgent'], 'priority') };
}

async function createBooking(env, user, value) {
  keys(value, ['booked_by_email', 'booked_by_name', 'user_id', 'sport', 'venue', 'date', 'time_slot', 'duration', 'purpose', 'status']);
  identity(value, user, { booked_by_email: 'email', booked_by_name: 'full_name', user_id: 'id' });
  if (value.status !== undefined && value.status !== 'pending') fail(403, 'Bookings must await approval');
  const selectedSport = sport(value.sport);
  await sportAccess(env, user, selectedSport);
  if (!VENUES[selectedSport]?.includes(value.venue)) fail(400, 'Invalid venue for this sport');
  dateField(value.date);
  // The booking UI uses the school's calendar date (Asia/Shanghai), independent of Worker location.
  const schoolToday = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const finalDate = new Date(Date.parse(`${schoolToday}T00:00:00Z`) + 13 * 86400000).toISOString().slice(0, 10);
  if (value.date < schoolToday || value.date > finalDate) fail(400, 'Bookings must be within the next 14 days');
  if (typeof value.time_slot !== 'string' || !/^(0[7-9]|1\d|2[01]):(00|30)$/.test(value.time_slot)) fail(400, 'Invalid time slot');
  choice(value.duration, [30, 60, 90, 120], 'duration');
  choice(value.purpose, ['practice', 'team_session', 'match'], 'purpose');
  const start = Number(value.time_slot.slice(0, 2)) * 60 + Number(value.time_slot.slice(3));
  const end = start + value.duration;
  if (end > 22 * 60) fail(400, 'Booking must finish by 22:00');
  const endTime = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  const id = crypto.randomUUID();
  // One conditional statement prevents concurrent clients from reserving overlapping slots.
  const result = await env.DB.prepare("INSERT INTO venue_bookings (id, user_id, user_name, venue_name, booking_date, start_time, end_time, purpose, status, booked_by_email, booked_by_name, sport, venue, date, time_slot, duration) SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM venue_bookings WHERE venue = ? AND date = ? AND status IN ('pending', 'approved') AND (CAST(substr(time_slot, 1, 2) AS INTEGER) * 60 + CAST(substr(time_slot, 4, 2) AS INTEGER)) < ? AND (CAST(substr(time_slot, 1, 2) AS INTEGER) * 60 + CAST(substr(time_slot, 4, 2) AS INTEGER) + duration) > ?)")
    .bind(id, user.id, user.full_name, value.venue, value.date, value.time_slot, endTime, value.purpose, user.email, user.full_name, selectedSport, value.venue, value.date, value.time_slot, value.duration, value.venue, value.date, end, start).run();
  if (!changed(result)) fail(409, 'This venue is already booked for that time');
  return env.DB.prepare('SELECT * FROM venue_bookings WHERE id = ?').bind(id).first();
}
async function reviewBooking(env, user, row, value) {
  if (!admin(user) && !(teacher(user) && row.sport === user.sport_coached)) fail(403, 'Only this sport’s coach or an administrator can review bookings');
  keys(value, ['status', 'teacher_comment']);
  choice(value.status, ['approved', 'rejected'], 'status');
  const comment = textField(value.teacher_comment ?? '', 'teacher_comment', 2000, false);
  if (row.status !== 'pending') fail(409, 'Booking has already been reviewed');
  const result = await env.DB.prepare("UPDATE venue_bookings SET status = ?, teacher_comment = ? WHERE id = ? AND status = 'pending'").bind(value.status, comment, row.id).run();
  if (!changed(result)) fail(409, 'Booking has already been reviewed');
  return env.DB.prepare('SELECT * FROM venue_bookings WHERE id = ?').bind(row.id).first();
}

async function leaderboard({ env, user, url, json }) {
  ready(user);
  for (const key of url.searchParams.keys()) if (!['sport', 'month'].includes(key)) fail(400, `Unsupported query: ${key}`);
  const selectedSport = sport(url.searchParams.get('sport'));
  await sportAccess(env, user, selectedSport);
  const month = url.searchParams.get('month');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) fail(400, 'Invalid month');
  const members = await rows(env.DB.prepare('SELECT user_email, user_name FROM team_memberships WHERE sport = ?').bind(selectedSport));
  const data = await rows(env.DB.prepare('SELECT user_email, user_name, data FROM training_logs WHERE sport = ? AND date >= ? AND date < ?').bind(selectedSport, `${month}-01`, `${month}-32`));
  const byMember = new Map(members.map(member => [member.user_email, { user_email: member.user_email, user_name: member.user_name, score: 0, sessions: 0 }]));
  const scoringKey = { Rowing: 'distance', Football: 'distance_ran', 'Table Tennis': 'rally_sets', 'Ultimate Frisbee': 'throws_completed', 'Billiards Club': 'frames_won' }[selectedSport];
  for (const log of data) {
    if (!byMember.has(log.user_email)) continue;
    const entry = byMember.get(log.user_email);
    let metrics = {}; try { const parsed = JSON.parse(log.data || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) metrics = parsed; } catch { /* A malformed legacy entry has no score. */ }
    const metric = scoringKey ? Number(metrics[scoringKey] || 0) : 1;
    entry.score += Number.isFinite(metric) && metric >= 0 ? metric : 0;
    entry.sessions++;
  }
  return json([...byMember.values()].sort((a, b) => b.score - a.score || String(a.user_name || '').localeCompare(String(b.user_name || ''))).map((entry, index) => ({ ...entry, rank: index + 1 })));
}

export async function handleEntityRequest({ request, env, url, path, method, user, json }) {
  if (path === '/training-leaderboard') {
    if (!user) fail(401, 'Sign in required');
    if (method !== 'GET') fail(405, 'Method not allowed');
    return leaderboard({ env, user, url, json });
  }
  const match = /^\/([^/]+)(?:\/([^/]+))?\/?$/.exec(path);
  const entity = match?.[1], config = Object.hasOwn(ENTITIES, entity) ? ENTITIES[entity] : null;
  if (!config) return null;
  if (!user) fail(401, 'Sign in required');
  const id = match[2] || null;
  if (id && (id.length > 100 || !/^[A-Za-z0-9_-]+$/.test(id))) fail(400, 'Invalid ID');
  // Own registration and student membership setup remain accessible during onboarding.
  const onboarding = entity === 'teacher-registrations' || (entity === 'team-memberships' && user.role === 'student');
  if (!onboarding) ready(user);
  if (entity === 'team-memberships' && user.profile_complete) ready(user);
  if (entity === 'users') requireAdmin(user);
  if (method === 'GET') {
    const scope = readScope(entity, user);
    const query = queryOptions(url, config, entity, user);
    const clauses = [scope.clause, ...query.clauses];
    const values = [...scope.values, ...query.values];
    if (id) { clauses.push('id = ?'); values.push(id); }
    const fields = entity === 'users' ? USER_FIELDS.join(', ') : entity === 'team-memberships' ? 'id, user_email, user_name, sport, role, created_at' : '*';
    const results = await rows(env.DB.prepare(`SELECT ${fields} FROM ${config.table} WHERE ${clauses.map(clause => `(${clause})`).join(' AND ')} ORDER BY ${query.order} LIMIT ?`).bind(...values, id ? 1 : query.limit));
    if (id) return results[0] ? json(serialize(results[0], entity, user)) : fail(404, 'Not found');
    return json(results.map(row => serialize(row, entity, user)));
  }
  if (!['POST', 'PATCH', 'DELETE'].includes(method)) fail(405, 'Method not allowed');
  if ((method === 'POST' && id) || (method !== 'POST' && !id)) fail(405, 'Method not allowed');
  if (method === 'POST') {
    const value = await body(request);
    let created;
    if (entity === 'teacher-registrations') created = await createRegistration(env, user, value);
    else if (entity === 'team-memberships') created = await createMembership(env, user, value);
    else if (entity === 'venue-bookings') created = await createBooking(env, user, value);
    else if (entity === 'training-logs') {
      if (user.role !== 'student') fail(403, 'Only students can create their own training logs');
      const fields = trainingValue(value, user);
      await sportAccess(env, user, fields.sport);
      created = await insert(env, config.table, { id: crypto.randomUUID(), ...fields });
    } else if (entity === 'announcements') {
      if (!teacher(user) && !admin(user)) fail(403, 'Coach access required');
      const fields = announcementValue(value, user);
      await sportAccess(env, user, fields.sport);
      created = await insert(env, config.table, { id: crypto.randomUUID(), ...fields });
    } else fail(405, 'Method not allowed');
    return json(serialize(created, entity, user), 201);
  }
  const row = await env.DB.prepare(`SELECT * FROM ${config.table} WHERE id = ?`).bind(id).first();
  if (!row) fail(404, 'Not found');
  if (method === 'PATCH') {
    const value = await body(request);
    let updated;
    if (entity === 'teacher-registrations') updated = await reviewRegistration(env, user, row, value);
    else if (entity === 'venue-bookings') updated = await reviewBooking(env, user, row, value);
    else if (entity === 'users') {
      requireAdmin(user);
      keys(value, ['full_name', 'grade', 'student_id', 'staff_id', 'profile_photo_url']);
      // Reuse the self-profile validators, with no account permission fields accepted.
      return updateProfile({ request: new Request(request.url, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) }), env, user: row, json });
    } else if (entity === 'training-logs') {
      if (user.role !== 'student' || !own(user, row)) fail(403, 'You can only edit your own training logs');
      const fields = trainingValue(value, user, row);
      if (fields.sport !== row.sport) fail(403, 'Training sport cannot be changed');
      await sportAccess(env, user, fields.sport);
      updated = await update(env, config.table, id, fields);
    } else if (entity === 'announcements') {
      if (!admin(user) && !(teacher(user) && row.sport === user.sport_coached && own(user, row, 'teacher_email'))) fail(403, 'You can only edit your own team announcements');
      const fields = announcementValue(value, user, row);
      await sportAccess(env, user, fields.sport);
      updated = await update(env, config.table, id, fields);
    } else fail(405, 'Method not allowed');
    return json(serialize(updated, entity, user));
  }
  if (entity === 'team-memberships') {
    if (!admin(user) && !(user.role === 'student' && own(user, row))) fail(403, 'You can only leave your own teams');
  } else if (entity === 'training-logs') {
    if (!admin(user) && !(user.role === 'student' && own(user, row))) fail(403, 'You can only delete your own training logs');
  } else if (entity === 'announcements') {
    if (!admin(user) && !(teacher(user) && row.sport === user.sport_coached && own(user, row, 'teacher_email'))) fail(403, 'You can only delete your own team announcements');
  } else if (entity === 'venue-bookings') {
    if (!admin(user) && !((row.user_id === user.id || own(user, row, 'booked_by_email')) && row.status === 'pending')) fail(403, 'You can only cancel your own pending booking');
  } else fail(405, 'Method not allowed');
  if (entity === 'venue-bookings' && !admin(user)) {
    const deleted = await env.DB.prepare("DELETE FROM venue_bookings WHERE id = ? AND status = 'pending' AND (user_id = ? OR booked_by_email = ?)").bind(id, user.id, user.email).run();
    if (!changed(deleted)) fail(409, 'The booking changed before it could be cancelled');
  } else {
    await env.DB.prepare(`DELETE FROM ${config.table} WHERE id = ?`).bind(id).run();
  }
  return json({ success: true });
}
