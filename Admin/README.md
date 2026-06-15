# Admin Dashboard

Private admin dashboard for the Godlove Tikum portfolio. Deployed as a separate Cloudflare Pages project with session-protected access.

## Stack

| Layer | Technology |
|---|---|
| Hosting | Cloudflare Pages (`admin.godlovetikum.pages.dev`) |
| API gateway | Cloudflare Pages Functions (`functions/api/`) |
| Backend | Supabase Edge Functions (shared with the portfolio) |
| Frontend | Vanilla HTML / CSS / JS — no framework |

---

## Directory layout

```
Admin/
├── dashboard/
│   └── index.html              # Single-page admin app
├── assets/
│   ├── styles/
│   │   └── admin.css           # Dark-default + light mode tokens, full design system
│   └── scripts/
│       ├── api.js              # Central API client for all admin requests
│       ├── analytics.js        # Analytics section: KPIs, trend, raw views
│       ├── contacts.js         # Contact submissions section
│       ├── email.js            # Templates editor, compose modal, outbound history
│       ├── auth.js             # Session guard + login/logout/refresh logic
│       ├── config.js           # Brand config key-value management
│       ├── export.js           # CSV + print helpers
│       └── utils.js            # fmtNum, fmtDate, escHtml, showToast, etc.
└── functions/
    └── api/
        ├── _shared/            # Shared modules — imported by all Pages Functions
        │   ├── validators.js   # Input parsing, cookie reading, URL param extraction
        │   ├── response.js     # Responder class — success/error/preflight helpers
        │   └── forwarder.js    # forwardToBackend() — proxies requests to Supabase
        ├── analytics.js        # GET /api/analytics
        ├── config.js           # GET/POST/PATCH/DELETE /api/config
        ├── contacts.js         # GET/PATCH /api/contacts
        ├── email.js            # GET/POST/PATCH /api/email
        └── auth/               # /api/auth/* — login, logout, refresh, me
            ├── index.ts
            ├── handle_login.js
            ├── handle_logout.js
            ├── handle_me.js
            └── handle_refresh.js
```

---

## Two-site architecture

| Site | Cloudflare Pages project | Domain |
|---|---|---|
| Portfolio | `godlovetikum` | `godlovetikum.pages.dev` |
| Admin dashboard | `godlovetikum-admin` | `admin.godlovetikum.pages.dev` |

Both sites share the same Supabase project and Edge Functions. They are separate CF Pages projects for security isolation — admin Pages Functions carry `CLIENT_AUTH_SECRET` and handle session cookies; public Pages Functions only accept public contact and analytics events.

---

## Prerequisites

Complete the full stack setup (Supabase schema, Edge Functions, GAS, and the public CF Pages project) before setting up the admin. See [Setup-Desktop.md](../Setup-Desktop.md) or [Setup-Mobile.md](../Setup-Mobile.md).

---

## Cloudflare Pages setup

1. Cloudflare dashboard → Pages → Create a project → Connect to Git.
2. Configure:

| Setting | Value |
|---|---|
| Project name | `godlovetikum-admin` |
| **Root directory** | `Admin` |
| Build command | *(blank — no build step)* |
| Build output directory | *(blank — serves `Admin/` root directly)* |

CF Pages automatically detects `Admin/functions/` as the Pages Functions directory because the Root directory is set to `Admin`.

3. Environment variables (Pages → Settings → Environment variables):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `ADMIN_ORIGIN` | `https://admin.godlovetikum.pages.dev` |
| `CLIENT_AUTH_SECRET` | The shared gateway secret (see `CLIENT_AUTH_SECRET` note below) |

---

## Auth flow

```
Login form → POST /api/auth/login
                 │
                 ▼
         CF Pages Function (handle_login.js)
         Forwards to: POST /auth?action=login (Supabase auth Edge Function)
                 │
                 ▼
         Edge Function: validate_password() → create_session()
         Returns: { token, expires_at }
                 │
                 ▼
         CF Pages Function sets HttpOnly session cookie:
           _gt_admin_session = <session token>
                 │
                 ▼
         All subsequent requests carry the cookie
         CF Function reads cookie → sets Authorization: Bearer <token>
         /api/auth/me → validates token via public.validate_session()
         /api/auth/refresh → extends session before expiry
```

Authentication is a custom session system stored in `public.sessions`. There is no Supabase Auth involvement. Admin accounts are rows in `public.users` created by running `Supabase/schema/12_admins.sql`.

---

## Features

| Section | Description |
|---|---|
| **Analytics** | KPIs (visits, unique visitors, clicks), device split, referrers, geo, engagement. Switch between Overview / Daily Trend / Raw Visitors / Raw Clicks views via the tab strip. Date range filtering. Export as CSV or print. |
| **Contacts** | All form submissions with status, category, geo, and email send history. Click a row to expand details and compose email from context. |
| **Templates** | View, edit, and save all stored email templates via a CodeMirror HTML editor with live preview tab and copy-HTML button. |
| **Compose** | Send standalone emails (with template selector pre-populated from cache) or contact-linked emails (reply/follow-up auto-loads the stored template into the editor). Edit + preview + copy HTML before sending. |
| **Sent History** | Paginated outbound email log with status, type, and retry support. Filter by status and type. |
| **Config** | View, create, update, and delete brand_config key-value pairs. Changes take effect on the next email send. |
| **Export** | Download contacts or analytics as CSV, or print any section via the browser print dialog. |

---

## Local development

```bash
cd Admin
npx wrangler pages dev . --compatibility-flag=nodejs_compat
```

Create `Admin/.dev.vars` (gitignored):
```
SUPABASE_URL=https://<ref>.supabase.co
CLIENT_AUTH_SECRET=dev-secret
ADMIN_ORIGIN=http://localhost:8788
```

---

## Notes

- **Admin user creation.** Admin accounts are created by running `Supabase/schema/12_admins.sql` with a real bcrypt hash. There is no registration UI — all admin users are provisioned directly in the database.
- **Cookie-based sessions.** The session token is stored in an `HttpOnly` cookie set by the CF Pages Function. It is never accessible from client-side JavaScript.
- **`CLIENT_AUTH_SECRET`.** This secret is set in both the CF Pages project (env var) and the Supabase Edge Functions (secret). The CF Pages Function sends it as `Authorization: Bearer <secret>` on every proxied request. Rotate it in both places simultaneously.
- **`_shared/` pattern.** All CF Pages Functions import from `functions/api/_shared/`. The three modules are `validators.js` (cookie/URL/body parsing), `response.js` (the `Responder` class), and `forwarder.js` (`forwardToBackend()`). Never duplicate their logic inline in a handler.
- **Template cache.** The email module fetches all templates once on page load. Saving a template clears the in-memory cache so the next compose open fetches fresh data.
