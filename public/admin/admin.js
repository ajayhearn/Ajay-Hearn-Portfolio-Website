// Admin editor: builds a form from SCHEMA, loads the current content, and saves it back.

// ---------- What can be edited ----------
// type: text | textarea | url | email | tags (comma-separated list)
const SCHEMA = [
  {
    page: "Home page",
    title: "Intro",
    hint: "The big heading at the top of the page.",
    fields: [
      { key: "name", label: "Your name" },
      { key: "tagline", label: "Tagline" },
      { key: "intro", label: "Short introduction", type: "textarea" },
    ],
  },
  {
    page: "Home page",
    title: "Terminal box",
    hint: "The lines typed out in the terminal window next to the intro.",
    listKey: "terminal",
    itemName: "line",
    fields: [
      { key: "key", label: "Label" },
      { key: "value", label: "Value" },
    ],
  },
  {
    page: "Home page",
    title: "About me",
    hint: "Each box is one paragraph.",
    listKey: "about",
    itemName: "paragraph",
    plainList: true,
    fields: [{ label: "Paragraph", type: "textarea" }],
  },
  {
    page: "Experience page",
    title: "Education",
    hint: "Each entry is a row that opens to show the details. Put the most recent first.",
    listKey: "education",
    itemName: "education entry",
    fields: [
      { key: "when", label: "Dates" },
      { key: "title", label: "Title (e.g. Qualification · School)" },
      { key: "highlight", label: "Highlight badge (optional, e.g. Gold medal or Distinction)" },
      { key: "tags", label: "Tags shown on the row (optional, e.g. AWS, Linux)", type: "tags" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "images", label: "Images", type: "images" },
      { key: "readMore", label: "Show a “Read more” button linking to its own page", type: "toggle" },
      { key: "details", label: "Read more page: full write-up", type: "textarea", tall: true, showIf: "readMore" },
    ],
  },
  {
    page: "Experience page",
    title: "Certifications",
    listKey: "certifications",
    itemName: "certification",
    hint: "Shown in its own Certifications section, after Education. Each certification shows an emoji icon. Upload an image (e.g. the badge or logo) to show it in the icon's place instead.",
    fields: [
      { key: "icon", label: "Emoji", short: true, placeholder: "🏅" },
      { key: "title", label: "Certification" },
      { key: "detail", label: "Detail (e.g. year or 'In progress')" },
      { key: "images", label: "Icon image (replaces the emoji)", type: "images", max: 1 },
    ],
  },
  {
    page: "Experience page",
    title: "Experience",
    hint: "Work experience and placements. Each one is a row that opens to show the details. Put the most recent first.",
    listKey: "experience",
    itemName: "experience entry",
    fields: [
      { key: "when", label: "Dates" },
      { key: "title", label: "Title (e.g. Role · Company)" },
      { key: "highlight", label: "Highlight badge (optional, e.g. Gold medal or Distinction)" },
      { key: "tags", label: "Tags shown on the row (optional, e.g. AWS, Linux)", type: "tags" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "images", label: "Images", type: "images", max: 6 },
      { key: "readMore", label: "Show a “Read more” button linking to its own page", type: "toggle" },
      { key: "details", label: "Read more page: full write-up", type: "textarea", tall: true, showIf: "readMore" },
    ],
  },
  {
    page: "Experience page",
    title: "References",
    hint: "Shown as quote cards on the Experience page, under Experience. The section is hidden on the site while this list is empty. Avoid putting referees' phone numbers or emails here, because the site is public.",
    listKey: "references",
    itemName: "reference",
    fields: [
      { key: "name", label: "Name" },
      { key: "role", label: "Role and organisation (e.g. Placement Manager · NHS)" },
      { key: "quote", label: "What they said", type: "textarea" },
    ],
  },
  {
    page: "Experience page",
    title: "Skills",
    hint: "Shown on the Experience page. Each group is a box of skills; give each skill a small icon (a square PNG or JPG logo works best).",
    listKey: "skills",
    itemName: "skill group",
    fields: [
      { key: "title", label: "Group name (e.g. Cloud)" },
      { key: "description", label: "Short description (e.g. Platforms I've built on)" },
      { key: "skills", label: "Skills", type: "skillList" },
    ],
  },
  {
    page: "Projects page",
    title: "Projects",
    listKey: "projects",
    itemName: "project",
    fields: [
      { key: "title", label: "Project name" },
      { key: "when", label: "Dates (e.g. Jan 2026 - Mar 2026)" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "tags", label: "Technologies", type: "tags" },
      { key: "github", label: "GitHub link", type: "url" },
      { key: "live", label: "Live demo link", type: "url" },
      { key: "images", label: "Images", type: "images" },
      { key: "readMore", label: "Show a “Read more” button linking to its own page", type: "toggle" },
      { key: "details", label: "Read more page: full write-up", type: "textarea", tall: true, showIf: "readMore" },
    ],
  },
  {
    page: "Contact page",
    title: "Contact",
    objectKey: "contact",
    fields: [
      { key: "message", label: "Message", type: "textarea" },
      { key: "email", label: "Email", type: "email" },
      { key: "linkedin", label: "LinkedIn link", type: "url" },
      { key: "github", label: "GitHub profile link", type: "url" },
      { key: "cv", label: "CV link (e.g. a Google Drive link, or /cv.pdf)", type: "url" },
    ],
  },
  {
    page: "Whole site",
    title: "Link preview",
    hint: "The card shown when your link is pasted into LinkedIn, Discord, WhatsApp, Slack and similar apps. Changes apply as soon as you save, but apps keep old previews for a while (see MAINTAINING.md). The default image has the current name and headline written on it, so upload your own if you change the text.",
    objectKey: "preview",
    fields: [
      { key: "title", label: "Title" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "images", label: "Image (JPG or PNG, ideally 1200 × 630 pixels; leave empty for the default)", type: "images", max: 1, jpegOrPng: true },
    ],
  },
];

