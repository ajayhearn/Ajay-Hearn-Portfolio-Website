// Password login for the admin panel.
// Secrets (set with `npx wrangler pages secret put <NAME>`):
//   ADMIN_PASSWORD  the password you type on /admin
//   SESSION_SECRET  a long random string used to sign the login cookie
// Changing ADMIN_PASSWORD logs out every existing session.

export const COOKIE_NAME = "admin_session";
const SESSION_SECONDS = 8 * 60 * 60; // stay logged in for 8 hours
const MAX_FAILED_LOGINS = 10;
const LOCKOUT_SECONDS = 15 * 60;

const encoder = new TextEncoder();

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

// Compare two strings without leaking how many characters matched
async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

async function sign(env, message) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

// The signed message includes a fingerprint of the password, so changing it invalidates old cookies
async function sessionMessage(env, expires) {
  return `admin:${expires}:${toBase64Url(await sha256(env.ADMIN_PASSWORD))}`;
}

export function passwordLoginConfigured(env) {
  return Boolean(env.ADMIN_PASSWORD && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32);
}

export async function checkPassword(env, password) {
  return typeof password === "string" && (await safeEqual(password, env.ADMIN_PASSWORD));
}

export async function createSessionCookie(env) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const value = `${expires}.${await sign(env, await sessionMessage(env, expires))}`;
  return `${COOKIE_NAME}=${value}; Path=/api/admin; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/api/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function hasValidSession(request, env) {
  if (!passwordLoginConfigured(env)) return false;
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  const [expiresText, signature] = match[1].split(".");
  const expires = Number(expiresText);
  if (!Number.isInteger(expires) || expires < Date.now() / 1000 || !signature) return false;

  const expected = await sign(env, await sessionMessage(env, expires));
  return safeEqual(signature, expected);
}

// ---- Brute-force protection: count failed logins per IP address in KV ----
function failKey(request) {
  return `login-fail:${request.headers.get("CF-Connecting-IP") || "unknown"}`;
}

export async function isLockedOut(request, env) {
  if (!env.CONTENT) return false;
  const count = Number((await env.CONTENT.get(failKey(request))) || 0);
  return count >= MAX_FAILED_LOGINS;
}

export async function recordFailedLogin(request, env) {
  if (!env.CONTENT) return;
  const key = failKey(request);
  const count = Number((await env.CONTENT.get(key)) || 0) + 1;
  await env.CONTENT.put(key, String(count), { expirationTtl: LOCKOUT_SECONDS });
}

export async function clearFailedLogins(request, env) {
  if (env.CONTENT) await env.CONTENT.delete(failKey(request));
}
