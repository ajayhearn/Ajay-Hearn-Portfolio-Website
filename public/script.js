// ---------- Theme toggle ----------
const root = document.documentElement;
document.getElementById("themeToggle").addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem("theme", next);
});

document.getElementById("year").textContent = new Date().getFullYear();

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

// Up to 2 images side by side; clicking one opens it full size
function gallery(images) {
  const imgs = (images || []).filter((img) => /^\/api\/images\/[a-f0-9-]+$/.test(img.src));
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

// ---------- Rendering ----------
function render(c) {
  // Logo: "Ajay Hearn" -> "Ajay" + ".H"
  const nameParts = (c.name || "").trim().split(/\s+/).filter(Boolean);
  const fields = {
    name: c.name,
    firstName: nameParts[0] || "",
    lastInitial: nameParts.length > 1 ? `.${nameParts[nameParts.length - 1][0].toUpperCase()}` : "",
    tagline: c.tagline,
    intro: c.intro,
    contactMessage: c.contact?.message,
  };
  document.querySelectorAll("[data-field]").forEach((node) => {
    node.textContent = fields[node.dataset.field] ?? "";
  });
  if (c.name) document.title = `${c.name} | ${c.tagline?.split("·")[0].trim() || "Portfolio"}`;

  document.getElementById("about-body").replaceChildren(
    ...(c.about || []).map((p) => el("p", { text: p }))
  );

  document.getElementById("skills-list").replaceChildren(
    ...(c.skills || []).map((group) =>
      el("div", { class: "card skill-group" }, [
        el("h3", { text: `${group.icon || ""} ${group.title || ""}`.trim() }),
        el("ul", { class: "chips" }, (group.items || []).map((s) => el("li", { text: s }))),
      ])
    )
  );

  document.getElementById("projects-list").replaceChildren(
    ...(c.projects || []).map((p) =>
      el("article", { class: "card project" }, [
        el("div", { class: "project-head" }, [
          el("span", { class: "project-icon", text: p.icon || "📦" }),
          el("div", { class: "project-links" }, [link("GitHub", p.github), link("Live ↗", p.live)]),
        ]),
        gallery(p.images),
        el("h3", { text: p.title }),
        el("p", { text: p.description }),
        el("ul", { class: "tags" }, (p.tags || []).map((t) => el("li", { text: t }))),
      ])
    )
  );

  const timeline = (entries) =>
    (entries || []).map((e) =>
      el("li", { class: "card" }, [
        el("span", { class: "when", text: e.when }),
        el("h3", { text: e.title }),
        el("p", { text: e.description }),
        gallery(e.images),
      ])
    );
  document.getElementById("experience-list").replaceChildren(...timeline(c.experience));
  document.getElementById("education-list").replaceChildren(...timeline(c.education));

  const certs = c.certifications || [];
  document.getElementById("certs-heading").hidden = certs.length === 0;
  document.getElementById("certs-list").replaceChildren(
    ...certs.map((cert) =>
      el("div", { class: "card cert" }, [
        el("span", { text: "🏅" }),
        el("div", {}, [el("strong", { text: cert.title }), el("small", { text: cert.detail })]),
      ])
    )
  );

  const ct = c.contact || {};
  document.getElementById("contact-links").replaceChildren(
    ...[
      ct.email && link("✉️ Email me", `mailto:${ct.email}`, { class: "btn primary" }),
      link("LinkedIn", ct.linkedin, { class: "btn ghost" }),
      link("GitHub", ct.github, { class: "btn ghost" }),
      link("Download CV", ct.cv, { class: "btn ghost" }),
    ].filter(Boolean)
  );

  typeTerminal(c.terminal || []);
  setUpReveal();
}

// ---------- Terminal typing effect ----------
function typeTerminal(rows) {
  const typed = document.getElementById("typed");
  // Each piece is [text, cssClass]; text is inserted with textContent
  const pieces = [["$ ", "p"], ["whoami --json\n{\n", ""]];
  rows.forEach((row, i) => {
    pieces.push(["  ", ""], [`"${row.key}"`, "k"], [": ", ""], [`"${row.value}"`, "s"]);
    pieces.push([i < rows.length - 1 ? ",\n" : "\n", ""]);
  });
  pieces.push(["}\n\n", ""], ["$ ", "p"]);

  const spans = pieces.map(([, cls]) => {
    const span = document.createElement("span");
    if (cls) span.className = cls;
    typed.append(span);
    return span;
  });

  if (reduceMotion) {
    pieces.forEach(([text], i) => (spans[i].textContent = text));
    return;
  }

  let piece = 0, char = 0;
  const tick = () => {
    if (piece >= pieces.length) return;
    const text = pieces[piece][0];
    spans[piece].textContent = text.slice(0, ++char);
    const justTyped = text[char - 1];
    if (char >= text.length) { piece++; char = 0; }
    setTimeout(tick, justTyped === "\n" ? 160 : 22);
  };
  setTimeout(tick, 400);
}

// ---------- Scroll reveal ----------
function setUpReveal() {
  const targets = document.querySelectorAll(".section h2, .card");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  targets.forEach((t) => {
    t.classList.add("reveal");
    observer.observe(t);
  });
}

// ---------- Load content ----------
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

loadContent()
  .then(render)
  .catch((err) => {
    console.error(err);
    document.querySelector(".lead").textContent = "Sorry, this page couldn't load. Please refresh.";
  });
