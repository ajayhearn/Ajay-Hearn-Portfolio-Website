// /api/admin/content (admins only; see _middleware.js)
//   GET -> current content plus the signed-in email
//   PUT -> validate and save new content
import {
  CONTENT_KEY,
  IMAGE_PREFIX,
  MAX_BODY_BYTES,
  loadContent,
  referencedImageIds,
  sanitizeContent,
} from "../../../lib/content.js";

export async function onRequestGet({ env, request, data }) {
  const content = await loadContent(env, request);
  return Response.json({ email: data.adminEmail, content }, { headers: { "Cache-Control": "no-store" } });
}

export async function onRequestPut({ env, request }) {
  // Requiring JSON also blocks other websites from submitting forms on your behalf
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return Response.json({ error: "Expected JSON" }, { status: 415 });
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    return Response.json({ error: "Content is too large" }, { status: 413 });
  }

  let content;
  try {
    content = sanitizeContent(JSON.parse(body));
  } catch (err) {
    return Response.json({ error: err.message || "Invalid content" }, { status: 400 });
  }

  if (!env.CONTENT) {
    return Response.json({ error: "Storage (KV binding CONTENT) is not set up" }, { status: 500 });
  }
  await env.CONTENT.put(CONTENT_KEY, JSON.stringify(content));
  await deleteUnusedImages(env, content);
  return Response.json({ ok: true, content });
}

// Remove uploaded images that are no longer used anywhere, so storage doesn't fill up
async function deleteUnusedImages(env, content) {
  const used = referencedImageIds(content);
  let cursor;
  do {
    const page = await env.CONTENT.list({ prefix: IMAGE_PREFIX, cursor });
    const unused = page.keys.filter((k) => !used.has(k.name.slice(IMAGE_PREFIX.length)));
    await Promise.all(unused.map((k) => env.CONTENT.delete(k.name)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}
