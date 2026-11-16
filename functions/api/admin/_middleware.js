// Runs before every /api/admin/* request and rejects anyone who isn't a signed-in admin
import { requireAdmin } from "../../../lib/access.js";
import { hasValidSession } from "../../../lib/session.js";

export async function onRequest(context) {
  const { request, env, data } = context;

  // 1. Password login (the normal way to sign in)
  if (await hasValidSession(request, env)) {
    data.adminEmail = "admin";
    return context.next();
  }

  // 2. Cloudflare Access login, or the localhost-only dev bypass
  try {
    data.adminEmail = await requireAdmin(request, env);
    return context.next();
  } catch {
    return Response.json({ error: "Please log in" }, { status: 401 });
  }
}
