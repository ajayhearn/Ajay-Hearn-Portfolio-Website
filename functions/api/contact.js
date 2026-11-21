// POST /api/contact  { name, email, message, website }  -> posts the message to a Discord channel
//
// Needs the secret DISCORD_WEBHOOK_URL (Discord: Server Settings > Integrations > Webhooks).
// Set it with:  npx wrangler pages secret put DISCORD_WEBHOOK_URL --project-name ajay-hearn-portfolio
//
// Spam protection:
//  - Cloudflare Turnstile: the browser must pass a human check, and the server confirms it with
//    Cloudflare before anything is stored or sent. Needs TURNSTILE_SITE_KEY (public, in wrangler.toml)
//    and the secret TURNSTILE_SECRET_KEY. Until both are set, the form works without it.
//  - "website" is a hidden field people never see. Bots that fill in every box get a fake "sent".
//  - Each connection can send 5 messages per hour (counted in KV).
//  - Requiring JSON means other websites can't submit the form on a visitor's behalf.

const MAX_PER_HOUR = 5;
const WEBHOOK = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

const reply = (status, body) => Response.json(body, { status });

// GET /api/contact -> tells the contact page whether to show the Turnstile check
export function onRequestGet({ env }) {
  const siteKey = env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY ? env.TURNSTILE_SITE_KEY : null;
  return Response.json({ turnstileSiteKey: siteKey }, { headers: { "Cache-Control": "no-store" } });
}

// Ask Cloudflare whether the Turnstile token from the browser is genuine (each token works once)
async function passedTurnstile(env, token, ip) {
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const result = await res.json();
    if (!result.success) console.log("Turnstile rejected", result["error-codes"]);
    return result.success === true;
  } catch (err) {
    console.error("Turnstile check failed", err);
    return false;
  }
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequestPost({ env, request }) {
  if (!env.DISCORD_WEBHOOK_URL || !WEBHOOK.test(env.DISCORD_WEBHOOK_URL)) {
    return reply(503, { error: "The contact form isn't set up yet. Please use email or LinkedIn instead." });
  }
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return reply(415, { error: "Expected JSON" });
  }

  let body;
  try {
    body = JSON.parse((await request.text()).slice(0, 10_000));
  } catch {
    return reply(400, { error: "Invalid request" });
  }

  // Honeypot filled in: pretend it worked so the bot moves on
  if (clean(body.website, 200)) return reply(200, { ok: true });

  const name = clean(body.name, 100);
  const email = clean(body.email, 200);
  const message = clean(body.message, 2000);
  if (!name) return reply(400, { error: "Please enter your name." });
  if (!EMAIL.test(email)) return reply(400, { error: "Please enter a valid email address." });
  if (message.length < 10) return reply(400, { error: "Please write a message of at least 10 characters." });

  // Human check, before anything is written to storage, so bots can't use up the daily KV write limit
  const ip = request.headers.get("CF-Connecting-IP");
  if (env.TURNSTILE_SECRET_KEY && !(await passedTurnstile(env, clean(body.turnstileToken, 2048), ip))) {
    return reply(403, { error: "The verification check didn't pass. Please try again." });
  }

  // Rate limit per connection
  const key = `contact:${ip || "unknown"}`;
  if (env.CONTENT) {
    const count = Number((await env.CONTENT.get(key)) || 0);
    if (count >= MAX_PER_HOUR) {
      return reply(429, { error: "You've sent several messages already. Please try again in an hour." });
    }
    await env.CONTENT.put(key, String(count + 1), { expirationTtl: 60 * 60 });
  }

  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Portfolio contact form",
      allowed_mentions: { parse: [] }, // never let a message ping @everyone or anyone else
      embeds: [
        {
          title: "New message from your portfolio",
          description: message,
          color: 0x0b74d6,
          fields: [
            { name: "Name", value: name, inline: true },
            { name: "Email", value: email, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Discord webhook failed", res.status, await res.text());
    return reply(502, { error: "Sorry, the message couldn't be sent right now. Please try email or LinkedIn." });
  }
  return reply(200, { ok: true });
}
