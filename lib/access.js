// Verifies the login token that Cloudflare Access attaches to every request it lets through.
// Cloudflare Access does the actual login (email one-time code). This check makes sure that
// even if the Access rule were misconfigured, the admin API would still refuse to save changes.

let cachedKeys = null;
let cachedAt = 0;

function base64UrlToBytes(input) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}

function decodeJson(part) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
}

async function getSigningKeys(teamDomain) {
  // Access rotates keys occasionally, so refresh the cache every hour
  if (cachedKeys && Date.now() - cachedAt < 60 * 60 * 1000) return cachedKeys;
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Could not fetch Access keys (${res.status})`);
  const { keys } = await res.json();
  cachedKeys = keys;
  cachedAt = Date.now();
  return keys;
}

async function verifyToken(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [headerPart, payloadPart, signaturePart] = parts;

  const header = decodeJson(headerPart);
  if (header.alg !== "RS256") throw new Error("Unexpected token algorithm");

  const keys = await getSigningKeys(env.TEAM_DOMAIN);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Unknown signing key");

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(`${headerPart}.${payloadPart}`)
  );
  if (!valid) throw new Error("Bad signature");

  const payload = decodeJson(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(env.POLICY_AUD)) throw new Error("Wrong audience");
  if (payload.iss !== `https://${env.TEAM_DOMAIN}`) throw new Error("Wrong issuer");
  if (typeof payload.exp !== "number" || payload.exp < now) throw new Error("Token expired");
  if (typeof payload.nbf === "number" && payload.nbf > now + 60) throw new Error("Token not yet valid");
  return payload;
}

function isLocalhost(request) {
  const { hostname } = new URL(request.url);
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Returns the signed-in admin's email, or throws if the request isn't from an allowed admin.
 */
export async function requireAdmin(request, env) {
  // Local testing only: wrangler dev has no Cloudflare Access in front of it.
  // Needs BOTH the .dev.vars flag AND a localhost address, so it can't switch on in production.
  if (env.DEV_ALLOW_NO_AUTH === "true" && isLocalhost(request)) {
    return "dev@localhost";
  }

  if (!env.TEAM_DOMAIN || !env.POLICY_AUD || !env.ADMIN_EMAILS) {
    throw new Error("Admin login is not configured (TEAM_DOMAIN, POLICY_AUD, ADMIN_EMAILS)");
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) throw new Error("Not signed in");

  const payload = await verifyToken(token, env);
  const email = String(payload.email || "").toLowerCase();
  const allowed = env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(email)) throw new Error("This account is not an admin");
  return email;
}
