// Fills in the Home, Experience, Projects and Contact pages from the saved content.
// Each page only has some of the sections, so every block checks its element exists first.
// Shared helpers (el, link, gallery, loadContent...) are in common.js

// Old one-page links (e.g. /#projects) forward to the page the section moved to
const MOVED = { education: "/experience#education", certifications: "/experience#certifications", experience: "/experience#experience", references: "/experience#references", projects: "/projects", contact: "/contact" };
if ((location.pathname === "/" || location.pathname === "/index.html") && MOVED[location.hash.slice(1)]) {
  location.replace(MOVED[location.hash.slice(1)]);
}
const $ = (id) => document.getElementById(id);

// Reloading the page always starts at the top, even if you'd scrolled down or clicked a menu link.
// (Following a link like /#projects from another page still jumps to that section.)
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const isReload = performance.getEntriesByType("navigation")[0]?.type === "reload";
function goToTopOnReload() {
  if (!isReload) return;
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo(0, 0);
}
goToTopOnReload();
window.addEventListener("load", goToTopOnReload);

// GitHub / Live links in the top-right of a project card (nothing when neither is filled in)
function projectLinks(p) {
  const links = [
    link("GitHub", p.github, { "aria-label": `${p.title}: GitHub (opens in a new tab)` }),
    link("Live", p.live, { icon: "↗", after: true, "aria-label": `${p.title}: live demo (opens in a new tab)` }),
  ].filter(Boolean);
  return links.length ? el("div", { class: "project-head" }, [el("div", { class: "project-links" }, links)]) : null;
}

// ---------- Skills (like leeam.uk's Stack page) ----------
// Each group is a box with a title, a short description and a grid of skill tiles (icon + name).
// The box can be folded away with the arrow; it starts open.
function skillGroup(g) {
  const tiles = (g.skills || g.items?.map((name) => ({ name })) || []).filter((sk) => sk.name).map((sk) => {
    const icon = sk.images?.[0];
    return el("li", { class: "skill-tile" }, [
      isUploadedImage(icon) ? el("img", { src: icon.src, alt: "", loading: "lazy", width: "24", height: "24" }) : null,
      el("span", { text: sk.name }),
    ]);
  });
  const arrow = el("span", { class: "row-arrow" });
  arrow.innerHTML = CHEVRON;
  return el("details", { class: "card stack-group", open: "" }, [
    el("summary", { class: "stack-head" }, [
      el("span", {}, [el("h3", { text: g.title || "" }), g.description ? el("p", { text: g.description }) : null]),
      arrow,
    ]),
    el("ul", { class: "skill-tiles" }, tiles),
  ]);
}

