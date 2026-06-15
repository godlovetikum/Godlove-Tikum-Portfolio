# Documentation Audit Report

**Scope:** All source files and documentation in the portfolio repo  
**Goal:** Clean, project-current documentation written from a fresh-project perspective — no migration history, no stale comments, no gaps that would confuse a developer reading the codebase for the first time.

Each finding lists the file, the original text, and the disposition — either **Fixed** (applied in-place during this audit) or **Noted** (structural knowledge gap addressed in README.md or Setup docs).

---

## 1 · Historical and Migration-Language Comments

Comments and user-facing text that reference past states, describe transitions ("moved from", "old site", "new site", "was previously"), or explain decisions through the lens of what changed rather than what something currently is.

---

### 1-A · `Netlify/netlify.toml` — "old Netlify deployment" language

**Found:**
```toml
# Permanently redirect all traffic from the old Netlify deployment
# to the new Cloudflare Pages site...
# 1. Create a new Netlify site (or re-use the old one).
```
The Netlify site is a permanent SEO redirect layer. Its purpose is defined by what it does now, not by what it replaced. A developer setting up or maintaining this file should read it as a description of intent, not a migration history.

**Fixed:** Comments rewritten to describe the file's purpose — redirect all traffic to godlovetikum.pages.dev — without reference to an "old" or "new" state.

---

### 1-B · `Netlify/index.html` — "Go to the new site" button text

**Found:**
```html
<a href="https://godlovetikum.pages.dev/">Go to the new site</a>
```
From a maintenance perspective, "new" implies a temporary or transitional state. The Cloudflare Pages domain is the permanent address.

**Fixed:** Changed to `Continue to portfolio` — describes the action, not a migration.

---

### 1-C · `Public/public/_redirects` — "old Netlify site" cross-reference

**Found:**
```
# For the 301 redirect FROM the old Netlify site TO this site,
# deploy the netlify-seo-redirect.toml file to your old Netlify project.
```
The `_redirects` file handles in-site routing for the Cloudflare Pages project. It is not the right place to document the separate Netlify redirect layer.

**Fixed:** Removed migration-framing reference. Replaced with a pointer to `Netlify/netlify.toml` for the SEO redirect layer setup.

---

### 1-D · `GAS/email.js` — keep-alive failure alert body

**Found:**
```
This may be due to configuration or connection errors as some setup may have been rotated
or your Supabase project may be paused due to inactivity.
```
"Some setup may have been rotated" is speculative and implies an external actor changed something. The actual causes are finite and known.

**Fixed:** Rewritten to list specific, actionable diagnoses: paused project, incorrect `KEEP_ALIVE_URL`, expired credentials.

---

## 2 · Redundant or Trivial Comments

Comments that state what the code already makes obvious, or that encode the comment author's uncertainty into the log record itself.

---

### 2-A · `GAS/email.js` — pre-send log notes string

**Found:**
```js
const notes = 'This is a pre-send log. It does not tell if this email goes through or not';
```
This string is written to the spreadsheet `notes` column. It documents the comment author's caveat, not anything useful to someone reading the log later.

**Fixed:** Replaced with `'pre-send'` — a concise log status label.

---

## 3 · Inaccurate Comments

Comments where the stated behaviour does not match what the code actually does.

---

### 3-A · `Supabase/functions/_shared/auth.ts` — `verifyClientAuth` param doc

**Found:**
```ts
* @param body The incoming Request body.
```
`verifyClientAuth` receives a `Request` object and reads the `Authorization` header. It never reads the body.

**Fixed:** Changed to `@param req The incoming Request.`

---

### 3-B · `Supabase/functions/_shared/auth.ts` — `extractBearerToken` function doc

**Found:**
```ts
* Extracts the authorization token from the request body.
```
The function reads `req.headers.get("Authorization")` — the header, not the body.

**Fixed:** Changed to `Extracts the Bearer token from the Authorization header.`

---

### 3-C · `Admin/README.md` — auth flow describes Supabase Auth

**Found:**
```
Supabase auth Edge Function
signInWithPassword → access_token + refresh_token
CF Pages Function sets HttpOnly cookies:
  sb_access_token, sb_refresh_token
```
The project uses a custom auth system — `public.users` and `public.sessions` tables defined in `Supabase/schema/12_admins.sql`. There is no `signInWithPassword` call and no `sb_access_token` cookie. The Edge Function runs `validate_password` → `create_session` and returns a custom opaque session token.

**Fixed:** Auth flow diagram rewritten to reflect the actual custom session system.

---

### 3-D · `Admin/README.md` — notes claim "Supabase Auth users"

**Found:**
```
The /api/auth/login endpoint only works for existing Supabase Auth users.
```
Admin users are rows in `public.users`, not Supabase Auth identities. They are created by running `Supabase/schema/12_admins.sql`.

**Fixed:** Rewritten to describe how admin users are actually created.

---

### 3-E · `Admin/README.md` — `_shared.js` pattern note

**Found:**
```
All CF Pages Functions import parseCookies and makeCorsHeaders from functions/api/_shared.js
```
The shared utilities live at `Admin/functions/api/_shared/` — a directory containing `validators.js`, `response.js`, and `forwarder.js`. There is no `_shared.js` barrel.

**Fixed:** Note rewritten to describe the actual `_shared/` directory and its three modules.

---

### 3-F · `Admin/README.md` — directory layout uses pre-restructure path `Admin-dashboard/`

**Found:**
```
Admin-dashboard/
├── dashboard/
...
```
The repo root directory is `Admin/`, not `Admin-dashboard/`.

**Fixed:** Directory tree and all path references updated to `Admin/`.

---

## 4 · Documentation Gaps

Things a developer setting up or contributing to this project would need to know that are not documented clearly anywhere. Each gap below is now addressed in the file indicated.

