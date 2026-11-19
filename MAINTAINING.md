# Maintaining this website

Live site: https://ajay-hearn-portfolio.pages.dev · Admin panel: https://ajay-hearn-portfolio.pages.dev/admin

Most upkeep needs no tools at all. You only need the command line when you change the design or how the site works.

## 1. Changing content: just a browser

Go to **/admin**, log in with your password, edit, and click **Save changes**. The site updates straight away.
This works from any computer or phone, and covers all text, projects, experience, education,
certifications, references, images and links.

## 2. Changing the design or features: editing code

| To change | Edit |
| --- | --- |
| Colours, fonts, spacing, layout | `public/styles.css` |
| Page structure, menu links, section order | `public/index.html` |
| How content is shown on the page | `public/script.js` |
| Helpers shared by both pages (theme toggle, images, links) | `public/common.js` |
| The Read more page | `public/details.html`, `public/details.js` |
| Accessibility menu and phone menu | `public/common.js` (bottom of the file); styles at the end of `public/styles.css` |
| Settings applied before the page draws (theme, text size...) | `public/prefs.js` |
| The admin panel's form fields | `public/admin/admin.js` (the `SCHEMA` list at the top) |
| What the server accepts and saves | `lib/content.js` |
| The How I built this site page | `public/how-its-built.html` (written by hand; update it if the setup changes) |
| Contact form page / what it sends | `public/contact.html`, `public/contact.js` / `functions/api/contact.js` |
| Link preview (title, description, image) | the `og:` tags in each page's `<head>`, and `public/og-image.png` |

Adding a new type of field needs changes in both `admin.js` and `lib/content.js`. If you skip
`lib/content.js`, the server throws the new field away when you save.

Run these in Terminal, in the project folder.

**Test your changes on your computer:**

```bash
npm run dev
```

Open http://localhost:8788. The local admin panel at `/admin` needs no password, and anything saved
there stays on your computer only.

**Put the changes live:**

```bash
npm run deploy
```

**Save a copy to GitHub:**

```bash
git add -A
git commit -m "Describe what you changed"
git push
```

Deploying and pushing are separate steps. Pushing to GitHub does **not** update the live site.

## 3. Using a different computer

Do this once:

1. Install **Node.js** (the LTS version) from https://nodejs.org and **Git** from https://git-scm.com.
2. Run:

   ```bash
   git clone https://github.com/ajayhearn/Ajay-Hearn-Portfolio-Website.git
   cd Ajay-Hearn-Portfolio-Website
   npm install
   npx wrangler login
   ```

3. For `npm run dev` without a password, create a file called `.dev.vars` in the folder containing
   the line `DEV_ALLOW_NO_AUTH=true`. It's deliberately not on GitHub, so you'll need to add it yourself.
   It only works on your own computer (localhost), never on the live site.

## 4. Occasional jobs

- **Back up your content.** Admin edits are stored only on Cloudflare, not on GitHub. Every so often, run:

  ```bash
  curl https://ajay-hearn-portfolio.pages.dev/api/content > backup.json
  ```

  This saves the text but not the uploaded images, so keep your own copies of the photos.

- **Change the admin password** (this also logs out everyone who is logged in):

  ```bash
  npx wrangler pages secret put ADMIN_PASSWORD --project-name ajay-hearn-portfolio
  npm run deploy
  ```

- **If Wrangler says you're logged out**, run `npx wrangler login` again.
- **Update the tools** a couple of times a year with `npm update`. Then run `npm run dev` to check
  everything still works before you deploy.

- **Contact form → Discord.** Messages go to the Discord webhook saved as the `DISCORD_WEBHOOK_URL` secret.
  To change channel, make a new webhook in Discord (Server Settings → Integrations → Webhooks), then run
  `npx wrangler pages secret put DISCORD_WEBHOOK_URL --project-name ajay-hearn-portfolio` and `npm run deploy`.
- **Link previews** don't update from the admin panel. If your headline changes, edit the `og:` tags in
  `public/index.html` (and remake `public/og-image.png`). LinkedIn caches previews; refresh it at
  https://www.linkedin.com/post-inspector/ .

## 5. If something breaks

- **The site looks wrong after a deploy:** in the Cloudflare dashboard, go to
  **Workers & Pages → ajay-hearn-portfolio → Deployments**. Find the last good deployment, click **⋯**,
  then **Rollback**. This affects only code. Your content is stored separately and isn't touched.
- **A bad edit in the admin panel:** fix it in the admin panel, or restore a backup. Saved edits
  can't be rolled back.
- **Locked out after too many wrong passwords:** wait 15 minutes.

## Costs

The free Cloudflare plan easily covers a portfolio's traffic, so there's nothing to pay or renew.
You'd only pay if you buy a custom domain.
