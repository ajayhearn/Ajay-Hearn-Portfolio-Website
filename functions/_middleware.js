// Fills in the link-preview tags (og:title, og:description, og:image...) from the
// "Link preview" section of the admin panel, before the page is sent.
// Link-preview bots (LinkedIn, Discord, WhatsApp, Slack...) don't run JavaScript,
// so this has to happen on the server. If anything goes wrong, the page is sent unchanged.
import { CONTENT_KEY } from "../lib/content.js";

// Pages that get the saved title and description. Every page gets the saved image.
const TEXT_PAGES = new Set(["/", "/index.html", "/details", "/details.html"]);
const PAGES = new Set([...TEXT_PAGES, "/contact", "/contact.html", "/how-its-built", "/how-its-built.html"]);

class SetContent {
  constructor(value) { this.value = value; }
  // setAttribute escapes quotes; "&" is escaped here so text like "&lt;" shows exactly as typed
  element(el) { el.setAttribute("content", this.value.replace(/&/g, "&amp;")); }
}
const remove = { element(el) { el.remove(); } };

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const response = await context.next();

  if (request.method !== "GET" || !PAGES.has(url.pathname)) return response;
  if (!response.headers.get("Content-Type")?.includes("text/html")) return response;

  try {
    const preview = (await env.CONTENT?.get(CONTENT_KEY, "json"))?.preview;
    if (!preview) return response;

    const rewriter = new HTMLRewriter();
    if (TEXT_PAGES.has(url.pathname)) {
      if (preview.title) rewriter.on('meta[property="og:title"]', new SetContent(preview.title));
      if (preview.description) {
        for (const sel of ['meta[property="og:description"]', 'meta[name="description"]', 'meta[property="og:image:alt"]']) {
          rewriter.on(sel, new SetContent(preview.description));
        }
      }
    }
    const src = preview.images?.[0]?.src;
    if (src && /^\/api\/images\/[a-f0-9-]{36}$/.test(src)) {
      rewriter.on('meta[property="og:image"]', new SetContent(new URL(src, url.origin).href));
      // The size tags describe the default image, so drop them for an uploaded one
      rewriter.on('meta[property="og:image:width"]', remove);
      rewriter.on('meta[property="og:image:height"]', remove);
    }
    return rewriter.transform(response);
  } catch (err) {
    console.error("Link preview rewrite failed", err);
    return response;
  }
}
