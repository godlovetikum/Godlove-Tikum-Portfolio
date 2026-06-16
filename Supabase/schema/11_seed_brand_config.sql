-- ============================================================
-- 11_seed_brand_config.sql
-- Seeds all runtime configuration used by the Edge Functions
-- and email templates.
--
-- ⚠  Do NOT edit the placeholder values by hand.
--    Run `node build.js` from the project root — it reads
--    portfolio.config.json and writes a ready-to-run copy of
--    this file to dist/sql/11_seed_brand_config.sql.
--    Paste that output file into the Supabase SQL Editor.
--
-- To update a value after deployment (no redeployment needed):
--   UPDATE public.brand_config SET value = 'new-value' WHERE key = 'key-name';
-- ============================================================

INSERT INTO public.brand_config (key, value) VALUES

    -- ── Identity ──────────────────────────────────────────────
    -- Your display name as it appears in email headers.
    ('sender_name',      '__OWNER_NAME__'),

    -- The Gmail address the Apps Script runs under.
    -- This is the address that sends and receives all emails.
    ('sender_email',     '__OWNER_EMAIL__'),

    -- ── Site links ────────────────────────────────────────────
    -- Your Cloudflare Pages site URL. No trailing slash.
    -- Must match PORTFOLIO_ORIGIN in Supabase and Cloudflare env vars.
    ('portfolio_url',    '__SITE_URL__'),

    -- Your WhatsApp contact number with country code, digits only.
    -- e.g. 447700900000
    ('whatsapp_number',  '__OWNER_PHONE__'),

    -- ── Social links ──────────────────────────────────────────
    ('github_url',       '__GITHUB_URL__'),
    ('facebook_url',     '__FACEBOOK_URL__'),
    ('instagram_url',    '__INSTAGRAM_URL__'),
    ('x_url',            '__TWITTER_URL__'),
    ('youtube_url',      '__YOUTUBE_URL__')

ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
