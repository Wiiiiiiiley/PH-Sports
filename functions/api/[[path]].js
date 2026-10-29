import { handleAuthRequest, requireUser } from '../../server/auth.js';
import { handleEntityRequest, updateProfile } from '../../server/entities.js';
import { checkRequestOrigin, HttpError, json } from '../../server/http.js';

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api(?=\/|$)/, '').replace(/\/$/, '') || '/';
  const method = request.method;
  try {
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
      throw new HttpError(405, 'Method not allowed.');
    }
    checkRequestOrigin(request);
    const args = { request, env, url, path, method, json };
    const authResponse = await handleAuthRequest(args);
    if (authResponse) return authResponse;
    const { user } = await requireUser({ request, env });
    if (path === '/auth/updateMe' && method === 'PATCH') {
      return await updateProfile({ ...args, user });
    }
    const response = await handleEntityRequest({ ...args, user });
    if (response) return response;
    throw new HttpError(404, 'Endpoint not found.');
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message, ...(error.code ? { code: error.code } : {}) }, error.status, error.headers);
    }
    console.error('PH Sports API request failed', { path, method, name: error?.name });
    return json({ error: 'The server could not complete this request. Please try again.' }, 500);
  }
}
