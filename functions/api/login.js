// POST /api/login  { "password": "..." }  -> sets the admin session cookie
import {
  checkPassword,
  clearFailedLogins,
  createSessionCookie,
  isLockedOut,
  passwordLoginConfigured,
  recordFailedLogin,
} from "../../lib/session.js";

export async function onRequestPost({ env, request }) {
  if (!passwordLoginConfigured(env)) {
    return Response.json({ error: "Admin login is not set up yet" }, { status: 503 });
  }
  // Requiring JSON blocks other websites from submitting a login form on your behalf
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }
  if (await isLockedOut(request, env)) {
    return Response.json({ error: "Too many wrong attempts. Try again in 15 minutes." }, { status: 429 });
  }

  let password;
  try {
    ({ password } = JSON.parse((await request.text()).slice(0, 1000)));
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!(await checkPassword(env, password))) {
    await recordFailedLogin(request, env);
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  await clearFailedLogins(request, env);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": await createSessionCookie(env) } });
}
