// GET /api/images/<id> (public): serve an uploaded image
import { IMAGE_ID, IMAGE_PREFIX } from "../../../lib/content.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function onRequestGet({ env, params }) {
  if (!IMAGE_ID.test(params.id) || !env.CONTENT) return new Response("Not found", { status: 404 });

  const { value, metadata } = await env.CONTENT.getWithMetadata(`${IMAGE_PREFIX}${params.id}`, "arrayBuffer");
  if (!value || !ALLOWED_TYPES.includes(metadata?.type)) return new Response("Not found", { status: 404 });

  return new Response(value, {
    headers: {
      "Content-Type": metadata.type,
      "Cache-Control": "public, max-age=31536000, immutable", // ids never change, so cache forever
      "X-Content-Type-Options": "nosniff",
    },
  });
}
