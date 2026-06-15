# Setup — Mobile (Web UI)

No terminal required. Everything is done through web dashboards.
Edge Functions are deployed via GitHub Actions — you push code via the GitHub web editor or GitHub mobile app, and CI/CD handles the deploy.

> **CI/CD first.** Because you cannot run `supabase functions deploy` on mobile, GitHub Actions must be configured before Edge Functions can be deployed. Complete step 6 (CI/CD secrets) before step 1e (Edge Function deploy).

Follow sections in order — each layer depends on the one before it.

---

## 1. Supabase — Database & Edge Functions

### 1a. Create the project

1. [supabase.com](https://supabase.com) → New project.
2. Note the **Project Reference ID** (`<ref>`) and **API URL** from Project Settings → API.

### 1b. Run SQL migrations (in numeric order)

In **Supabase dashboard → SQL Editor**, open and run each file in `Supabase/schema/` in order. Use the GitHub web editor to view file contents, then paste into the SQL editor.

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
10_seed_email_templates.sql      — seeds all email templates
11_seed_brand_config.sql         — seeds placeholder brand config rows
12_admins.sql                    — read this file before running (see note)
```

> **`12_admins.sql`** — contains a commented-out INSERT for the admin user. Uncomment it and replace `YOUR_BCRYPT_HASH` with a real bcrypt hash before running. Use an online bcrypt generator (search "bcrypt hash generator", cost factor 12). Do not run the file with a placeholder hash.

### 1c. Update brand_config values

After running `11_seed_brand_config.sql`, go to **Supabase → Table Editor → brand_config** and update each placeholder row with real values:

| key | value |
|---|---|
| `portfolio_url` | `https://godlovetikum.pages.dev` (or custom domain) |
| `sender_name` | `Godlove Tikum` |
| `sender_email` | Your contact email address |
| `whatsapp_number` | Your WhatsApp number with country code |

All `{{placeholder}}` tokens in email templates resolve from matching rows in this table. Adding a new placeholder only requires a new row — no code changes.

### 1d. Set Edge Function secrets

In **Supabase → Edge Functions → Manage secrets**, add:

| Secret | Value |
|---|---|
| `GAS_EMAIL_URL` | Your deployed GAS web app URL (set after step 2) |
| `GAS_API_KEY` | A random secret — must match `GAS_API_KEY` in GAS Script Properties |
| `CLIENT_AUTH_SECRET` | A random secret — authenticates requests from CF Pages Functions to Supabase |
| `EMAIL_SERVICE_PROVIDER` | `GAS` |
| `KEEP_ALIVE_SECRET` | A random secret — must match `KEEP_ALIVE_SECRET` in GAS Script Properties |
| `TRIGGER_KEY` | A random secret — used by the DB webhook Authorization header |

> **`CLIENT_AUTH_SECRET`** is the gateway authentication secret. Every CF Pages Function sends this as a Bearer token when proxying requests to Supabase Edge Functions. Browser clients never see it.

> **Generate secrets:** Use a password generator or run a few UUIDs together for each secret. Store them in a secure place — you will need them in multiple steps.

### 1e. Deploy Edge Functions

Once CI/CD is set up (step 6), deploy by pushing a change to any file under `Supabase/` in the GitHub web editor, or trigger a manual deploy:

**GitHub → Actions → Deploy → Run workflow → target: `supabase`**

Alternatively, for each individual function you can also deploy from the **Supabase dashboard → Edge Functions** section using the inline editor — paste the function code directly.

### 1f. Create the DB webhook

In **Supabase → Database → Webhooks → Create a new hook**:

| Field | Value |
|---|---|
| Name | `on_contact_inserted` |
| Table | `public.contacts` |
| Event | INSERT |
| Method | POST |
| URL | `https://<ref>.supabase.co/functions/v1/email` |
| Authorization header | `Bearer <TRIGGER_KEY>` (same value as the `TRIGGER_KEY` secret above) |

---

## 2. Google Apps Script — Email transport

GAS sends all email via `GmailApp` from your Gmail account — no transactional email service or API key required.

1. On mobile or desktop browser, go to [script.google.com](https://script.google.com) → New project.
2. Tap/click the default `Code.gs` file, select all, delete, then paste the full contents of `GAS/email.js` (copy from the GitHub web editor).
3. **Project Settings (gear icon) → Script Properties** → Add all six required properties:

| Property | Value |
|---|---|
| `NOTIFY_EMAIL` | Your Gmail address — receives alert emails and is the default reply-to |
| `SENDER_NAME` | Fallback display name for outbound emails |
| `GAS_API_KEY` | Same value as `GAS_API_KEY` in Supabase secrets |
| `KEEP_ALIVE_URL` | `https://<ref>.supabase.co/functions/v1/ping` |
| `KEEP_ALIVE_SECRET` | Same value as `KEEP_ALIVE_SECRET` in Supabase secrets |
| `SPREADSHEET_ID` | ID of a Google Sheet for email and ping logs |

4. **Deploy → New deployment → Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the web app URL → add it as `GAS_EMAIL_URL` in Supabase Edge Function secrets (step 1d).
6. In the Apps Script editor, select the function dropdown → choose `installTrigger` → press Run. This registers the scheduled keep-alive ping.

> **Why `installTrigger()`?** Supabase pauses Edge Functions on free-tier projects after one week without any invocations. The scheduled ping keeps the project active. Without it, the first contact form submission after a quiet period triggers a cold-start delay during which emails cannot be sent.

---

## 3. Cloudflare Pages — Public portfolio

1. [Cloudflare dashboard](https://dash.cloudflare.com) → Pages → Create a project → Connect to Git.
2. Authorize GitHub and select this repository.
3. Configure:

| Setting | Value |
|---|---|
| Project name | `godlovetikum` |
| **Root directory** | `Public` |
| Build command | *(blank — no build step)* |
| Build output directory | `public` |

> CF Pages resolves the `functions/` directory relative to the **Root directory** setting. With Root directory = `Public`, Pages Functions are served automatically from `Public/functions/` — no extra configuration needed.

4. In **Pages → Settings → Environment variables**, add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `PORTFOLIO_ORIGIN` | `https://godlovetikum.pages.dev` (or custom domain) |
| `CLIENT_AUTH_SECRET` | Same value set in Supabase secrets |

---

## 4. Cloudflare Pages — Admin dashboard

1. Cloudflare dashboard → Pages → Create a project → Connect to Git (same repo).
2. Configure:

| Setting | Value |
|---|---|
| Project name | `godlovetikum-admin` |
| **Root directory** | `Admin` |
| Build command | *(blank)* |
| Build output directory | *(blank — serves Admin/ root)* |

3. In **Pages → Settings → Environment variables**, add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `ADMIN_ORIGIN` | `https://admin.godlovetikum.pages.dev` |
| `CLIENT_AUTH_SECRET` | Same value set in Supabase secrets |

4. Ensure `12_admins.sql` was run with a real bcrypt hash (step 1b). The login page authenticates against `public.users` — not Supabase Auth.

---

## 5. Netlify — SEO redirect layer

The Netlify site permanently 301-redirects all traffic from the Netlify domain to `godlovetikum.pages.dev`, preserving paths for search engine continuity. It should remain active as long as the portfolio has inbound links from external sites pointing to the Netlify domain.

1. [Netlify dashboard](https://app.netlify.com) → Add new site → Import an existing project → Connect to GitHub.
2. Select this repository.
3. Set the publish directory to `Netlify`. Leave build command blank.
4. Deploy.

---

## 6. CI/CD — GitHub Actions

> **Do this before step 1e.** GitHub Actions is how Edge Functions get deployed when you cannot use the CLI.

Add these secrets in **GitHub → repository → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Description |
|---|---|
| `CF_API_TOKEN` | Cloudflare API token with Cloudflare Pages: Edit permission |
| `CF_ACCOUNT_ID` | Found in Cloudflare dashboard right sidebar |
| `CF_PUBLIC_PROJECT` | CF Pages project name for the public site (`godlovetikum`) |
| `CF_ADMIN_PROJECT` | CF Pages project name for the admin (`godlovetikum-admin`) |
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token: supabase.com → Account → Access tokens |
| `SUPABASE_PROJECT_REF` | Your Supabase project reference ID |

To create the Cloudflare API token (from Cloudflare dashboard on mobile):
1. Profile → API Tokens → Create Token.
2. Use the **Edit Cloudflare Workers** template → add **Cloudflare Pages: Edit** permission → Continue to summary → Create token.

Once secrets are saved, any push to `main` triggers automatic deployment of the changed project(s). To manually deploy everything:

**GitHub → Actions → Deploy → Run workflow → target: `all`**

---

## Verifying the setup

| Check | How |
|---|---|
| Portfolio loads | Visit `https://godlovetikum.pages.dev` |
| Contact form works | Submit a test message; check email and Supabase contacts table |
| Admin login works | Visit `https://admin.godlovetikum.pages.dev`; log in |
| Analytics showing | Check admin dashboard → Analytics after a few page visits |
| Netlify redirect works | Visit your Netlify domain — should redirect immediately |
| Keep-alive ping works | Check GAS Logs after `installTrigger()` runs; verify KeepAlive sheet row |
