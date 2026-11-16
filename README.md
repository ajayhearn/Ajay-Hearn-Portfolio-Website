# Ajay's cloud portfolio

A portfolio site with a built-in admin panel, hosted on Cloudflare.

## How it works

| Part | What it does |
| --- | --- |
| `public/` | The website (HTML, CSS, JS). Served by **Cloudflare Pages**. |
| `public/admin/` | The admin panel at `/admin`, a form for editing every section. |
| `functions/api/content.js` | `GET /api/content` returns the page content (public). |
| `functions/api/admin/` | `GET`/`PUT /api/admin/content` loads and saves content; `POST /api/admin/images` uploads an image (admins only). |
| `functions/api/images/` | `GET /api/images/<id>` serves uploaded images (public). |
| `lib/access.js` | Checks the login token from **Cloudflare Access** and your admin email list. |
| `lib/content.js` | Validates content before saving (only known fields, safe links, size limits). |
| **Workers KV** | Cloudflare's key-value store, which holds your saved content and images. Images you remove are deleted when you save. |
| `public/content.json` | Default content, used until you first save in the admin panel. |

Login is handled by **Cloudflare Zero Trust Access** (free for up to 50 users). You type your
email, get a one-time code, and you're in. There's no password stored anywhere in this code.
The API also checks the login token itself, so changes can't be saved even if the Access rule were set up wrong.

## Run it on your computer

```bash
npm install
npm run dev
```

Open http://localhost:8788 for the site and http://localhost:8788/admin for the admin panel.
Locally, the admin panel skips login (set by `.dev.vars`, which never gets uploaded).

## Put it online (one-time setup)

1. **Create a free Cloudflare account** at https://dash.cloudflare.com/sign-up.
2. **Log Wrangler in:**
   ```bash
   npx wrangler login
   ```
3. **Create the storage**, then paste the `id` it prints into `wrangler.toml`:
   ```bash
   npx wrangler kv namespace create CONTENT
   ```
4. **Deploy:**
   ```bash
   npm run deploy
   ```
   The first time, it asks you to create the project. Your site will be at
   `https://ajay-portfolio.pages.dev` (or similar).
5. **Protect the admin area with Cloudflare Access:**
   1. In the Cloudflare dashboard, open **Zero Trust**. The first time, pick a team name
      (e.g. `ajay`) and the **Free** plan.
   2. Go to **Access → Applications → Add an application → Self-hosted**.
   3. Add two public hostnames, both for your site's domain (e.g. `ajay-portfolio.pages.dev`):
      one with path `admin`, one with path `api/admin`.
   4. Add a policy: **Action** = Allow, **Include** = Emails = *your email*.
   5. Save, then open the application and copy the **Application Audience (AUD) Tag**.
6. **Fill in `wrangler.toml`:**
   ```toml
   TEAM_DOMAIN = "ajay.cloudflareaccess.com"   # your team name + .cloudflareaccess.com
   POLICY_AUD = "the AUD tag you copied"
   ADMIN_EMAILS = "you@example.com"
   ```
   Then run `npm run deploy` again.
7. Visit `/admin`, enter your email, type in the code you're sent, and start editing.

If you later add a custom domain (e.g. `ajay.uk`), add it to the Access application too.

## Editing

Go to `/admin`, make changes, and click **Save changes**. The live site updates straight away.
To change the design (colours, layout), edit `public/styles.css`.
