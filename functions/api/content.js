// GET /api/content (public): the content shown on the home page
import { loadContent } from "../../lib/content.js";

export async function onRequestGet({ env, request }) {
  const content = await loadContent(env, request);
  return Response.json(content, { headers: { "Cache-Control": "no-store" } });
}
