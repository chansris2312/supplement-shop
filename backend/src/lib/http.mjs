// Helpers for API Gateway HTTP API (payload format 2.0) events.

export const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

export const ok = (body) => json(200, body);
export const badRequest = (message) => json(400, { message });
export const forbidden = () => json(403, { message: 'ต้องเป็นผู้ดูแลระบบ' });
export const notFound = (message = 'ไม่พบข้อมูล') => json(404, { message });

export function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Claims from the Cognito JWT authorizer (ID token). */
export function claims(event) {
  return event.requestContext?.authorizer?.jwt?.claims ?? {};
}

export const userId = (event) => claims(event).sub;
export const userEmail = (event) => claims(event).email;

/** HTTP API passes array claims as a string like "[admin other]". */
export function isAdmin(event) {
  const groups = claims(event)['cognito:groups'];
  if (!groups) return false;
  const list = Array.isArray(groups) ? groups : String(groups).replace(/[[\]]/g, '').split(/[\s,]+/);
  return list.includes('admin');
}

/** "GET /api/products/{id}" */
export const routeOf = (event) => event.routeKey;

/** Wraps a handler so unexpected errors become a 500 with a log line. */
export const wrap = (fn) => async (event, context) => {
  try {
    return await fn(event, context);
  } catch (err) {
    console.error(JSON.stringify({ msg: 'unhandled', route: event?.routeKey, error: String(err?.stack ?? err) }));
    return json(500, { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
  }
};
