// Shared helpers for reading and validating the site content.

export const CONTENT_KEY = "site-content";
export const MAX_BODY_BYTES = 100_000;

// Fetch the saved content from KV, or fall back to the default public/content.json
export async function loadContent(env, request) {
  const saved = env.CONTENT ? await env.CONTENT.get(CONTENT_KEY, "json") : null;
  if (saved) return saved;
  const res = await env.ASSETS.fetch(new URL("/content.json", request.url));
  return res.json();
}

// ---- Validation ----
// Rebuilds the content from scratch using only known fields, so nothing unexpected is ever stored.

function str(value, max = 500) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Expected text");
  return value.trim().slice(0, max);
}

function url(value, { allowRelative = false } = {}) {
  const s = str(value, 500);
  if (!s) return "";
  if (allowRelative && s.startsWith("/") && !s.startsWith("//")) return s;
  let parsed;
  try {
    parsed = new URL(s);
  } catch {
    throw new Error(`"${s}" is not a valid link. Links must start with https://`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`"${s}" must start with https://`);
  return parsed.href;
}

function email(value) {
  const s = str(value, 200);
  if (s && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s)) throw new Error(`"${s}" is not a valid email address`);
  return s;
}

function list(value, maxItems, mapItem) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Expected a list");
  return value.slice(0, maxItems).map(mapItem);
}

const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

// ---- Images ----
// Uploaded images are stored in KV as "img:<id>" and served from /api/images/<id>
export const IMAGE_PREFIX = "img:";
export const MAX_IMAGES_PER_ITEM = 2;
export const IMAGE_ID = /^[a-f0-9-]{36}$/;
const IMAGE_SRC = /^\/api\/images\/([a-f0-9-]{36})$/;

function images(value) {
  return list(value, MAX_IMAGES_PER_ITEM, (img) => {
    const src = str(obj(img).src, 100);
    if (!IMAGE_SRC.test(src)) throw new Error("One of the images is invalid. Try removing and re-adding it.");
    return { src, alt: str(obj(img).alt, 200) };
  });
}

// All image ids used anywhere in the content, so unused uploads can be cleaned up
export function referencedImageIds(content) {
  const ids = new Set();
  for (const group of [content.projects, content.experience, content.education]) {
    for (const item of group || []) {
      for (const img of item.images || []) ids.add(img.src.match(IMAGE_SRC)[1]);
    }
  }
  return ids;
}

// Work out the image type from the file's first bytes rather than trusting what the browser says
export function detectImageType(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  const ascii = String.fromCharCode(...b);
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

const timelineEntry = (e) => ({
  when: str(obj(e).when, 60),
  title: str(obj(e).title, 150),
  description: str(obj(e).description, 1500),
  images: images(obj(e).images),
});

export function sanitizeContent(input) {
  const c = obj(input);
  const contact = obj(c.contact);
  return {
    name: str(c.name, 100),
    tagline: str(c.tagline, 200),
    intro: str(c.intro, 1000),
    terminal: list(c.terminal, 12, (r) => ({ key: str(obj(r).key, 40), value: str(obj(r).value, 80) })),
    about: list(c.about, 10, (p) => str(p, 2000)),
    skills: list(c.skills, 12, (g) => ({
      icon: str(obj(g).icon, 8),
      title: str(obj(g).title, 60),
      items: list(obj(g).items, 30, (s) => str(s, 60)),
    })),
    projects: list(c.projects, 20, (p) => ({
      icon: str(obj(p).icon, 8),
      title: str(obj(p).title, 100),
      description: str(obj(p).description, 1500),
      tags: list(obj(p).tags, 15, (t) => str(t, 40)),
      github: url(obj(p).github),
      live: url(obj(p).live),
      images: images(obj(p).images),
    })),
    experience: list(c.experience, 20, timelineEntry),
    education: list(c.education, 20, timelineEntry),
    certifications: list(c.certifications, 20, (x) => ({
      title: str(obj(x).title, 150),
      detail: str(obj(x).detail, 100),
    })),
    contact: {
      message: str(contact.message, 500),
      email: email(contact.email),
      linkedin: url(contact.linkedin),
      github: url(contact.github),
      cv: url(contact.cv, { allowRelative: true }),
    },
  };
}