// What the site uses when the Link preview boxes are empty (matches the tags in public/index.html)
const PREVIEW_DEFAULTS = {
  title: "Ajay Hearn",
  description: "T Level Digital Support and Security Student | Amazon (IMDb) and NHS Industry Placement Student | Aspiring Solutions Architect Degree Apprentice",
};

// ---------- State ----------
let content = null;
let dirty = false;
const openSections = new Set(["Intro"]);

const form = document.getElementById("editor");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");

function setStatus(text, kind = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${kind}`;
}

function markDirty() {
  dirty = true;
  saveBtn.disabled = false;
  setStatus("Unsaved changes");
}

window.addEventListener("beforeunload", (e) => {
  if (dirty) e.preventDefault();
});

// ---------- Small DOM helper (text is always set safely) ----------
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "text") node.textContent = v;
    else if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node[k] = v;
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

// ---------- Images ----------
const MAX_IMAGES = 2;
const MAX_IMAGE_SIDE = 2400; // pixels; only bigger photos are shrunk before upload
const KEEP_ORIGINAL_BYTES = 3 * 1024 * 1024; // photos already this small and sized are uploaded untouched

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
}

// Shrink and compress a photo in the browser so uploads are small and fast
async function prepareImage(file, { jpegOrPng = false } = {}) {
  // Link previews: not every app shows WebP or GIF images, so only allow JPG and PNG
  if (jpegOrPng && !/^image\/(jpeg|png)$/.test(file.type)) throw new Error("Please choose a JPG or PNG image for the link preview");
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    throw new Error("Please choose a JPG, PNG, WebP or GIF image");
  }
  if (file.type === "image/gif") return file; // keep GIF animations as they are

  const bitmap = await createImageBitmap(file);
  // Already a sensible size: upload the original so there's no quality loss at all
  if (Math.max(bitmap.width, bitmap.height) <= MAX_IMAGE_SIDE && file.size <= KEEP_ORIGINAL_BYTES) return file;
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const webp = jpegOrPng ? null : await canvasToBlob(canvas, "image/webp");
  if (webp && webp.type === "image/webp") return webp;
  // Some browsers can't make WebP; use JPEG on a white background instead
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, "image/jpeg");
}

async function uploadImage(file, options) {
  const blob = await prepareImage(file, options);
  if (blob.size > 5 * 1024 * 1024) throw new Error("Image is too large (max 5 MB)");
  const res = await fetch("/api/admin/images", {
    method: "POST",
    headers: { "Content-Type": blob.type },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data.src;
}

function imagesField(field, obj, key) {
  const imgs = (obj[key] ||= []);
  const max = field.max || MAX_IMAGES;

  const thumbs = imgs.map((img, i) =>
    el("div", { class: "thumb" }, [
      el("img", { src: img.src, alt: "" }),
      el("input", {
        type: "text",
        value: img.alt || "",
        placeholder: "Describe the image (helps screen readers)",
        oninput: (e) => {
          img.alt = e.target.value;
          markDirty();
        },
      }),
      el("button", {
        type: "button",
        class: "btn small danger",
        text: "Remove",
        onclick: () => {
          imgs.splice(i, 1);
          markDirty();
          build();
        },
      }),
    ])
  );

  let adder = null;
  if (imgs.length < max) {
    const fileInput = el("input", { type: "file", accept: field.jpegOrPng ? "image/jpeg,image/png" : "image/jpeg,image/png,image/webp,image/gif", hidden: true });
    const button = el("button", { type: "button", class: "btn small ghost", text: "+ Add image", onclick: () => fileInput.click() });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      button.disabled = true;
      button.textContent = "Uploading…";
      try {
        imgs.push({ src: await uploadImage(file, { jpegOrPng: field.jpegOrPng }), alt: "" });
        markDirty();
        build();
      } catch (err) {
        button.disabled = false;
        button.textContent = "+ Add image";
        alert(`Couldn't upload that image: ${err.message}`);
      }
    });
    adder = el("div", { class: "thumb add" }, [button, fileInput]);
  }

  return el("div", { class: "field" }, [
    el("span", { text: `${field.label} (${imgs.length}/${max})` }),
    el("div", { class: `thumbs${max === 1 ? " single" : ""}` }, [...thumbs, adder]),
    el("small", { text: "Images appear on the site after you click Save changes." }),
  ]);
}

