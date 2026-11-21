// "Read more" page: /details?section=projects&id=ab12cd34
const SECTIONS = {
  projects: { label: "Project", back: "Back to projects" },
  experience: { label: "Experience", back: "Back to experience" },
  education: { label: "Education", back: "Back to education" },
};

const params = new URLSearchParams(location.search);
const sectionKey = params.get("section");
const itemId = params.get("id");
const section = SECTIONS[sectionKey];
const box = document.getElementById("details");

function notFound() {
  box.replaceChildren(
    el("h1", { text: "Page not found" }),
    el("p", { class: "summary", text: "This page doesn't exist or has been removed." })
  );
}

function renderDetails(c) {
  applySiteChrome(c);


  if (!section) return notFound();
  const home = sectionKey === "projects" ? "/projects" : "/experience";
  markCurrentPage(home);
  const back = document.getElementById("back");
  back.href = home;
  back.textContent = sectionKey === "projects" ? "← Back to projects" : "← Back to experience";

  const item = (c[sectionKey] || []).find((i) => i.id === itemId);
  if (!item || !item.readMore) return notFound();

  document.title = `${item.title} | ${c.name || "Portfolio"}`;
  const isProject = sectionKey === "projects";
  const eyebrow = [section.label, item.when].filter(Boolean).join(" · ");

  box.replaceChildren(
    ...[
      el("p", { class: "eyebrow", text: eyebrow }),
      el("h1", { text: item.title }),
      item.description ? el("p", { class: "summary", text: item.description }) : null,
      isProject && item.tags?.length ? el("ul", { class: "tags" }, item.tags.map((t) => el("li", { text: t }))) : null,
      gallery(item.images),
      item.details ? el("div", { class: "body", text: item.details }) : null,
      isProject ? el("div", { class: "project-links" }, [link("GitHub", item.github), link("Live demo", item.live, { icon: "↗", after: true })]) : null,
    ].filter(Boolean)
  );
}

loadContent()
  .then(renderDetails)
  .catch((err) => {
    console.error(err);
    box.replaceChildren(el("p", { class: "message", text: "Sorry, this page couldn't load. Please refresh." }));
  });
