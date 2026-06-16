# Godlove Tikum — Portfolio

A personal portfolio and admin dashboard system for a freelance web developer. Built as a reusable template: fork it, edit one config file, add your GitHub secrets, and deploy with three button clicks — all from a phone.

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
│   └── schema/           ── SQL migration files (run in order: 01 → 12)
│
├── GAS/
│   └── email.js          ── Google Apps Script email transport (deployed separately)
│
├── Netlify/              ── Legacy redirect shim (see note below)
│
└── portfolio.config.json ── Single source of truth for all public deploy-time values
```

**Request flow:**  
Visitor → Cloudflare Pages (Public) → CF Pages Function → Supabase Edge Function → PostgreSQL  
Admin → Cloudflare Pages (Admin) → CF Pages Function → Supabase Edge Function → PostgreSQL  
Email → Supabase Edge Function → Google Apps Script webhook → Gmail

---

## Using this as a Template

1. **Fork the repository** on GitHub.

2. **Edit `portfolio.config.json`** (one file, all public values — safe to commit):
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
   Replace images in `Public/public/assets/images/` with your own (keep the same filenames or update `index.html`).

3. **Add GitHub secrets** (Settings → Secrets and variables → Actions):

   | Secret | Where to get it |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | CF dashboard → My Profile → API Tokens |
   | `CLOUDFLARE_ACCOUNT_ID` | CF dashboard → right-side panel |
   | `CF_PUBLIC_PROJECT` | Name of your CF Pages project for the public site |
   | `CF_ADMIN_PROJECT` | Name of your CF Pages project for the admin dashboard |
   | `SUPABASE_ACCESS_TOKEN` | Supabase dashboard → Account → Access Tokens |
   | `SUPABASE_PROJECT_REF` | Supabase dashboard → Project Settings → Reference ID |

4. **Run the three deploy workflows** (from the GitHub Actions tab, works from mobile):
   - **Deploy — Public Portfolio**
   - **Deploy — Admin Dashboard**
   - **Deploy — Supabase Edge Functions**

5. **Set Cloudflare environment variables** for each Pages project in the CF dashboard (these are secrets — never in `portfolio.config.json`):

   Public project:
   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `PORTFOLIO_ORIGIN` | your public site URL |
   | `CLIENT_AUTH_SECRET` | a strong random secret |

   Admin project:
   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `ADMIN_ORIGIN` | your admin site URL |
   | `CLIENT_AUTH_SECRET` | same secret as above |

---

## First-Time Supabase Setup

Run SQL files in order from the Supabase dashboard → SQL Editor:

```
01_extensions_enums.sql
02_tables.sql
03_rls.sql           (if present)
...
10_seed_email_templates.sql
```

Deploy Edge Functions (step 4 above covers this).

Set Supabase secrets (Dashboard → Edge Functions → Manage secrets):
| Secret | Value |
|---|---|
| `CLIENT_AUTH_SECRET` | same value as the CF env var |
| `GAS_WEBHOOK_URL` | your deployed Google Apps Script web app URL |
| `ADMIN_EMAIL` | the admin inbox email address |

---

## Google Apps Script Email Provider

The email transport is a Google Apps Script web app that receives a POST request from the Supabase email Edge Function and sends via Gmail.

**One-time setup:**
1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Paste the contents of `GAS/email.js` into the editor.
3. Click **Deploy → New deployment → Web app**.
4. Set "Execute as" = **Me** and "Who has access" = **Anyone**.
5. Copy the deployment URL and add it as `GAS_WEBHOOK_URL` in Supabase secrets.

If the GAS project hits a quota or the URL changes after redeployment, update `GAS_WEBHOOK_URL` in Supabase secrets — no code changes needed.

---

## Brand Config (Runtime Values)

The `brand_config` table in Supabase holds runtime key-value pairs used as `{{placeholder}}` substitutions in email templates. These are **not** deploy-time tokens — they are editable from the Admin dashboard under **Settings → Brand Config** without redeploying anything.

Typical brand config keys set after first deploy:
- `owner_name`, `owner_email`, `whatsapp_number`
- `site_url`, `admin_url`
- Any custom `{{placeholder}}` referenced in your email templates

This is intentionally separate from `portfolio.config.json`. The config file handles the static HTML/JS substitution at deploy time; `brand_config` handles the dynamic email template values at runtime.

---

## Netlify Folder

The `Netlify/` folder is a legacy redirect shim from when the portfolio was hosted on Netlify. It contains a single `index.html` that redirects all visitors to the current Cloudflare Pages domain, preserving URL paths.

**Keep it deployed on Netlify** if the old Netlify URL is still in circulation (bookmarks, search engine results). It requires no maintenance and will continue to redirect correctly as long as `SITE_URL` in `Netlify/index.html` points to the active domain.

If the Netlify project has been deleted and no traffic comes from the old domain, the folder can be removed.

---

## Deploy Workflows

All three workflows are triggered manually from **GitHub → Actions tab** (works from the GitHub mobile app).

| Workflow | What it does |
|---|---|
| **Deploy — Public Portfolio** | Substitutes `__TOKEN__` values from `portfolio.config.json`, deploys `Public/` to Cloudflare Pages |
| **Deploy — Admin Dashboard** | Same substitution for Admin files, deploys `Admin/` to Cloudflare Pages |
| **Deploy — Supabase Edge Functions** | Deploys all functions in `Supabase/functions/` using the Supabase CLI. Optionally pass a single function name to deploy only that function. |

---

## Token System

Source files contain `__TOKEN_NAME__` placeholders (double underscores). GitHub Actions reads `portfolio.config.json`, converts each key to uppercase, and runs `sed` across all HTML and JS files before deploying. The substituted files are never committed — only the source files with tokens are in git.

**These are deploy-time tokens, distinct from runtime email template `{{placeholders}}`.**  
Do not confuse the two: `__OWNER_NAME__` is replaced once at deploy time; `{{name}}` is resolved from `brand_config` on every email send.

---

## Local Development (Optional)

**Public site:**
```sh
cd Public
npx wrangler pages dev . --compatibility-flag=nodejs_compat
# Secrets go in Public/.dev.vars
```

**Admin dashboard:**
```sh
cd Admin
npx wrangler pages dev . --compatibility-flag=nodejs_compat
# Secrets go in Admin/.dev.vars
```

**Supabase Edge Functions:**
```sh
supabase start
supabase functions serve --env-file ./Supabase/.env.local
```

For local dev, token substitution is not run — use the hardcoded values in the source files directly (or create a local `.dev.vars` that sets the equivalent runtime values).
