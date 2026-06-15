# Setup — Desktop (CLI)

Requires: a terminal, Node.js, git, `supabase` CLI, `wrangler` CLI.

Follow sections in order — each layer depends on the one before it.

---

## 1. Supabase — Database & Edge Functions

### 1a. Create the project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Note the **Project Reference ID** (`<ref>`) and **API URL** from Project Settings → API.

### 1b. Run SQL migrations (in numeric order)

Open **Supabase dashboard → SQL Editor** and run each file in `Supabase/schema/` in order:

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

> **`12_admins.sql`** — contains a commented-out INSERT for the admin user. Uncomment it and replace `YOUR_BCRYPT_HASH` with a real bcrypt hash before running. Generate one at https://bcrypt.online (cost factor 12 recommended). Do not run the file with a placeholder hash in production.

### 1c. Update brand_config values

After running `11_seed_brand_config.sql`, the table contains placeholder rows. Update each with real values using the SQL editor or the Supabase Table Editor:

```sql
UPDATE public.brand_config SET value = 'https://godlovetikum.pages.dev' WHERE key = 'portfolio_url';
UPDATE public.brand_config SET value = 'Godlove Tikum'                  WHERE key = 'sender_name';
UPDATE public.brand_config SET value = 'hello@godlovetikum.com'         WHERE key = 'sender_email';
UPDATE public.brand_config SET value = '237XXXXXXXXX'                   WHERE key = 'whatsapp_number';
```

All `{{placeholder}}` tokens in email templates resolve from matching rows in this table. Adding a new placeholder to a template only requires a new `brand_config` row — no code changes.

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

> **`CLIENT_AUTH_SECRET`** is the gateway authentication secret. Every CF Pages Function sets `Authorization: Bearer <CLIENT_AUTH_SECRET>` when proxying requests to Supabase Edge Functions. This ensures only the CF Pages gateway can reach the backend — never browser clients directly.

### 1e. Deploy Edge Functions

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Deploy all functions from repo root
for func in analytics auth config contacts email ping; do
  supabase functions deploy "$func" \
    --project-ref <YOUR_PROJECT_REF> \
    --functions-dir Supabase/functions
done
```

> **Deno import note:** The Supabase CLI bundles each function independently but follows relative imports. The `_shared/` directory is included automatically because every function imports from `../../_shared/`. No file copying is needed.

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

The GAS script sends all email via `GmailApp`, which sends from your Gmail account directly — no transactional email service or verified domain required.

1. Go to [script.google.com](https://script.google.com) → New project.
2. Paste the contents of `GAS/email.js` into the editor.
3. **Project Settings → Script Properties** → Add all six required properties:

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
6. In the Apps Script editor, run `installTrigger()` once to register the keep-alive schedule.

> **Why `installTrigger()`?** Supabase pauses Edge Functions on free-tier projects after one week with no invocations. The time-based trigger sends a scheduled ping to the `ping` Edge Function, keeping the project active. Without it, the first contact form submission after a quiet week triggers a cold-start delay during which emails cannot be sent.

---

## 3. Cloudflare Pages — Public portfolio

### 3a. Create the Pages project

1. Cloudflare dashboard → Pages → Create a project → Connect to Git.
2. Select this repository.
3. Configure:

| Setting | Value |
|---|---|
| Project name | `godlovetikum` |
| **Root directory** | `Public` |
| Build command | *(blank — no build step)* |
| Build output directory | `public` |

> CF Pages resolves the `functions/` directory relative to the **Root directory** setting, not the repo root. With Root directory = `Public`, Pages Functions are automatically served from `Public/functions/`.

### 3b. Environment variables

In **Pages → Settings → Environment variables**:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `PORTFOLIO_ORIGIN` | `https://godlovetikum.pages.dev` (or custom domain) |
| `CLIENT_AUTH_SECRET` | Same value set in Supabase secrets |

---

## 4. Cloudflare Pages — Admin dashboard

### 4a. Create the Pages project

1. Cloudflare dashboard → Pages → Create a project → Connect to Git (same repo).
2. Configure:

| Setting | Value |
|---|---|
| Project name | `godlovetikum-admin` |
| **Root directory** | `Admin` |
| Build command | *(blank)* |
| Build output directory | *(blank — serves Admin/ root)* |

CF Pages serves all files in `Admin/` as static assets and deploys `Admin/functions/` as Pages Functions automatically.

### 4b. Environment variables

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `ADMIN_ORIGIN` | `https://admin.godlovetikum.pages.dev` |
| `CLIENT_AUTH_SECRET` | Same value set in Supabase secrets |

### 4c. Create the admin user

Ensure you ran `Supabase/schema/12_admins.sql` with a real bcrypt hash (step 1b). The login page at `https://admin.godlovetikum.pages.dev` authenticates against `public.users` — not Supabase Auth.

---

## 5. Netlify — SEO redirect layer

The Netlify site permanently 301-redirects all traffic from the Netlify domain to `godlovetikum.pages.dev`, preserving paths for search engine continuity. Removing this site would break any inbound links from third-party sites pointing to the Netlify domain.

1. Create a Netlify site connected to this repo (or reconnect the existing one).
2. Set the publish directory to `Netlify`.
3. No build command needed.

---

## 6. CI/CD — GitHub Actions

The workflow in `.github/workflows/deploy.yml` runs on every push to `main` and deploys only the project(s) whose files changed.

Add these secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `CF_API_TOKEN` | Cloudflare API token with Cloudflare Pages: Edit permission |
| `CF_ACCOUNT_ID` | Found in Cloudflare dashboard right sidebar |
| `CF_PUBLIC_PROJECT` | CF Pages project name for the public site (e.g. `godlovetikum`) |
| `CF_ADMIN_PROJECT` | CF Pages project name for the admin (e.g. `godlovetikum-admin`) |
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token (Account → Access tokens) |
| `SUPABASE_PROJECT_REF` | Your Supabase project reference ID |

To create the Cloudflare API token:
1. Cloudflare → Profile → API Tokens → Create Token.
2. Use the **Edit Cloudflare Workers** template, then add **Cloudflare Pages: Edit** permission.

To manually trigger a full redeploy: GitHub → Actions → Deploy → Run workflow → target: `all`.

---

## Local development

### Public site

```bash
cd Public
npx wrangler pages dev public --compatibility-flag=nodejs_compat
```

Create `Public/.dev.vars`:
```
SUPABASE_URL=https://<ref>.supabase.co
PORTFOLIO_ORIGIN=http://localhost:8788
CLIENT_AUTH_SECRET=dev-secret
```

### Admin dashboard

```bash
cd Admin
npx wrangler pages dev . --compatibility-flag=nodejs_compat
```

Create `Admin/.dev.vars`:
```
SUPABASE_URL=https://<ref>.supabase.co
CLIENT_AUTH_SECRET=dev-secret
ADMIN_ORIGIN=http://localhost:8788
```

### Supabase Edge Functions

```bash
supabase start
supabase functions serve
```