// ---------- Skills: a compact list of name + icon ----------
function skillListField(field, obj, key) {
  const skills = (obj[key] ||= []);
  const rows = skills.map((skill, i) => {
    skill.images ||= [];
    const icon = skill.images[0];
    const fileInput = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true });
    const iconBtn = el("button", {
      type: "button",
      class: "skill-icon-btn",
      title: icon ? "Change icon" : "Add icon",
      "aria-label": `${icon ? "Change" : "Add"} icon for ${skill.name || "this skill"}`,
      onclick: () => fileInput.click(),
    }, [icon ? el("img", { src: icon.src, alt: "" }) : el("span", { text: "+ Icon" })]);
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      iconBtn.disabled = true;
      try {
        skill.images = [{ src: await uploadImage(file), alt: "" }];
        markDirty();
        build();
      } catch (err) {
        iconBtn.disabled = false;
        alert(`Couldn't upload that icon: ${err.message}`);
      }
    });
    const move = (d) => {
      const j = i + d;
      if (j < 0 || j >= skills.length) return;
      [skills[i], skills[j]] = [skills[j], skills[i]];
      markDirty();
      build();
    };
    return el("div", { class: "skill-row" }, [
      iconBtn,
      fileInput,
      el("input", {
        type: "text",
        value: skill.name || "",
        placeholder: "Skill name",
        "aria-label": "Skill name",
        oninput: (e) => { skill.name = e.target.value; markDirty(); },
      }),
      icon ? el("button", { type: "button", class: "btn small ghost", text: "No icon", title: "Remove the icon", onclick: () => { skill.images = []; markDirty(); build(); } }) : null,
      el("button", { type: "button", class: "btn small ghost", text: "↑", title: "Move up", disabled: i === 0, onclick: () => move(-1) }),
      el("button", { type: "button", class: "btn small ghost", text: "↓", title: "Move down", disabled: i === skills.length - 1, onclick: () => move(1) }),
      el("button", { type: "button", class: "btn small danger", text: "✕", title: "Remove skill", onclick: () => { skills.splice(i, 1); markDirty(); build(); } }),
    ]);
  });
  return el("div", { class: "field" }, [
    el("span", { text: `${field.label} (${skills.length})` }),
    el("div", { class: "skill-rows" }, rows),
    el("button", { type: "button", class: "btn small ghost", text: "+ Add skill", onclick: () => { skills.push({ name: "", images: [] }); markDirty(); build(); } }),
  ]);
}

