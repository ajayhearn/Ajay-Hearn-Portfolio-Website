// Shared by the home page (script.js) and the "Read more" page (details.js)
const root = document.documentElement;

// True when animations should be off (the visitor's choice, or their device setting). See prefs.js.
const motionReduced = () => root.dataset.motion === "reduce";

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

// Text only screen readers hear, e.g. "(opens in a new tab)"
const srOnly = (text) => el("span", { class: "sr-only", text });

// icon: optional decorative symbol, hidden from screen readers. after: true puts it after the text.
function link(text, url, { icon = "", after = false, ...extra } = {}) {
  const href = safeUrl(url);
  if (!href) return null;
  const external = href.startsWith("http") && !href.startsWith(window.location.origin);
  const iconEl = icon ? el("span", { "aria-hidden": "true", text: after ? ` ${icon}` : `${icon} ` }) : null;
  return el("a", { href, ...(external ? { target: "_blank", rel: "noopener" } : {}), ...extra }, [
    after ? null : iconEl,
    document.createTextNode(text),
    after ? iconEl : null,
    external ? srOnly(" (opens in a new tab)") : null,
  ]);
}

const isUploadedImage = (img) => /^\/api\/images\/[a-f0-9-]+$/.test(img?.src || "");

// Images in a grid (up to 6 for experience, 2 elsewhere); clicking one opens it full size
function gallery(images) {
  const imgs = (images || []).filter(isUploadedImage);
  if (!imgs.length) return null;
  return el(
    "div",
    { class: `gallery count-${imgs.length}` },
    imgs.map((img, i) =>
      el("a", {
        href: img.src,
        target: "_blank",
        rel: "noopener",
        // Every image link gets a name, even when no description was written
        "aria-label": `${img.alt || `Image ${i + 1} of ${imgs.length}`}: view full size (opens in a new tab)`,
      }, [el("img", { src: img.src, alt: img.alt || "", loading: "lazy" })])
    )
  );
}

// The small line above an experience/education title: "Sep 2025 - Jun 2027 · 📍 Exeter, Devon"
function timelineMeta(item) {
  if (!item.when && !item.location) return null;
  return el("p", { class: "when" }, [
    item.when ? document.createTextNode(item.when) : null,
    item.when && item.location ? el("span", { class: "meta-sep", "aria-hidden": "true", text: " · " }) : null,
    item.location ? el("span", { class: "location" }, [
      el("span", { "aria-hidden": "true", text: "📍 " }),
      srOnly(item.when ? ", Location: " : "Location: "),
      document.createTextNode(item.location),
    ]) : null,
  ]);
}

// Link to an item's own page, only when "Read more" is switched on for it
function readMoreLink(section, item) {
  if (!item.readMore || !item.id) return null;
  const params = new URLSearchParams({ section, id: item.id });
  return el("a", { class: "read-more", href: `/details?${params}` }, [
    document.createTextNode("Read more"),
    srOnly(` about ${item.title || "this"}`),
    el("span", { "aria-hidden": "true", text: " →" }),
  ]);
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

// ---------- Header controls: theme, phone menu, accessibility settings ----------
function store(key, value) {
  try {
    value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value);
  } catch {
    /* private browsing: settings just won't be remembered */
  }
}

// Dark mode button
const themeBtn = document.getElementById("themeToggle");
function syncTheme() {
  themeBtn?.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
}
themeBtn?.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  store("theme", root.dataset.theme);
  syncTheme();
});
syncTheme();

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Dropdowns (phone menu and accessibility panel): open/close, Escape and outside clicks close them
const dropdowns = [];
function dropdown(button, panel, { onOpen } = {}) {
  const set = (open) => {
    button.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("open", open);
    if (open) onOpen?.();
  };
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    dropdowns.forEach((d) => d !== entry && d.set(false));
    set(open);
  });
  const entry = { button, panel, set };
  dropdowns.push(entry);
  return entry;
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  for (const d of dropdowns) {
    if (d.button.getAttribute("aria-expanded") === "true") {
      d.set(false);
      d.button.focus();
    }
  }
});
document.addEventListener("click", (e) => {
  for (const d of dropdowns) {
    if (!d.button.contains(e.target) && !d.panel.contains(e.target)) d.set(false);
  }
});

