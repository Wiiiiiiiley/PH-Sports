export class HttpError extends Error {
  constructor(status, message, code = undefined, headers = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Send the request as JSON.');
  }
  const limit = 16 * 1024;
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'The request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'A JSON object is required.');
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new HttpError(413, 'The request is too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return body;
  } catch {
    throw new HttpError(400, 'A valid JSON object is required.');
  }
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function checkRequestOrigin(request) {
  if (['GET', 'HEAD'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpError(403, 'Cross-site requests are not allowed.');
  }
  // Custom header plus JSON prevents cross-origin HTML forms from mutating data.
  // The API deliberately does not grant cross-origin CORS access.
  if (request.headers.get('x-ph-sports-request') !== '1') {
    throw new HttpError(403, 'Use the PH Sports application to send this request.');
  }
}