// ---------- Form building ----------
// Creates one input bound to obj[key]. For plain lists, obj is the array and key is the index.
function fieldInput(field, obj, key) {
  const type = field.type || "text";
  if (type === "images") return imagesField(field, obj, key);
  if (type === "skillList") return skillListField(field, obj, key);
  if (type === "toggle") {
    const box = el("input", { type: "checkbox", checked: obj[key] === true });
    box.addEventListener("change", () => {
      obj[key] = box.checked;
      markDirty();
      build(); // show or hide the fields that depend on this switch
    });
    return el("label", { class: "field toggle" }, [box, el("span", { text: field.label })]);
  }
  const current = obj[key];
  const isTags = type === "tags";
  const value = isTags ? (current || []).join(", ") : current || "";

  const input =
    type === "textarea"
      ? el("textarea", { value, className: field.tall ? "tall" : "" })
      : el("input", {
          type: type === "url" ? "url" : type === "email" ? "email" : "text",
          value,
          placeholder: field.placeholder || (type === "url" ? "https://…" : ""),
        });

  input.addEventListener("input", () => {
    obj[key] = isTags
      ? input.value.split(",").map((s) => s.trim()).filter(Boolean)
      : input.value;
    markDirty();
  });

  return el("label", { class: "field" }, [
    el("span", { text: field.label }),
    input,
    isTags ? el("small", { text: "Separate with commas" }) : null,
  ]);
}

function fieldsFor(allFields, obj) {
  const fields = allFields.filter((f) => !f.showIf || obj[f.showIf] === true);
  const shortFields = fields.filter((f) => f.short);
  const rest = fields.filter((f) => !f.short);
  const nodes = [];
  // Put a short field (emoji) side by side with the next field to save space
  if (shortFields.length && rest.length) {
    nodes.push(el("div", { class: "row" }, [fieldInput(shortFields[0], obj, shortFields[0].key), fieldInput(rest[0], obj, rest[0].key)]));
    rest.slice(1).forEach((f) => nodes.push(fieldInput(f, obj, f.key)));
  } else {
    fields.forEach((f) => nodes.push(fieldInput(f, obj, f.key)));
  }
  return nodes;
}

function emptyItem(section) {
  if (section.plainList) return "";
  const item = {};
  section.fields.forEach((f) => (item[f.key] = ["tags", "images", "skillList"].includes(f.type) ? [] : f.type === "toggle" ? false : ""));
  return item;
}

function listEditor(section) {
  const items = (content[section.listKey] ||= []);
  const nodes = items.map((item, i) => {
    const move = (delta) => {
      const j = i + delta;
      if (j < 0 || j >= items.length) return;
      [items[i], items[j]] = [items[j], items[i]];
      markDirty();
      build();
    };
    const remove = () => {
      if (!confirm(`Remove this ${section.itemName}?`)) return;
      items.splice(i, 1);
      markDirty();
      build();
    };
    const head = el("div", { class: "item-head" }, [
      el("strong", { text: `${section.itemName[0].toUpperCase()}${section.itemName.slice(1)} ${i + 1}` }),
      el("button", { type: "button", class: "btn small ghost", text: "↑", title: "Move up", disabled: i === 0, onclick: () => move(-1) }),
      el("button", { type: "button", class: "btn small ghost", text: "↓", title: "Move down", disabled: i === items.length - 1, onclick: () => move(1) }),
      el("button", { type: "button", class: "btn small danger", text: "Remove", onclick: remove }),
    ]);
    const body = section.plainList ? [fieldInput(section.fields[0], items, i)] : fieldsFor(section.fields, item);
    return el("div", { class: "item" }, [head, ...body]);
  });

  nodes.push(
    el("button", {
      type: "button",
      class: "btn ghost",
      text: `+ Add ${section.itemName}`,
      onclick: () => {
        items.push(emptyItem(section));
        markDirty();
        build();
      },
    })
  );
  return nodes;
}

