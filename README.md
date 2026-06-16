# Godlove Tikum — Portfolio

A personal portfolio and admin dashboard system for a freelance web developer. Built as a reusable template: fork it, edit one config file, run `node build.js`, and drag-and-drop to deploy — no CI, no build tools, no npx.

---

## Architecture

The project is split into two independently deployed Cloudflare Pages projects, a Supabase backend, and a Google Apps Script email provider.

```
Godlove-Tikum-Portfolio/
│
├── Public/               ── Public portfolio site (CF Pages project #1)
│   ├── index.html        ── Portfolio homepage
│   ├── assets/
│   │   ├── scripts/      ── analytics.js · app.js · form.js
│   │   ├── styles/       ── app.css · fonts_awesome.css
│   │   └── images/
│   ├── robots.txt · sitemap.xml · _headers · _redirects · llms.txt
│   └── functions/api/    ── CF Pages Functions (edge middleware to Supabase)
│       ├── contact.js    ── POST /api/contact
│       ├── analytics.js  ── POST /api/analytics
│       └── _analytics_config.js  ── allowlist for tracked events
│
├── Admin/                ── Admin dashboard (CF Pages project #2)
│   ├── index.html        ── Login page
│   ├── dashboard/        ── Dashboard shell (index.html + main.js)
│   ├── assets/scripts/   ── api.js · auth.js · analytics.js · contacts.js
│   │                        email.js · config.js · export.js · utils.js · main.js
│   └── functions/api/    ── CF Pages Functions (edge middleware to Supabase)
│       ├── auth.js       ── POST/GET/DELETE /api/auth
│       ├── contacts.js   ── GET/PATCH /api/contacts
│       ├── analytics.js  ── GET /api/analytics
│       ├── email.js      ── GET/POST/PATCH /api/email
│       └── config.js     ── GET/POST/PATCH/DELETE /api/config
│
├── Supabase/
│   ├── functions/        ── Deno Edge Functions (auth, contacts, analytics, email, config)
│   │   └── _shared/      ── types.ts · auth.ts · response.ts · errors.ts · db.ts
│   └── schema/           ── SQL files (run in order: 01 → 12)
│
├── GAS/
│   └── email.js          ── Google Apps Script email transport (deployed separately)
│
├── Netlify/              ── Legacy redirect shim (see note below)
│
├── build.js              ── Token substitution script — run locally before deploying
└── portfolio.config.json ── Single source of truth for all public deploy-time values
```

**Request flow:**
Visitor → Cloudflare Pages (Public) → CF Pages Function → Supabase Edge Function → PostgreSQL
Admin → Cloudflare Pages (Admin) → CF Pages Function → Supabase Edge Function → PostgreSQL
Email → Supabase Edge Function → Google Apps Script webhook → Gmail

---

## Deploy Checklist

### Step 1 — Edit `portfolio.config.json`

All public, non-secret values live in one file. Safe to commit.

```json
{
  "owner_name":       "Your Name",
  "owner_first_name": "First",
  "owner_last_name":  "Last",
  "owner_phone":      "countrycode+number",
  "owner_email":      "you@example.com",
  "owner_location":   "City, Country",
  "owner_title":      "your title",
  "site_url":         "https://yoursite.pages.dev",
  "site_key":         "yoursite-v1",
  "twitter_handle":   "yourhandle",
  ...
}
```

Replace images in `Public/assets/images/` with your own (keep the same filenames, or update `index.html`).

---

### Step 2 — Build (token substitution)

```sh
node build.js
```

This reads `portfolio.config.json`, copies `Public/` and `Admin/` into `dist/`, and replaces every `__TOKEN__` placeholder with its value. The script prints any unresolved tokens so you can catch typos before deploying.

Output:
```
dist/public/   ← ready to upload for the public portfolio
dist/admin/    ← ready to upload for the admin dashboard
```

`dist/` is gitignored — never commit it.

---

### Step 3 — Deploy to Cloudflare Pages (drag-and-drop)

1. Go to **dash.cloudflare.com → Workers & Pages**.
2. Open your **public portfolio** project → **Deployments** → **Upload assets**.
   Drag and drop the `dist/public/` folder into the upload area.
3. Open your **admin dashboard** project → **Deployments** → **Upload assets**.
   Drag and drop the `dist/admin/` folder.

Cloudflare automatically picks up the `functions/` subdirectory inside each folder and deploys it as CF Pages Functions. No Wrangler required.

> **First time?** Create both Pages projects in the CF dashboard before uploading. Choose **"Upload assets"** (not the Git integration).

---

### Step 4 — Set Cloudflare environment variables

Set these in the CF dashboard for each project under **Settings → Environment variables → Production**.

**Public portfolio project:**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `PORTFOLIO_ORIGIN` | your public site URL |
| `CLIENT_AUTH_SECRET` | a strong random secret (min 32 chars) |

