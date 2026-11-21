// Shared helpers for reading and validating the site content.

export const CONTENT_KEY = "site-content";
export const MAX_BODY_BYTES = 500_000; // room for long "Read more" write-ups

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

function images(value, max = MAX_IMAGES_PER_ITEM) {
  return list(value, max, (img) => {
    const src = str(obj(img).src, 100);
    if (!IMAGE_SRC.test(src)) throw new Error("One of the images is invalid. Try removing and re-adding it.");
    return { src, alt: str(obj(img).alt, 200) };
  });
}

// All image ids used anywhere in the content, so unused uploads can be cleaned up
export function referencedImageIds(content) {
  const ids = new Set();
  const skillIcons = (content.skills || []).flatMap((g) => g.skills || []);
  for (const group of [content.projects, content.experience, content.education, content.certifications, [content.preview], skillIcons]) {
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

// ---- "Read more" pages ----
// Each project / experience / education item gets a short id used in its page link: /details?section=projects&id=ab12cd34
const ITEM_ID = /^[a-z0-9-]{1,40}$/;
const newId = () => crypto.randomUUID().slice(0, 8);

// Keep existing ids, create missing ones, and make sure no two items in a list share one
function withUniqueIds(items) {
  const seen = new Set();
  for (const item of items) {
    while (!ITEM_ID.test(item.id) || seen.has(item.id)) item.id = newId();
    seen.add(item.id);
  }
  return items;
}

const readMore = (v) => ({
  readMore: obj(v).readMore === true,
  details: str(obj(v).details, 10000),
});

// maxImages: experience entries allow 6 images, education entries 2
const timelineEntry = (maxImages) => (e) => ({
  id: typeof obj(e).id === "string" ? obj(e).id : "",
  when: str(obj(e).when, 60),
  highlight: str(obj(e).highlight, 40),
  tags: list(obj(e).tags, 8, (t) => str(t, 30)),
  title: str(obj(e).title, 150),
  description: str(obj(e).description, 1500),
  images: images(obj(e).images, maxImages),
  ...readMore(e),
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
    // Skill groups: each skill has a name and an optional icon image.
    // Older saves stored skills as plain names in "items"; those are converted here.
    skills: list(c.skills, 12, (g) => ({
      title: str(obj(g).title, 60),
      description: str(obj(g).description, 120),
      skills: list(Array.isArray(obj(g).skills) ? obj(g).skills : (obj(g).items || []).map((name) => ({ name })), 40, (s) => ({
        name: str(typeof s === "string" ? s : obj(s).name, 60),
        images: images(obj(s).images, 1),
      })),
    })),
    projects: withUniqueIds(list(c.projects, 20, (p) => ({
      id: typeof obj(p).id === "string" ? obj(p).id : "",
      icon: str(obj(p).icon, 8),
      title: str(obj(p).title, 100),
      when: str(obj(p).when, 60),
      description: str(obj(p).description, 1500),
      tags: list(obj(p).tags, 15, (t) => str(t, 40)),
      github: url(obj(p).github),
      live: url(obj(p).live),
      images: images(obj(p).images),
      ...readMore(p),
    }))),
    experience: withUniqueIds(list(c.experience, 20, timelineEntry(6))),
    education: withUniqueIds(list(c.education, 20, timelineEntry(MAX_IMAGES_PER_ITEM))),
    certifications: list(c.certifications, 20, (x) => ({
      icon: str(obj(x).icon, 8),
      title: str(obj(x).title, 150),
      detail: str(obj(x).detail, 100),
      images: images(obj(x).images, 1), // an uploaded image replaces the icon
    })),
    preview: {
      title: str(obj(c.preview).title, 100),
      description: str(obj(c.preview).description, 300),
      images: images(obj(c.preview).images, 1),
    },
    references: list(c.references, 20, (r) => ({
      name: str(obj(r).name, 100),
      role: str(obj(r).role, 150),
      quote: str(obj(r).quote, 1500),
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
