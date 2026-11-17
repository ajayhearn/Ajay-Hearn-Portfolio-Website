# Ajay's cloud portfolio

A portfolio site with a built-in admin panel, hosted on Cloudflare Pages.

Live site: https://ajay-hearn-portfolio.pages.dev · Admin panel: https://ajay-hearn-portfolio.pages.dev/admin

**How to look after the site yourself: see [MAINTAINING.md](MAINTAINING.md).**

## How it works

| Part | What it does |
| --- | --- |
| `public/` | The website (HTML, CSS, JS). Served by **Cloudflare Pages**. |
| `public/admin/` | The admin panel at `/admin`, a form for editing every section. |
| `functions/api/content.js` | `GET /api/content` returns the page content (public). |
| `functions/api/login.js` | `POST /api/login` checks the admin password and sets a login cookie. |
| `functions/api/admin/` | Admin-only: load/save content, upload images, log out. `_middleware.js` blocks anyone not logged in. |
| `functions/api/images/` | `GET /api/images/<id>` serves uploaded images (public). |
| `lib/session.js` | Password check, signed login cookie, and lockout after 10 wrong attempts. |
| `lib/content.js` | Validates content before saving (only known fields, safe links, size limits, real image files). |
| `lib/access.js` | Optional: also accepts a Cloudflare Zero Trust Access login, if you set one up later. |
| **Workers KV** | Cloudflare's key-value store, which holds your saved content and images. Images you remove are deleted when you save. |
| `public/content.json` | Default content, used until you first save in the admin panel. |

### Admin login

The password is stored as an encrypted **Cloudflare secret**, never in this code. After logging in you get a
cookie signed with `SESSION_SECRET` that lasts 8 hours and can only be read by the server (`HttpOnly`, `Secure`,
`SameSite=Strict`). Ten wrong passwords from one connection block logins from it for 15 minutes.

**Change the password** (this also logs out every existing session):

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name ajay-hearn-portfolio
npm run deploy
```

## Run it on your computer

```bash
npm install
npm run dev
```

Open http://localhost:8788 for the site and http://localhost:8788/admin for the admin panel.
Locally, the admin panel skips login (set by `.dev.vars`, which never gets uploaded).
Edits saved locally stay on your computer; they don't change the live site.

## Deploy

```bash
npx wrangler login   # once
npm run deploy
```

Pushing to GitHub does **not** deploy; run `npm run deploy` after changing code.
Edits made in the live admin panel go live straight away and don't need a deploy.
