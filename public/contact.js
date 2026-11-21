// Contact form page: sends the form to /api/contact, which posts it to Discord
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const button = form.querySelector("button[type=submit]");
const messageBox = form.elements.message;
const counter = document.getElementById("char-count");

messageBox.addEventListener("input", () => (counter.textContent = `${messageBox.value.length} / 2000`));

// ---------- Cloudflare Turnstile (human check) ----------
let turnstileOn = false;
let turnstileToken = "";
let widgetId = null;

async function setUpTurnstile() {
  const { turnstileSiteKey } = await (await fetch("/api/contact", { cache: "no-store" })).json();
  if (!turnstileSiteKey) return;
  turnstileOn = true;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("The verification check couldn't load. Please refresh the page, or use email or LinkedIn."));
    document.head.append(script);
  });
  const box = document.getElementById("turnstile");
  box.hidden = false;
  widgetId = window.turnstile.render(box, {
    sitekey: turnstileSiteKey,
    theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    callback: (token) => (turnstileToken = token),
    "expired-callback": () => (turnstileToken = ""),
    "error-callback": () => {
      turnstileToken = "";
      showStatus("The verification check had a problem. Please try again.", "error");
    },
  });
}
setUpTurnstile().catch((err) => {
  turnstileOn = true; // still required by the server, so explain why sending won't work
  showStatus(err.message, "error");
});

// A token can only be used once, so get a fresh one after each attempt
function resetTurnstile() {
  turnstileToken = "";
  if (widgetId !== null) window.turnstile?.reset(widgetId);
}

function showStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = `form-status ${kind}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return; // the browser points to the box that needs fixing
  if (turnstileOn && !turnstileToken) {
    showStatus("Please wait a moment for the verification check to finish, then send again.", "error");
    return;
  }
  button.disabled = true;
  button.textContent = "Sending…";
  showStatus("", "");
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), turnstileToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Sorry, something went wrong. Please try again.");
    form.replaceChildren(
      el("p", { class: "form-status ok", role: "status", text: "Thanks, your message has been sent. I'll get back to you soon." })
    );
  } catch (err) {
    showStatus(err.message, "error");
    resetTurnstile();
    button.disabled = false;
    button.textContent = "Send message";
  }
});

loadContent().then(applySiteChrome).catch(() => {});
