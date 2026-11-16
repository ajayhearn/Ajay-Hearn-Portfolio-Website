// POST /api/admin/logout -> clears the admin session cookie
import { clearSessionCookie } from "../../../lib/session.js";

export function onRequestPost() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
