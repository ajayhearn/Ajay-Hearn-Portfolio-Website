// POST /api/admin/images (admins only): upload one image, returns { src } to use in the content
import { IMAGE_PREFIX, detectImageType } from "../../../lib/content.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB (the admin panel shrinks photos well below this)

export async function onRequestPost({ env, request }) {
  // Requiring an image content type means other websites can't send uploads on your behalf
  if (!request.headers.get("Content-Type")?.startsWith("image/")) {
    return Response.json({ error: "Expected an image" }, { status: 415 });
  }
  const declaredSize = Number(request.headers.get("Content-Length") || 0);
  if (declaredSize > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Image is too large (max 5 MB)" }, { status: 413 });
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Image is too large (max 5 MB)" }, { status: 413 });
  }
  const type = detectImageType(bytes);
  if (!type) {
    return Response.json({ error: "Only JPG, PNG, WebP and GIF images are allowed" }, { status: 400 });
  }
  if (!env.CONTENT) {
    return Response.json({ error: "Storage (KV binding CONTENT) is not set up" }, { status: 500 });
  }

  const id = crypto.randomUUID();
  await env.CONTENT.put(`${IMAGE_PREFIX}${id}`, bytes, { metadata: { type } });
  return Response.json({ src: `/api/images/${id}` }, { status: 201 });
}