**Admin dashboard project:**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `ADMIN_ORIGIN` | your admin site URL |
| `CLIENT_AUTH_SECRET` | same secret as above |

---

### Step 5 — First-time Supabase SQL setup

Open the **Supabase dashboard → SQL Editor** and run each file in `Supabase/schema/` in order. Paste the contents of each file and click **Run**:

```
01_extensions_enums.sql
02_tables.sql
03_indexes.sql
04_rls.sql
05_functions_triggers.sql
06_functions_contact.sql
07_functions_analytics.sql
08_functions_email.sql
09_functions_config.sql
10_seed_email_templates.sql
11_seed_brand_config.sql
12_functions_auth.sql
```

After running `12_functions_auth.sql`, scroll to the **Seed admin user** section at the top of that file, fill in your name, email, and password, uncomment the INSERT, run it once, then comment it back out.

---

### Step 6 — Deploy Supabase Edge Functions

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) once, then run from this directory:

```sh
supabase login

supabase functions deploy analytics   --project-ref <YOUR_REF> --no-verify-jwt
supabase functions deploy auth        --project-ref <YOUR_REF> --no-verify-jwt
supabase functions deploy contacts    --project-ref <YOUR_REF> --no-verify-jwt
supabase functions deploy config      --project-ref <YOUR_REF> --no-verify-jwt
supabase functions deploy email       --project-ref <YOUR_REF> --no-verify-jwt
supabase functions deploy ping_shared --project-ref <YOUR_REF> --no-verify-jwt
```

Find `YOUR_REF` in Supabase dashboard → **Project Settings → General → Reference ID**.

---

### Step 7 — Set Supabase secrets

In the Supabase dashboard → **Edge Functions → Manage secrets**:

| Secret | Value |
|---|---|
| `CLIENT_AUTH_SECRET` | same value as the CF env var |
| `GAS_WEBHOOK_URL` | your deployed Google Apps Script web app URL |
| `ADMIN_EMAIL` | the admin inbox email address |

---

## Google Apps Script Email Provider

The email transport is a Google Apps Script web app that receives a POST from the Supabase email Edge Function and sends via Gmail.

**One-time setup:**
1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Paste the contents of `GAS/email.js` into the editor.
3. Click **Deploy → New deployment → Web app**.
4. Set "Execute as" = **Me** and "Who has access" = **Anyone**.
5. Copy the deployment URL and add it as `GAS_WEBHOOK_URL` in Supabase secrets.

If the GAS project hits a quota or the URL changes after redeployment, update `GAS_WEBHOOK_URL` in Supabase secrets — no code changes needed.

---

## Token System

Source files (`Public/`, `Admin/`) contain `__TOKEN_NAME__` placeholders with double underscores. `build.js` reads `portfolio.config.json`, uppercases each key to form the token name, and substitutes all occurrences before you upload.

**Token substitution targets:** `.html`, `.js`, `.xml` files — excluding anything under `functions/` (those read secrets from CF env vars at runtime, not from file tokens).

**These are deploy-time tokens, distinct from runtime email template `{{placeholders}}`.**
`__OWNER_NAME__` is replaced once when you run `build.js`.
`{{name}}` is resolved from `brand_config` on every email send.

---

## Brand Config (Runtime Values)

The `brand_config` table in Supabase holds runtime key-value pairs used as `{{placeholder}}` substitutions in email templates. Editable from the Admin dashboard under **Settings → Brand Config** without redeploying anything.

Typical keys to set after first deploy:
- `owner_name`, `owner_email`, `whatsapp_number`
- `site_url`, `admin_url`
- Any custom `{{placeholder}}` referenced in your email templates

This is intentionally separate from `portfolio.config.json`. The config file handles the static HTML/JS substitution at build time; `brand_config` handles the dynamic email template values at runtime.

---

## Netlify Folder

The `Netlify/` folder is a legacy redirect shim from when the portfolio was hosted on Netlify. It contains a single `index.html` that redirects all visitors to the current Cloudflare Pages domain, preserving URL paths.

Keep it deployed on Netlify if the old Netlify URL is still in circulation (bookmarks, search engine results). It requires no maintenance and will continue to redirect correctly as long as `SITE_URL` in `Netlify/index.html` points to the active domain.

If the Netlify project has been deleted and no traffic comes from the old domain, the folder can be removed.

---

## Local Development (Optional)

Run the sites locally with Wrangler — no build step needed, tokens stay as placeholders (or set equivalent values in `.dev.vars`).

**Public site:**
```sh
cd Public
npx wrangler pages dev . --compatibility-flag=nodejs_compat
# Secrets go in Public/.dev.vars  (gitignored)
```

**Admin dashboard:**
```sh
cd Admin
npx wrangler pages dev . --compatibility-flag=nodejs_compat
# Secrets go in Admin/.dev.vars  (gitignored)
```

**Supabase Edge Functions:**
```sh
supabase start
supabase functions serve --env-file ./Supabase/.env.local
```
