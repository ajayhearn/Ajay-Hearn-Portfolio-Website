// Runs before every /api/admin/* request and rejects anyone who isn't a signed-in admin
import { requireAdmin } from "../../../lib/access.js";

export async function onRequest(context) {
  try {
    context.data.adminEmail = await requireAdmin(context.request, context.env);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 403 });
  }
  return context.next();
}
