// Home page. Shared helpers (el, link, gallery, loadContent...) are in common.js

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
        el("h3", {}, [
          group.icon ? el("span", { "aria-hidden": "true", text: `${group.icon} ` }) : null,
          document.createTextNode(group.title || ""),
        ]),
        el("ul", { class: "chips" }, (group.items || []).map((s) => el("li", { text: s }))),
      ])
    )
  );

  document.getElementById("projects-list").replaceChildren(
    ...(c.projects || []).map((p) =>
      el("article", { class: "card project" }, [
        el("div", { class: "project-head" }, [
          el("span", { class: "project-icon", "aria-hidden": "true", text: p.icon || "📦" }),
          el("div", { class: "project-links" }, [
            link("GitHub", p.github, { "aria-label": `${p.title}: GitHub (opens in a new tab)` }),
            link("Live", p.live, { icon: "↗", after: true, "aria-label": `${p.title}: live demo (opens in a new tab)` }),
          ]),
        ]),
        gallery(p.images),
        el("h3", { text: p.title }),
        el("p", { text: p.description }),
        el("ul", { class: "tags" }, (p.tags || []).map((t) => el("li", { text: t }))),
        readMoreLink("projects", p),
      ])
    )
  );

  const timeline = (section, entries) =>
    (entries || []).map((e) =>
      el("li", { class: "card" }, [
        el("span", { class: "when", text: e.when }),
        el("h3", { text: e.title }),
        el("p", { text: e.description }),
        gallery(e.images),
        readMoreLink(section, e),
      ])
    );
  document.getElementById("experience-list").replaceChildren(...timeline("experience", c.experience));
  document.getElementById("education-list").replaceChildren(...timeline("education", c.education));

  const certs = c.certifications || [];
  document.getElementById("certs-heading").hidden = certs.length === 0;
  document.getElementById("certs-list").replaceChildren(
    ...certs.map((cert) =>
      el("div", { class: "card cert" }, [
        // An uploaded image takes the icon's place; otherwise show the chosen emoji
        isUploadedImage(cert.images?.[0])
          ? el("img", { class: "cert-icon", src: cert.images[0].src, alt: cert.images[0].alt || "", loading: "lazy" })
          : el("span", { class: "cert-icon", "aria-hidden": "true", text: cert.icon || "🏅" }),
        el("div", {}, [el("strong", { text: cert.title }), el("small", { text: cert.detail })]),
      ])
    )
  );

  const refs = c.references || [];
  document.getElementById("references").hidden = refs.length === 0;
  document.querySelector('.nav-links a[href="#references"]').parentElement.hidden = refs.length === 0;
  document.getElementById("references-list").replaceChildren(
    ...refs.map((r) =>
      el("figure", { class: "card reference" }, [
        r.quote ? el("blockquote", { text: `“${r.quote}”` }) : null,
        el("figcaption", {}, [el("strong", { text: r.name }), el("small", { text: r.role })]),
      ])
    )
  );

  const ct = c.contact || {};
  document.getElementById("contact-links").replaceChildren(
    ...[
      ct.email && link("Email me", `mailto:${ct.email}`, { icon: "✉️", class: "btn primary" }),
      link("LinkedIn", ct.linkedin, { class: "btn ghost" }),
      link("GitHub", ct.github, { class: "btn ghost" }),
      link("Download CV", ct.cv, { class: "btn ghost" }),
    ].filter(Boolean)
  );

  // Number the visible sections 01, 02, 03... so hidden ones (e.g. References with none added) are skipped
  let sectionNumber = 0;
  document.querySelectorAll("main > section.section").forEach((section) => {
    const num = section.querySelector(".section-num");
    if (num && !section.hidden) num.textContent = `${String(++sectionNumber).padStart(2, "0")}.`;
  });

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
    document.querySelector(".lead").textContent = "Sorry, this page couldn't load. Please refresh.";
  });
