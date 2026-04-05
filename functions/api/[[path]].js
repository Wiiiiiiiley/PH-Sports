export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    const method = request.method;

    // Helper for JSON responses
    const jsonResponse = (data, status = 200) => {
        const body = data === null ? '' : JSON.stringify(data);
        return new Response(body, {
            status,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Auth-Token',
            }
        });
    };

    if (method === 'OPTIONS') {
        return jsonResponse(null);
    }

    try {
        const ADMIN_EMAIL = 'admin@sportsync.edu';
        const SESSION_TTL_DAYS = 14;

        const readJsonBody = async () => {
            try {
                return await request.json();
            } catch {
                return null;
            }
        };

        const getBearerToken = () => {
            const auth = request.headers.get('Authorization') || '';
            const match = auth.match(/^Bearer\s+(.+)$/i);
            if (match) return match[1];
            
            // Fallback to custom header or query param
            return request.headers.get('X-Auth-Token') || url.searchParams.get('token');
        };

        const sha256Hex = async (data) => {
            const bytes = new TextEncoder().encode(data);
            const digest = await crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
        };

        const createPasswordHash = async (password) => {
            const salt = crypto.randomUUID();
            const hash = await sha256Hex(`${salt}:${password}`);
            return { salt, hash };
        };

        const verifyPassword = async (password, salt, hash) => {
            const actual = await sha256Hex(`${salt}:${password}`);
            return actual === hash;
        };

        const createSession = async (userId) => {
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
            await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
                .bind(token, userId, expiresAt)
                .run();
            return { token, expires_at: expiresAt };
        };

        const deleteSession = async (token) => {
            await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
        };

        const getUserBySession = async () => {
            const token = getBearerToken();
            if (!token) return { error: 'No authorization token found in request headers' };
            
            const session = await env.DB.prepare('SELECT * FROM sessions WHERE token = ?').bind(token).first();
            if (!session) return { error: `Session not found for token: ${token.slice(0, 8)}...` };
            
            if (new Date(session.expires_at).getTime() <= Date.now()) {
                await deleteSession(token);
                return { error: 'Session has expired' };
            }
            
            const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first();
            if (!user) return { error: 'User associated with this session no longer exists' };
            
            return { token, user };
        };

        const requireAuth = async () => {
            const result = await getUserBySession();
            if (result.error) {
                console.error('Auth check failed:', result.error);
                return { error: jsonResponse({ error: result.error }, 401) };
            }
            return { token: result.token, user: result.user };
        };

        const ensureAdminSeed = async () => {
            let admin = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(ADMIN_EMAIL).first();
            if (admin) return admin;
            const defaultPassword = (env && env.ADMIN_PASSWORD) ? env.ADMIN_PASSWORD : 'admin12345';
            const { salt, hash } = await createPasswordHash(defaultPassword);
            const id = crypto.randomUUID();
            await env.DB.prepare(
                'INSERT INTO users (id, email, full_name, password_hash, password_salt, role, profile_complete, teacher_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(id, ADMIN_EMAIL, 'System Admin', hash, salt, 'admin', 1, 'approved').run();
            admin = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(ADMIN_EMAIL).first();
            return admin;
        };

        const sanitizeUser = (u) => {
            if (!u) return u;
            const { password_hash, password_salt, ...safe } = u;
            return safe;
        };

        const parseWhere = (raw) => {
            if (!raw) return null;
            try {
                if (typeof raw === 'string') return JSON.parse(raw);
                return raw;
            } catch {
                return null;
            }
        };

        const buildWhereClause = (where, allowedColumns) => {
            if (!where || typeof where !== 'object') return { sql: '', bindings: [] };
            const clauses = [];
            const bindings = [];
            for (const [key, value] of Object.entries(where)) {
                if (!allowedColumns.includes(key)) continue;
                if (value === undefined) continue;
                clauses.push(`${key} = ?`);
                bindings.push(value);
            }
            if (clauses.length === 0) return { sql: '', bindings: [] };
            return { sql: `WHERE ${clauses.join(' AND ')}`, bindings };
        };

        const buildOrderLimit = (sort, limit, allowedSortColumns) => {
            let orderSql = 'ORDER BY created_at DESC';
            if (typeof sort === 'string' && sort.length > 0) {
                const desc = sort.startsWith('-');
                const col = desc ? sort.slice(1) : sort;
                if (allowedSortColumns.includes(col)) {
                    orderSql = `ORDER BY ${col} ${desc ? 'DESC' : 'ASC'}`;
                }
            }
            const lim = Math.min(Math.max(parseInt(limit || '0', 10) || 0, 0), 1000);
            const limitSql = lim > 0 ? `LIMIT ${lim}` : '';
            return `${orderSql} ${limitSql}`.trim();
        };

        await ensureAdminSeed();

        // --- AUTH ROUTES ---
        if (path === '/auth/register' && method === 'POST') {
            const body = await readJsonBody();
            if (!body || !body.email || !body.password) {
                return jsonResponse({ error: 'email and password required' }, 400);
            }
            const email = String(body.email).trim().toLowerCase();
            const fullName = body.full_name ? String(body.full_name).trim() : null;

            if (email === ADMIN_EMAIL) {
                return jsonResponse({ error: 'Admin account cannot be registered' }, 403);
            }

            const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
            if (existing) {
                return jsonResponse({ error: 'Email already registered' }, 409);
            }

            const { salt, hash } = await createPasswordHash(String(body.password));
            const id = crypto.randomUUID();
            await env.DB.prepare(
                'INSERT INTO users (id, email, full_name, password_hash, password_salt, role, profile_complete, teacher_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(id, email, fullName, hash, salt, 'student', 0, 'approved').run();

            const { token } = await createSession(id);
            const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
            return jsonResponse({ token, user: sanitizeUser(user) });
        }

        if (path === '/auth/login' && method === 'POST') {
            const body = await readJsonBody();
            if (!body || !body.email || !body.password) {
                return jsonResponse({ error: 'email and password required' }, 400);
            }
            const email = String(body.email).trim().toLowerCase();
            const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
            if (!user || !user.password_hash || !user.password_salt) {
                return jsonResponse({ error: 'Invalid email or password' }, 401);
            }
            const ok = await verifyPassword(String(body.password), user.password_salt, user.password_hash);
            if (!ok) {
                return jsonResponse({ error: 'Invalid email or password' }, 401);
            }
            const { token } = await createSession(user.id);
            return jsonResponse({ token, user: sanitizeUser(user) });
        }

        if (path === '/auth/logout' && method === 'POST') {
            const token = getBearerToken();
            if (token) {
                await deleteSession(token);
            }
            return jsonResponse({ success: true });
        }

        if (path === '/auth/me') {
            const auth = await requireAuth();
            if (auth.error) return auth.error;

            if (method === 'GET') {
                return jsonResponse(sanitizeUser(auth.user));
            }

            if (method === 'PATCH') {
                const body = await readJsonBody();
                if (!body || typeof body !== 'object') {
                    return jsonResponse({ error: 'Invalid body' }, 400);
                }

                const allowed = [
                    'full_name',
                    'profile_complete',
                    'sport_coached',
                    'staff_id',
                    'student_id',
                    'grade',
                    'role',
                    'teacher_status'
                ];

                const updates = {};
                for (const key of allowed) {
                    if (Object.prototype.hasOwnProperty.call(body, key)) {
                        updates[key] = body[key];
                    }
                }

                if (Object.prototype.hasOwnProperty.call(updates, 'role') || Object.prototype.hasOwnProperty.call(updates, 'teacher_status')) {
                    const isAdmin = auth.user.role === 'admin' || auth.user.email === ADMIN_EMAIL;
                    if (!isAdmin) {
                        delete updates.role;
                        delete updates.teacher_status;
                    }
                }

                const keys = Object.keys(updates);
                if (keys.length === 0) {
                    return jsonResponse(sanitizeUser(auth.user));
                }
                const setSql = keys.map(k => `${k} = ?`).join(', ');
                const values = keys.map(k => updates[k]);
                await env.DB.prepare(`UPDATE users SET ${setSql}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, auth.user.id).run();
                const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(auth.user.id).first();
                return jsonResponse(sanitizeUser(user));
            }

            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        // --- ENTITY ROUTES (RBAC) ---
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const currentUser = auth.user;
        const isAdmin = currentUser.role === 'admin' || currentUser.email === ADMIN_EMAIL;
        const isTeacher = currentUser.role === 'teacher';

        const entityMap = {
            '/users': 'users',
            '/teacher-registrations': 'teacher_registrations',
            '/venue-bookings': 'venue_bookings',
            '/announcements': 'announcements',
            '/team-memberships': 'team_memberships',
            '/teams': 'teams',
            '/training-logs': 'training_logs'
        };

        const matched = Object.entries(entityMap).find(([p]) => path === p || path.startsWith(p + '/'));
        if (!matched) {
            return jsonResponse({ error: 'Endpoint not found', path }, 404);
        }

        const [basePath, tableName] = matched;
        const idPart = path.startsWith(basePath + '/') ? path.slice(basePath.length + 1) : null;
        const id = idPart && idPart.length > 0 ? idPart : null;

        const queryWhere = parseWhere(url.searchParams.get('where'));
        const sort = url.searchParams.get('sort');
        const limit = url.searchParams.get('limit');

        const listEntity = async ({ allowedWhereColumns, allowedSortColumns, forcedWhere }) => {
            const where = { ...(queryWhere || {}), ...(forcedWhere || {}) };
            const { sql, bindings } = buildWhereClause(where, allowedWhereColumns);
            const orderLimit = buildOrderLimit(sort, limit, allowedSortColumns);
            const stmt = env.DB.prepare(`SELECT * FROM ${tableName} ${sql} ${orderLimit}`.trim());
            const { results } = await stmt.bind(...bindings).all();
            return jsonResponse(results);
        };

        const getEntity = async ({ allowedWhereColumns, forcedWhere }) => {
            if (!id) return jsonResponse({ error: 'Not found' }, 404);
            const where = { id, ...(forcedWhere || {}) };
            const { sql, bindings } = buildWhereClause(where, allowedWhereColumns);
            const result = await env.DB.prepare(`SELECT * FROM ${tableName} ${sql}`).bind(...bindings).first();
            return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
        };

        const createEntity = async (data, allowedInsertColumns, forcedInsert) => {
            if (!data || typeof data !== 'object') return jsonResponse({ error: 'Invalid body' }, 400);
            const idToUse = crypto.randomUUID();
            const row = { ...(data || {}), ...(forcedInsert || {}), id: idToUse };
            const keys = Object.keys(row).filter(k => allowedInsertColumns.includes(k));
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => {
                if (k === 'data' && typeof row[k] === 'object' && row[k] !== null) return JSON.stringify(row[k]);
                return row[k];
            });
            await env.DB.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`).bind(...values).run();
            const created = await env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).bind(idToUse).first();
            return jsonResponse(created || { id: idToUse });
        };

        const updateEntity = async (data, allowedUpdateColumns, forcedWhere, forcedUpdate) => {
            if (!id) return jsonResponse({ error: 'Not found' }, 404);
            if (!data || typeof data !== 'object') return jsonResponse({ error: 'Invalid body' }, 400);
            const updates = { ...(data || {}), ...(forcedUpdate || {}) };
            const keys = Object.keys(updates).filter(k => allowedUpdateColumns.includes(k));
            if (keys.length === 0) return jsonResponse({ error: 'No updatable fields' }, 400);
            const setSql = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => updates[k]);
            const where = { id, ...(forcedWhere || {}) };
            const whereKeys = Object.keys(where);
            const whereSql = whereKeys.map(k => `${k} = ?`).join(' AND ');
            const whereValues = whereKeys.map(k => where[k]);
            await env.DB.prepare(`UPDATE ${tableName} SET ${setSql} WHERE ${whereSql}`)
                .bind(...values, ...whereValues)
                .run();
            const updated = await env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).bind(id).first();
            return jsonResponse(updated || { id });
        };

        const deleteEntity = async (forcedWhere) => {
            if (!id) return jsonResponse({ error: 'Not found' }, 404);
            const where = { id, ...(forcedWhere || {}) };
            const whereKeys = Object.keys(where);
            const whereSql = whereKeys.map(k => `${k} = ?`).join(' AND ');
            const whereValues = whereKeys.map(k => where[k]);
            await env.DB.prepare(`DELETE FROM ${tableName} WHERE ${whereSql}`).bind(...whereValues).run();
            return jsonResponse({ success: true });
        };

        if (tableName === 'users') {
            if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
            if (method === 'GET' && !id) {
                const { results } = await env.DB.prepare('SELECT id, email, full_name, role, sport_coached, staff_id, student_id, grade, profile_complete, teacher_status, created_at, updated_at FROM users ORDER BY created_at DESC').all();
                return jsonResponse(results);
            }
            if (method === 'GET' && id) {
                const user = await env.DB.prepare('SELECT id, email, full_name, role, sport_coached, staff_id, student_id, grade, profile_complete, teacher_status, created_at, updated_at FROM users WHERE id = ?').bind(id).first();
                return user ? jsonResponse(user) : jsonResponse({ error: 'Not found' }, 404);
            }
            if (method === 'PATCH' && id) {
                const body = await readJsonBody();
                return updateEntity(body, ['full_name', 'role', 'sport_coached', 'staff_id', 'student_id', 'grade', 'profile_complete', 'teacher_status'], null, null);
            }
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        if (tableName === 'teacher_registrations') {
            if (method === 'GET') {
                if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
                if (id) return getEntity({ allowedWhereColumns: ['id'], forcedWhere: null });
                return listEntity({
                    allowedWhereColumns: ['id', 'user_email', 'user_name', 'staff_id', 'sport_coached', 'status'],
                    allowedSortColumns: ['created_at'],
                    forcedWhere: null
                });
            }

            if (method === 'POST') {
                if (isAdmin) return jsonResponse({ error: 'Admins do not apply for teacher role' }, 403);
                const body = await readJsonBody();
                const sportCoached = body && body.sport_coached ? String(body.sport_coached) : currentUser.sport_coached;
                const staffId = body && body.staff_id ? String(body.staff_id) : currentUser.staff_id;
                if (!sportCoached || !staffId) {
                    return jsonResponse({ error: 'sport_coached and staff_id required' }, 400);
                }

                await env.DB.prepare('UPDATE users SET role = ?, teacher_status = ?, sport_coached = ?, staff_id = ?, profile_complete = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .bind('teacher', 'pending', sportCoached, staffId, 0, currentUser.id)
                    .run();

                return createEntity(
                    body,
                    ['id', 'user_email', 'user_name', 'staff_id', 'sport_coached', 'status', 'admin_comment', 'created_at'],
                    {
                        user_email: currentUser.email,
                        user_name: currentUser.full_name,
                        staff_id: staffId,
                        sport_coached: sportCoached,
                        status: 'pending'
                    }
                );
            }

            if (method === 'PATCH' && id) {
                if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
                const body = await readJsonBody();

                const reg = await env.DB.prepare('SELECT * FROM teacher_registrations WHERE id = ?').bind(id).first();
                if (!reg) return jsonResponse({ error: 'Not found' }, 404);

                const nextStatus = body && body.status ? String(body.status) : null;
                if (!nextStatus) return jsonResponse({ error: 'status required' }, 400);

                await updateEntity(body, ['status', 'admin_comment'], null, null);

                if (nextStatus === 'approved') {
                    await env.DB.prepare('UPDATE users SET role = ?, teacher_status = ?, profile_complete = ?, sport_coached = ?, staff_id = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?')
                        .bind('teacher', 'approved', 1, reg.sport_coached, reg.staff_id, reg.user_email)
                        .run();
                }
                if (nextStatus === 'rejected') {
                    await env.DB.prepare('UPDATE users SET teacher_status = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?')
                        .bind('rejected', reg.user_email)
                        .run();
                }

                const updated = await env.DB.prepare('SELECT * FROM teacher_registrations WHERE id = ?').bind(id).first();
                return jsonResponse(updated);
            }

            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        if (tableName === 'training_logs') {
            if (method === 'GET') {
                if (id) {
                    if (isAdmin) return getEntity({ allowedWhereColumns: ['id'], forcedWhere: null });
                    if (isTeacher) return getEntity({ allowedWhereColumns: ['id', 'sport'], forcedWhere: { sport: currentUser.sport_coached } });
                    return getEntity({ allowedWhereColumns: ['id', 'user_email'], forcedWhere: { user_email: currentUser.email } });
                }

                if (isAdmin) {
                    return listEntity({
                        allowedWhereColumns: ['id', 'user_email', 'user_name', 'sport', 'date'],
                        allowedSortColumns: ['created_at', 'date'],
                        forcedWhere: null
                    });
                }
                if (isTeacher) {
                    return listEntity({
                        allowedWhereColumns: ['id', 'sport', 'date'],
                        allowedSortColumns: ['created_at', 'date'],
                        forcedWhere: { sport: currentUser.sport_coached }
                    });
                }
                return listEntity({
                    allowedWhereColumns: ['id', 'user_email', 'sport', 'date'],
                    allowedSortColumns: ['created_at', 'date'],
                    forcedWhere: { user_email: currentUser.email }
                });
            }

            if (method === 'POST') {
                if (isTeacher && !isAdmin) {
                    return jsonResponse({ error: 'Forbidden' }, 403);
                }
                const body = await readJsonBody();
                if (!body || !body.sport) return jsonResponse({ error: 'sport required' }, 400);
                const sport = String(body.sport);
                if (!isAdmin) {
                    const member = await env.DB.prepare('SELECT * FROM team_memberships WHERE user_email = ? AND sport = ?').bind(currentUser.email, sport).first();
                    if (!member) return jsonResponse({ error: 'Not a member of this sport team' }, 403);
                }

                return createEntity(
                    body,
                    ['id', 'user_email', 'user_name', 'sport', 'date', 'duration', 'session_type', 'intensity', 'notes', 'data', 'created_at'],
                    {
                        user_email: currentUser.email,
                        user_name: currentUser.full_name,
                        sport
                    }
                );
            }

            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        if (tableName === 'venue_bookings') {
            if (method === 'GET') {
                if (id) {
                    if (isAdmin) return getEntity({ allowedWhereColumns: ['id'], forcedWhere: null });
                    if (isTeacher) return getEntity({ allowedWhereColumns: ['id', 'sport'], forcedWhere: { sport: currentUser.sport_coached } });
                    return getEntity({ allowedWhereColumns: ['id'], forcedWhere: null });
                }
                if (isAdmin) {
                    return listEntity({
                        allowedWhereColumns: ['id', 'sport', 'date', 'status', 'booked_by_email'],
                        allowedSortColumns: ['created_at', 'date'],
                        forcedWhere: null
                    });
                }
                if (isTeacher) {
                    return listEntity({
                        allowedWhereColumns: ['id', 'sport', 'date', 'status'],
                        allowedSortColumns: ['created_at', 'date'],
                        forcedWhere: { sport: currentUser.sport_coached }
                    });
                }
                return listEntity({
                    allowedWhereColumns: ['id', 'sport', 'date', 'status'],
                    allowedSortColumns: ['created_at', 'date'],
                    forcedWhere: null
                });
            }

            if (method === 'POST') {
                if (isTeacher && !isAdmin) {
                    return jsonResponse({ error: 'Only students can create booking requests' }, 403);
                }
                const body = await readJsonBody();
                if (!body || !body.sport || !body.venue || !body.date || !body.time_slot) {
                    return jsonResponse({ error: 'sport, venue, date, time_slot required' }, 400);
                }
                const sport = String(body.sport);
                const member = await env.DB.prepare('SELECT * FROM team_memberships WHERE user_email = ? AND sport = ?').bind(currentUser.email, sport).first();
                if (!member) return jsonResponse({ error: 'Not a member of this sport team' }, 403);

                return createEntity(
                    body,
                    ['id', 'booked_by_email', 'booked_by_name', 'sport', 'venue', 'date', 'time_slot', 'duration', 'purpose', 'status', 'teacher_comment', 'created_at', 'updated_at'],
                    {
                        booked_by_email: currentUser.email,
                        booked_by_name: body.booked_by_name || currentUser.full_name,
                        status: 'pending'
                    }
                );
            }

            if (method === 'PATCH' && id) {
                const body = await readJsonBody();
                const booking = await env.DB.prepare('SELECT * FROM venue_bookings WHERE id = ?').bind(id).first();
                if (!booking) return jsonResponse({ error: 'Not found' }, 404);

                if (isAdmin) {
                    return updateEntity(body, ['status', 'teacher_comment'], null, null);
                }

                if (isTeacher) {
                    if (booking.sport !== currentUser.sport_coached) return jsonResponse({ error: 'Forbidden' }, 403);
                    return updateEntity(body, ['status', 'teacher_comment'], { sport: currentUser.sport_coached }, null);
                }

                return jsonResponse({ error: 'Forbidden' }, 403);
            }

            if (method === 'DELETE' && id) {
                if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
                return deleteEntity(null);
            }

            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        // Remaining entities: basic access rules
        if (tableName === 'team_memberships') {
            if (method === 'GET') {
                if (isAdmin) {
                    return listEntity({
                        allowedWhereColumns: ['id', 'user_email', 'sport'],
                        allowedSortColumns: ['created_at'],
                        forcedWhere: null
                    });
                }
                if (isTeacher) {
                    return listEntity({
                        allowedWhereColumns: ['id', 'sport'],
                        allowedSortColumns: ['created_at'],
                        forcedWhere: { sport: currentUser.sport_coached }
                    });
                }
                return listEntity({
                    allowedWhereColumns: ['id', 'user_email', 'sport'],
                    allowedSortColumns: ['created_at'],
                    forcedWhere: { user_email: currentUser.email }
                });
            }
            if (method === 'POST') {
                if (isTeacher && !isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
                const body = await readJsonBody();
                if (!body || !body.sport) return jsonResponse({ error: 'sport required' }, 400);
                return createEntity(body, ['id', 'user_email', 'user_name', 'sport', 'role', 'created_at'], {
                    user_email: currentUser.email,
                    user_name: currentUser.full_name,
                });
            }
            if (method === 'DELETE' && id) {
                if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
                return deleteEntity(null);
            }
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        if (tableName === 'announcements') {
            if (method === 'GET') {
                return listEntity({
                    allowedWhereColumns: ['id', 'sport', 'teacher_email', 'teacher_name', 'priority'],
                    allowedSortColumns: ['created_at'],
                    forcedWhere: null
                });
            }
            if (method === 'POST') {
                if (!isTeacher && !isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
                const body = await readJsonBody();
                if (!body || !body.title || !body.content || !body.sport) {
                    return jsonResponse({ error: 'title, content, sport required' }, 400);
                }
                if (!isAdmin && body.sport !== currentUser.sport_coached) return jsonResponse({ error: 'Forbidden' }, 403);
                return createEntity(body, ['id', 'teacher_email', 'teacher_name', 'sport', 'title', 'content', 'priority', 'created_at'], {
                    teacher_email: currentUser.email,
                    teacher_name: currentUser.full_name,
                });
            }
            if (method === 'DELETE' && id) {
                if (!isAdmin) return jsonResponse({ error: 'Forbidden' }, 403);
                return deleteEntity(null);
            }
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        if (tableName === 'teams') {
            if (method === 'GET') {
                return listEntity({
                    allowedWhereColumns: ['id', 'sport', 'coach_id', 'name'],
                    allowedSortColumns: ['created_at'],
                    forcedWhere: null
                });
            }
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        return jsonResponse({ error: 'Endpoint not found', path }, 404);
    } catch (err) {
        return jsonResponse({ error: err.message }, 500);
    }
}
