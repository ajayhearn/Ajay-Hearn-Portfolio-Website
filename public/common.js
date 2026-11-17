// Shared by the home page (script.js) and the "Read more" page (details.js)

// ---------- Theme toggle ----------
const root = document.documentElement;
document.getElementById("themeToggle")?.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Helpers ----------
// Build an element. Text is always set with textContent, so saved content can never inject HTML.
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

// Only allow normal web, email and same-site links
function safeUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function link(text, url, extra = {}) {
  const href = safeUrl(url);
  if (!href) return null;
  const external = href.startsWith("http") && !href.startsWith(window.location.origin);
  return el("a", { href, text, ...(external ? { target: "_blank", rel: "noopener" } : {}), ...extra });
}

const isUploadedImage = (img) => /^\/api\/images\/[a-f0-9-]+$/.test(img?.src || "");

// Up to 2 images side by side; clicking one opens it full size
function gallery(images) {
  const imgs = (images || []).filter(isUploadedImage);
  if (!imgs.length) return null;
  return el(
    "div",
    { class: `gallery count-${imgs.length}` },
    imgs.map((img) =>
      el("a", { href: img.src, target: "_blank", rel: "noopener" }, [
        el("img", { src: img.src, alt: img.alt || "", loading: "lazy" }),
      ])
    )
  );
}

// Link to an item's own page, only when "Read more" is switched on for it
function readMoreLink(section, item) {
  if (!item.readMore || !item.id) return null;
  const params = new URLSearchParams({ section, id: item.id });
  return el("a", { class: "read-more", href: `/details?${params}`, text: "Read more →" });
}

// /api/content returns what you saved in the admin panel. If that isn't available
// (for example when opening the file without the Cloudflare server), fall back to content.json.
async function loadContent() {
  for (const url of ["/api/content", "/content.json"]) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch {
      /* try the next source */
    }
  }
  throw new Error("Could not load content");
}
