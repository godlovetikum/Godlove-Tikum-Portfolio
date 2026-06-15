# Setup

Two setup workflows are available. Both reach the same destination: a fully deployed portfolio with Supabase backend, GAS email transport, two Cloudflare Pages projects, and CI/CD.

---

| Workflow | When to use |
|---|---|
| [**Desktop**](Setup-Desktop.md) | You have a terminal. Uses Supabase CLI, wrangler, and git from the command line. |
| [**Mobile**](Setup-Mobile.md) | No terminal available. Everything done through web dashboards. Edge Functions deployed via GitHub Actions. |

---

## What gets deployed

| Component | Hosting | Folder |
|---|---|---|
| Portfolio (public site) | Cloudflare Pages | `Public/` |
| Admin dashboard | Cloudflare Pages | `Admin/` |
| Edge Functions | Supabase | `Supabase/functions/` |
| Database schema | Supabase | `Supabase/schema/` |
| Email transport | Google Apps Script | `GAS/email.js` |
| SEO redirect layer | Netlify | `Netlify/` |
