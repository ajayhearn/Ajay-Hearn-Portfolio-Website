// POST /api/contact  { name, email, message, website }  -> posts the message to a Discord channel
//
// Needs the secret DISCORD_WEBHOOK_URL (Discord: Server Settings > Integrations > Webhooks).
// Set it with:  npx wrangler pages secret put DISCORD_WEBHOOK_URL --project-name ajay-hearn-portfolio
//
// Spam protection:
//  - "website" is a hidden field people never see. Bots that fill in every box get a fake "sent".
//  - Each connection can send 5 messages per hour (counted in KV).
//  - Requiring JSON means other websites can't submit the form on a visitor's behalf.

const MAX_PER_HOUR = 5;
const WEBHOOK = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

const reply = (status, body) => Response.json(body, { status });

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

  // Rate limit per connection
  const key = `contact:${request.headers.get("CF-Connecting-IP") || "unknown"}`;
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