// ---------- Experience / Education rows ----------
// One line per entry: dates | Role · Company | tags | arrow. Clicking opens the details in place.
// Uses <details>/<summary>, which browsers make keyboard and screen-reader friendly by default.
const CHEVRON =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function entryRow(section, e) {
  // "Role · Company" -> bold role, grey company
  const [role, ...rest] = (e.title || "").split(" · ");
  const org = rest.join(" · ");
  const tags = [
    e.highlight ? el("li", { class: "row-badge", text: e.highlight }) : null,
    ...(e.tags || []).map((t) => el("li", { class: "row-tag", text: t })),
  ].filter(Boolean);

  const head = [
    el("span", { class: "row-when", text: e.when || "" }),
    el("span", { class: "row-title" }, [
      el("strong", { text: role }),
      org ? el("span", { class: "row-org", text: ` · ${org}` }) : null,
    ]),
    tags.length ? el("ul", { class: "row-tags", "aria-label": "Tags" }, tags) : el("span"),
  ];

  const hasImages = (e.images || []).some(isUploadedImage);
  const body = [
    e.description ? el("p", { class: "row-desc", text: e.description }) : null,
    hasImages ? gallery(e.images) : null,
    readMoreLink(section, e),
  ].filter(Boolean);

  // Nothing to open: a plain row with no arrow
  if (!body.length) return el("div", { class: "row" }, [el("div", { class: "row-head" }, [...head, el("span")])]);

  const arrow = el("span", { class: "row-arrow" });
  arrow.innerHTML = CHEVRON;
  return el("details", { class: "row" }, [
    el("summary", { class: "row-head" }, [...head, arrow]),
    el("div", { class: "row-body" }, body),
  ]);
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

  $("about-body")?.replaceChildren(
    ...(c.about || []).map((p) => el("p", { text: p }))
  );

  $("skills-list")?.replaceChildren(...(c.skills || []).map(skillGroup));
  $("projects-list")?.replaceChildren(
    ...(c.projects || []).map((p) =>
      el("article", { class: "card project" }, [
        projectLinks(p),
        gallery(p.images),
        p.when ? el("span", { class: "when", text: p.when }) : null,
        el("h2", { class: "project-title", text: p.title }), // h2: the page heading "Projects" is the h1
        el("p", { text: p.description }),
        el("ul", { class: "tags" }, (p.tags || []).map((t) => el("li", { text: t }))),
        readMoreLink("projects", p),
      ])
    )
  );

  $("experience-list")?.replaceChildren(...(c.experience || []).map((e) => entryRow("experience", e)));
  $("education-list")?.replaceChildren(...(c.education || []).map((e) => entryRow("education", e)));
  for (const id of ["experience", "education"]) if ($(id)) $(id).hidden = !(c[id] || []).length;

  const certs = c.certifications || [];
  if ($("certifications")) $("certifications").hidden = certs.length === 0;
  $("certs-list")?.replaceChildren(
    ...certs.map((cert) =>
      // Same row style as Education, but nothing to open: status | icon + name · provider
      el("div", { class: "row cert-row" }, [
        el("div", { class: "row-head" }, [
          el("span", { class: "row-when", text: cert.detail || "" }),
          el("span", { class: "row-title" }, [
            // An uploaded image takes the icon's place; otherwise show the chosen emoji
            isUploadedImage(cert.images?.[0])
              ? el("img", { class: "row-icon", src: cert.images[0].src, alt: cert.images[0].alt || "", loading: "lazy" })
              : el("span", { class: "row-icon", "aria-hidden": "true", text: cert.icon || "🏅" }),
            el("span", {}, [
              el("strong", { text: (cert.title || "").split(" · ")[0] }),
              cert.title?.includes(" · ") ? el("span", { class: "row-org", text: ` · ${cert.title.split(" · ").slice(1).join(" · ")}` }) : null,
            ]),
          ]),
          el("span"),
          el("span"),
        ]),
      ])
    )
  );

  const refs = c.references || [];
  if ($("references")) $("references").hidden = refs.length === 0;
  $("references-list")?.replaceChildren(
    ...refs.map((r) =>
      el("figure", { class: "card reference" }, [
        r.quote ? el("blockquote", { text: `“${r.quote}”` }) : null,
        el("figcaption", {}, [el("strong", { text: r.name }), el("small", { text: r.role })]),
      ])
    )
  );

  const ct = c.contact || {};
  $("contact-links")?.replaceChildren(
    ...[
      ct.email && link("Email me", `mailto:${ct.email}`, { icon: "✉️", class: "btn primary" }),
      link("LinkedIn", ct.linkedin, { class: "btn ghost" }),
      link("GitHub", ct.github, { class: "btn ghost" }),
      link("Download CV", ct.cv, { class: "btn ghost" }),
    ].filter(Boolean)
  );

  applySiteChrome(c);
  if ($("typed")) typeTerminal(c.terminal || []);
  // Arrived from a link like /#projects: jump again now that the sections are filled in
  if (!isReload && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
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

  if (motionReduced()) {
    pieces.forEach(([text], i) => (spans[i].textContent = text));
    return;
  }

  let piece = 0, char = 0;
  const tick = () => {
    if (piece >= pieces.length) return;
    // Animations switched off part-way through: show the rest straight away
    if (motionReduced()) {
      pieces.forEach(([text], i) => i >= piece && (spans[i].textContent = text));
      return;
    }
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

loadContent()
  .then(render)
  .catch((err) => {
    console.error(err);
    const msg = document.querySelector(".lead") || document.querySelector("main");
    msg?.prepend(el("p", { class: "message", text: "Sorry, this page couldn't load. Please refresh." }));
  });
