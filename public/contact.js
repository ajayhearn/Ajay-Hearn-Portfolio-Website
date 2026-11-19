// Contact form page: sends the form to /api/contact, which posts it to Discord
const form = document.getElementById("contact-form");
const statusEl = document.getElementById("form-status");
const button = form.querySelector("button[type=submit]");
const messageBox = form.elements.message;
const counter = document.getElementById("char-count");

messageBox.addEventListener("input", () => (counter.textContent = `${messageBox.value.length} / 2000`));

function showStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = `form-status ${kind}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return; // the browser points to the box that needs fixing
  button.disabled = true;
  button.textContent = "Sending…";
  showStatus("", "");
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Sorry, something went wrong. Please try again.");
    form.replaceChildren(
      el("p", { class: "form-status ok", role: "status", text: "Thanks, your message has been sent. I'll get back to you soon." })
    );
  } catch (err) {
    showStatus(err.message, "error");
    button.disabled = false;
    button.textContent = "Send message";
  }
});

loadContent().then(applySiteChrome).catch(() => {});
