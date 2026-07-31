const encoder = new TextEncoder();

export const COOKIE_NAME = "__Host-navdesk_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}

export function getSecrets(context) {
  const env = context?.env || {};
  const adminPassword = env.ADMIN_PASSWORD || globalThis.ADMIN_PASSWORD;
  const sessionSecret = env.SESSION_SECRET || globalThis.SESSION_SECRET;
  if (!adminPassword || !sessionSecret) throw new Error("ADMIN_PASSWORD and SESSION_SECRET must be configured");
  return { adminPassword: String(adminPassword), sessionSecret: String(sessionSecret) };
}

export function parseCookies(request) {
  return (request.headers.get("Cookie") || "").split(";").reduce((result, item) => {
    const index = item.indexOf("=");
    if (index > 0) result[item.slice(0, index).trim()] = item.slice(index + 1).trim();
    return result;
  }, {});
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function timingSafeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return mismatch === 0;
}

async function hash(value) { return toBase64Url(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }

export async function passwordMatches(value, expected) { return timingSafeEqual(await hash(value), await hash(expected)); }

export async function createSession(secret) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const unsigned = `${issuedAt}.${nonce}`;
  return `${unsigned}.${await hmac(unsigned, secret)}`;
}

export async function isAuthenticated(request, secret) {
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return false;
  const [issuedAtText, nonce, signature, ...extra] = token.split(".");
  const issuedAt = Number(issuedAtText);
  if (extra.length || !/^\d{10}$/.test(issuedAtText) || !/^[A-Za-z0-9_-]{16,}$/.test(nonce) || !signature) return false;
  const now = Math.floor(Date.now() / 1000);
  return issuedAt <= now + 60 && now - issuedAt <= SESSION_MAX_AGE && timingSafeEqual(signature, await hmac(`${issuedAtText}.${nonce}`, secret));
}

export function sessionCookie(value) { return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`; }
export function clearSessionCookie() { return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`; }

export async function requireAuth(context) {
  try {
    const { sessionSecret } = getSecrets(context);
    if (await isAuthenticated(context.request, sessionSecret)) return { sessionSecret };
    return { response: json({ error: "Unauthorized" }, 401) };
  } catch {
    return { response: json({ error: "Server authentication is not configured" }, 503) };
  }
}

export async function readJson(request) {
  const text = await request.text();
  if (text.length > 250000) throw new Error("Request body is too large");
  try {
    const value = JSON.parse(text || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new Error("Invalid JSON request body"); }
}