// Phone menu: closes after picking a section
const menuBtn = document.getElementById("menuToggle");
const menu = document.getElementById("site-menu");
if (menuBtn && menu) {
  const menuDropdown = dropdown(menuBtn, menu);
  menu.addEventListener("click", (e) => e.target.closest("a") && menuDropdown.set(false));
}

// Accessibility settings
const A11Y_TOGGLES = [
  { key: "contrast", label: "High contrast" },
  { key: "motion", label: "Stop animations" },
  { key: "font", label: "Easy-read font" },
  { key: "spacing", label: "Wider text spacing" },
  { key: "links", label: "Underline links" },
];
const TEXT_SIZES = [
  { value: "100", label: "A", name: "Normal text size" },
  { value: "115", label: "A+", name: "Large text" },
  { value: "130", label: "A++", name: "Larger text" },
  { value: "150", label: "A+++", name: "Largest text" },
];

const isOn = (key) => (key === "motion" ? motionReduced() : root.dataset[key] === "on");

function buildA11yPanel() {
  const controls = document.querySelector(".nav-controls");
  if (!controls) return;

  const button = el("button", {
    class: "icon-btn",
    id: "a11yToggle",
    "aria-expanded": "false",
    "aria-controls": "a11yPanel",
    "aria-label": "Accessibility settings",
    title: "Accessibility settings",
  });
  // Universal access symbol
  button.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="6.6" r="1.6" fill="currentColor"/><path d="M6.8 9.4c1.7.5 3.4.8 5.2.8s3.5-.3 5.2-.8M12 10.2v3.6m0 0-2.4 4.6m2.4-4.6 2.4 4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const sizeButtons = TEXT_SIZES.map((size) =>
    el("button", { type: "button", class: "a11y-size", "data-size": size.value, "aria-label": size.name, title: size.name, text: size.label })
  );
  const toggleButtons = A11Y_TOGGLES.map((t) =>
    el("button", { type: "button", class: "a11y-toggle", "data-key": t.key }, [
      el("span", { text: t.label }),
      el("span", { class: "switch", "aria-hidden": "true" }),
    ])
  );
  const reset = el("button", { type: "button", class: "a11y-reset", text: "Reset to default" });
  const status = el("p", { class: "sr-only", role: "status" });

  const panel = el("div", { class: "a11y-panel", id: "a11yPanel", role: "group", "aria-labelledby": "a11yTitle" }, [
    el("p", { class: "a11y-title", id: "a11yTitle", text: "Accessibility" }),
    el("p", { class: "a11y-label", id: "a11ySizeLabel", text: "Text size" }),
    el("div", { class: "a11y-sizes", role: "group", "aria-labelledby": "a11ySizeLabel" }, sizeButtons),
    ...toggleButtons,
    reset,
    status,
  ]);

  const sync = () => {
    sizeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.size === root.dataset.textSize)));
    toggleButtons.forEach((b) => b.setAttribute("aria-pressed", String(isOn(b.dataset.key))));
  };

  sizeButtons.forEach((b) =>
    b.addEventListener("click", () => {
      root.dataset.textSize = b.dataset.size;
      store("a11y-text-size", b.dataset.size === "100" ? null : b.dataset.size);
      status.textContent = b.getAttribute("aria-label");
      sync();
    })
  );
  toggleButtons.forEach((b) =>
    b.addEventListener("click", () => {
      const key = b.dataset.key;
      const on = !isOn(key);
      if (key === "motion") {
        root.dataset.motion = on ? "reduce" : "full";
        store("a11y-motion", root.dataset.motion);
      } else {
        on ? (root.dataset[key] = "on") : delete root.dataset[key];
        store(`a11y-${key}`, on ? "on" : null);
      }
      status.textContent = `${b.textContent} ${on ? "on" : "off"}`;
      sync();
    })
  );
  reset.addEventListener("click", () => {
    ["a11y-text-size", "a11y-motion", ...A11Y_TOGGLES.map((t) => `a11y-${t.key}`)].forEach((k) => store(k, null));
    ["contrast", "font", "spacing", "links"].forEach((k) => delete root.dataset[k]);
    root.dataset.textSize = "100";
    root.dataset.motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "full";
    status.textContent = "Accessibility settings reset";
    sync();
  });

  const wrap = el("div", { class: "a11y" }, [button, panel]);
  controls.insertBefore(wrap, themeBtn);
  dropdown(button, panel, { onOpen: sync });
  sync();
}
buildA11yPanel();
