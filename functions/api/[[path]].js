export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    const method = request.method;

    // Helper for JSON responses
    const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });

    if (method === 'OPTIONS') {
        return jsonResponse(null);
    }

    try {
        // --- AUTH ROUTES ---
        // Mocking /auth/me to always return a test user if not found
        if (path === '/auth/me') {
            const testEmail = 'admin@sportsync.edu';
            let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(testEmail).first();
            
            if (!user) {
                // Auto-create admin if not exists
                const id = crypto.randomUUID();
                await env.DB.prepare(
                    'INSERT INTO users (id, email, full_name, role, profile_complete, teacher_status) VALUES (?, ?, ?, ?, ?, ?)'
                ).bind(id, testEmail, 'Admin User', 'admin', 1, 'approved').run();
                user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(testEmail).first();
            }
            return jsonResponse(user);
        }

        if (path === '/auth/updateMe' && method === 'PATCH') {
            const body = await request.json();
            const testEmail = 'admin@sportsync.edu';
            
            const updates = Object.keys(body).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(body), testEmail];
            
            await env.DB.prepare(`UPDATE users SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE email = ?`)
                .bind(...values).run();
            
            const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(testEmail).first();
            return jsonResponse(user);
        }

        // --- ENTITY ROUTES (CRUD) ---
        const entityMap = {
            '/users': 'users',
            '/teacher-registrations': 'teacher_registrations',
            '/venue-bookings': 'venue_bookings',
            '/announcements': 'announcements',
            '/team-memberships': 'team_memberships',
            '/teams': 'teams',
            '/training-logs': 'training_logs'
        };

        const tableName = entityMap[path] || Object.entries(entityMap).find(([p]) => path.startsWith(p + '/'))?.[1];
        
        if (tableName) {
            // GET List or Single
            if (method === 'GET') {
                const id = path.split('/').pop();
                if (id && id !== tableName.replace('_', '-')) {
                    const result = await env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).bind(id).first();
                    return result ? jsonResponse(result) : jsonResponse({ error: 'Not found' }, 404);
                }
                const { results } = await env.DB.prepare(`SELECT * FROM ${tableName} ORDER BY created_at DESC`).all();
                return jsonResponse(results);
            }

            // POST Create
            if (method === 'POST') {
                const body = await request.json();
                const id = crypto.randomUUID();
                const keys = ['id', ...Object.keys(body)];
                const placeholders = keys.map(() => '?').join(', ');
                const values = [id, ...Object.values(body)];
                
                await env.DB.prepare(
                    `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`
                ).bind(...values).run();
                
                return jsonResponse({ id, ...body });
            }

            // PATCH Update
            if (method === 'PATCH') {
                const id = path.split('/').pop();
                const body = await request.json();
                const updates = Object.keys(body).map(key => `${key} = ?`).join(', ');
                const values = [...Object.values(body), id];
                
                await env.DB.prepare(`UPDATE ${tableName} SET ${updates} WHERE id = ?`)
                    .bind(...values).run();
                
                return jsonResponse({ id, ...body });
            }

            // DELETE
            if (method === 'DELETE') {
                const id = path.split('/').pop();
                await env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ?`).bind(id).run();
                return jsonResponse({ success: true });
            }
        }

        return jsonResponse({ error: 'Endpoint not found', path }, 404);
    } catch (err) {
        return jsonResponse({ error: err.message }, 500);
    }
}