function build() {
  let lastPage = null;
  const body = SCHEMA.flatMap((section) => {
    let inner;
    if (section.listKey) inner = listEditor(section);
    else if (section.objectKey) inner = fieldsFor(section.fields, (content[section.objectKey] ||= {}));
    else inner = fieldsFor(section.fields, content);

    const details = el("details", { class: "section", open: openSections.has(section.title) }, [
      el("summary", { text: section.title }),
      el("div", { class: "section-body" }, [section.hint ? el("p", { class: "hint", text: section.hint }) : null, ...inner]),
    ]);
    details.addEventListener("toggle", () => {
      details.open ? openSections.add(section.title) : openSections.delete(section.title);
    });
    // A small heading whenever the page changes ("Home page", "Experience page"...)
    const heading = section.page !== lastPage ? el("h2", { class: "page-group", text: section.page }) : null;
    lastPage = section.page;
    return heading ? [heading, details] : [details];
  });
  form.replaceChildren(...body);
}

// ---------- Login ----------
const loginForm = document.getElementById("login");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout");

function showLogin() {
  form.hidden = true;
  messageEl.hidden = true;
  logoutBtn.hidden = true;
  saveBtn.disabled = true;
  document.getElementById("who").textContent = "";
  loginForm.hidden = false;
  document.getElementById("password").focus();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const password = document.getElementById("password").value;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    loginError.textContent = data.error || `Error ${res.status}`;
    return;
  }
  document.getElementById("password").value = "";
  loginForm.hidden = true;
  if (content) {
    // Logged in again after the session ran out: keep the unsaved edits
    form.hidden = false;
    logoutBtn.hidden = false;
    document.getElementById("who").textContent = "Logged in";
    saveBtn.disabled = !dirty;
    setStatus(dirty ? "Logged in again. Click Save changes." : "");
  } else {
    load();
  }
});

logoutBtn.addEventListener("click", async () => {
  if (dirty && !confirm("You have unsaved changes. Log out anyway?")) return;
  await fetch("/api/admin/logout", { method: "POST" });
  dirty = false;
  content = null;
  setStatus("");
  showLogin();
});

// ---------- Load & save ----------
async function load() {
  try {
    const res = await fetch("/api/admin/content", { cache: "no-store" });
    if (res.status === 401) return showLogin();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    content = data.content;
    // Show what the preview currently uses, so the boxes aren't empty the first time
    content.preview ||= {};
    content.preview.title ||= PREVIEW_DEFAULTS.title;
    content.preview.description ||= content.intro || PREVIEW_DEFAULTS.description;
    content.preview.images ||= [];
    // Older saves stored each skill as just a name; give them the new { name, images } shape
    for (const g of content.skills || []) {
      if (!Array.isArray(g.skills)) g.skills = (g.items || []).map((name) => ({ name, images: [] }));
      delete g.items;
      delete g.icon;
    }
    document.getElementById("who").textContent = "Logged in";
    logoutBtn.hidden = false;
    messageEl.hidden = true;
    form.hidden = false;
    build();
  } catch (err) {
    messageEl.hidden = false;
    messageEl.textContent = `Couldn't open the editor: ${err.message}`;
    messageEl.className = "message error";
  }
}

saveBtn.addEventListener("click", async () => {
  saveBtn.disabled = true;
  setStatus("Saving…");
  try {
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    if (res.status === 401) {
      setStatus("Your login ran out. Log in again; your changes are kept.", "error");
      return showLogin();
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    content = data.content; // use the cleaned-up version the server stored
    dirty = false;
    build();
    setStatus(`Saved at ${new Date().toLocaleTimeString()}`, "ok");
  } catch (err) {
    saveBtn.disabled = false;
    setStatus(`Not saved: ${err.message}`, "error");
  }
});

load();