---

### Gap 1 · Why Netlify exists alongside Cloudflare Pages

**Gap:** The repo has a `Netlify/` folder and an active Netlify deployment alongside a Cloudflare Pages deployment. With no explanation, a developer might assume Netlify is a leftover artefact and remove it.

**What it is:** The Netlify site exists solely as a permanent SEO redirect layer. It permanently 301-redirects all requests from the Netlify domain to godlovetikum.pages.dev, preserving URL paths. Any external links, search engine indices, or bookmarks pointing to the Netlify domain continue to resolve correctly. Removing the Netlify site would silently break all inbound links from third-party sites.

**Addressed in:** README.md (Architecture table), Setup-Desktop.md and Setup-Mobile.md (Netlify section).

---

### Gap 2 · Why Google Apps Script handles email

**Gap:** There is no explanation of why GAS is used for email transport rather than a dedicated transactional service.

**What it is:** `GmailApp` sends email directly from a Gmail account with no API keys, no verified sending domain, and no billing. For a personal portfolio with low email volume, it eliminates a third-party service dependency entirely. The trade-off is that GmailApp is only available inside the Google Apps Script runtime — the GAS web app is the only integration point.

**Addressed in:** GAS/email.js file header (already documented). README.md architecture table.

---

### Gap 3 · Why GAS pings Supabase every few days

**Gap:** The `pingSupabase` function and the `installTrigger` setup step have no explanation of why scheduled pings are necessary.

**What it is:** Supabase pauses Edge Functions on free-tier projects after one week without any invocation. The GAS time-based trigger sends a GET to the `ping` Edge Function on a fixed schedule, keeping the project active. Without this, the first contact form submission after a quiet week triggers a ~30-second cold start during which the email Edge Function is unavailable and the send will time out.

**Addressed in:** GAS/email.js file header (already documented). Setup-Desktop.md and Setup-Mobile.md (GAS section, step 4).

---

### Gap 4 · Custom auth system — why not Supabase Auth

**Gap:** The project uses `public.users` and `public.sessions` tables with bcrypt + opaque session tokens. There is no explanation for why Supabase's built-in Auth is not used.

**What it is:** The admin dashboard has exactly one user (the portfolio owner). Supabase Auth adds a JWT flow, email verification, and a separate user namespace that provide no benefit for a single-user system. The custom approach gives direct control over session lifetime, role enforcement, and token format. Admin accounts are created by running `12_admins.sql` directly — there is no self-registration surface.

**Addressed in:** Admin/README.md (Auth flow section and Notes).

---

### Gap 5 · The `CLIENT_AUTH_SECRET` shared secret — what it authenticates

**Gap:** `CLIENT_AUTH_SECRET` is set in three places (CF Pages public, CF Pages admin, Supabase Edge Functions) but its purpose as a gateway authentication mechanism is never explained.

**What it is:** Every public-facing Supabase Edge Function validates the `Authorization: Bearer <CLIENT_AUTH_SECRET>` header. This ensures requests reaching the Edge Function originated from a trusted CF Pages Function and not from an arbitrary HTTP client. It is the authentication layer between the Cloudflare gateway and the Supabase backend. The Cloudflare Pages Function sets this header before forwarding requests; clients (browser JS) never see the secret.

**Addressed in:** README.md (Architecture notes), both Setup docs (environment variable tables), Admin/README.md (Notes).

---

### Gap 6 · Supabase `_shared/` module — how Deno handles relative imports at deploy time

**Gap:** `Supabase/functions/_shared/` contains shared TypeScript modules imported by every Edge Function via relative paths (`../../_shared/db.ts`). A developer adding a new Edge Function or troubleshooting deploy errors would not know whether these paths are bundled or whether `_shared/` needs to be co-located in each function's directory.

**What it is:** The Supabase CLI bundles each Edge Function directory independently at deploy time, but it includes sibling directories referenced via relative imports. Relative `../` imports into `_shared/` work because the CLI follows the import graph. No manual file copying is required. If a deploy fails with a module-not-found error, confirm that `--functions-dir` is set to the parent of both the function directory and `_shared/`.

**Addressed in:** Setup-Desktop.md (Supabase section, deploy notes).

---

### Gap 7 · How to add a new email placeholder

**Gap:** The `{{placeholder}}` system in email templates is documented in the `templates.ts` file header but is not mentioned in any higher-level doc. A developer editing a template in the admin dashboard who wants to add a new dynamic value would not know the process.

**What it is:** Any `{{token}}` added to a template's `subject`, `html_body`, or `text_body` column is automatically resolved at send time — the Edge Function scans the template content, identifies which tokens are not contact-data keys, and fetches their values from the `brand_config` table. Adding a new placeholder requires only inserting a matching row into `brand_config`. No code changes are needed.

**Addressed in:** README.md (Email template placeholders section).

---

## 5 · Changes Made — File Reference

| File | Change |
|---|---|
| `Netlify/netlify.toml` | Removed "old Netlify deployment" migration language |
| `Netlify/index.html` | "Go to the new site" → "Continue to portfolio" |
| `Public/public/_redirects` | Removed "old Netlify site" reference; added pointer to Netlify/ |
| `GAS/email.js` | Fixed pre-send notes string; rewrote keep-alive failure alert body |
| `Supabase/functions/_shared/auth.ts` | Fixed two inaccurate JSDoc param descriptions |
| `Admin/README.md` | Fixed directory layout; rewrote auth flow; corrected all inaccurate notes; fixed paths |
| `Setup.md` | Converted to index document pointing to desktop and mobile workflows |
| `Setup-Desktop.md` | Full CLI-based setup workflow (new file) |
| `Setup-Mobile.md` | Web-UI-only setup workflow, functions deployed via CI/CD (new file) |
