# Godlove Tikum — Portfolio Monorepo

Full-stack portfolio with contact form, analytics, admin dashboard, and automated email system.
One GitHub repo, deployed as two independent Cloudflare Pages projects backed by a shared Supabase project.

---

## Repo layout

```
/
├── Public/         Cloudflare Pages project — public portfolio site + Pages Functions
├── Admin/          Cloudflare Pages project — private admin dashboard + Pages Functions
├── Supabase/       Supabase Edge Functions (Deno) + SQL schema/migrations
├── GAS/            Google Apps Script — email transport + keep-alive ping
├── Netlify/        Netlify site — permanent 301 redirect layer from old domain
├── Docs/           Documentation, architectural notes and setup guides
├── README.md       This file
```

---

## Projects at a glance

| Project | Hosting | Deploys from | Domain |
|---|---|---|---|
| Portfolio (public) | Cloudflare Pages | `Public/` | `godlovetikum.pages.dev` |
| Admin dashboard | Cloudflare Pages | `Admin/` | `admin.godlovetikum.pages.dev` |
| API / Edge Functions | Supabase | `Supabase/functions/` | `<ref>.supabase.co/functions/v1/` |
| Email transport | Google Apps Script | `GAS/email.js` | Script web app URL |
| Redirect layer | Netlify | `Netlify/` | Old Netlify domain |

---

## Cloudflare Pages — functions folder (common question)

Each CF Pages project is configured with its own **Root Directory** in the Cloudflare dashboard.
Cloudflare resolves the `functions/` directory relative to that Root Directory — not the repo root.

| CF Pages project | Root Directory | Static files | Pages Functions |
|---|---|---|---|
| Portfolio | `Public` | `Public/public/` | `Public/functions/` |
| Admin | `Admin` | `Admin/` (root + dashboard/) | `Admin/functions/` |

You do **not** need to hoist `functions/` to the repo root. The Root Directory setting handles it.

---

## CI/CD

A single GitHub Actions workflow (`.github/workflows/deploy.yml`) detects which directory changed on each push to `main` and only redeploys the affected project(s):

- Changes under `Public/**` → redeploys the Portfolio CF Pages project
- Changes under `Admin/**` → redeploys the Admin CF Pages project
- Changes under `Supabase/**` → redeploys all Supabase Edge Functions
- Manual `workflow_dispatch` → deploys all three


---

## Setup & Deployment

The **[Docs/Setup.md](Docs/Setup.md)** provides two setup approaches for getting your portfolio live and running.
It all depends on your setup 


## Email template placeholders

Templates are stored in the `email_templates` DB table as raw HTML/text with `{{placeholder}}` tokens.
No config values are hardcoded in the codebase. At send time the Edge Function:

1. Fetches the template from the DB
2. Scans the template for `{{token}}` patterns
3. Splits tokens into contact-data keys (`name`, `email`, `message`, …) and brand-config keys
4. Fetches **only** the needed brand-config keys from the `brand_config` table
5. Replaces all tokens — HTML-escaped for `html_body`, raw for `subject` and `text_body`

Adding a new placeholder to any template requires only a matching row in `brand_config` — no code changes.

---

## Tech stack

| Layer | Technology |
|---|---|
| Public site | Vanilla HTML/CSS/JS, no build step |
| Admin dashboard | Vanilla HTML/CSS/JS, no build step |
| Pages Functions | Cloudflare Pages Functions (JS, Node compat) |
| Edge Functions | Supabase Edge Functions (Deno / TypeScript) |
| Database | PostgreSQL via Supabase, all access through typed RPC functions |
| ORM / queries | Supabase JS client + SECURITY DEFINER SQL functions |
| Email transport | Google Apps Script (GmailApp) |
| Auth | Custom session tokens, HttpOnly cookies, bcrypt passwords |
