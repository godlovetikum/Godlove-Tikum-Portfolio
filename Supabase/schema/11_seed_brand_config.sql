-- ============================================================
-- 11_seed_brand_config.sql
-- Seeds all runtime configuration used by the Edge Functions
-- and email templates.
--
-- ⚠  Fill in EVERY value before running this file.
--    Replace all placeholder values with real ones.
--    Run this after all other schema files.
--
-- To update a value after deployment (no redeployment needed):
--   UPDATE public.brand_config SET value = 'new-value' WHERE key = 'key-name';
-- ============================================================

INSERT INTO public.brand_config (key, value) VALUES

    -- ── Identity ──────────────────────────────────────────────
    -- Your display name as it appears in email headers.
    ('sender_name',      'YOUR_FULL_NAME_OR_BRAND_NAME'),

    -- The Gmail address the Apps Script runs under.
    -- This is the address that sends and receives all emails.
    ('sender_email',     'YOUR_GMAIL_ADDRESS'),

    -- ── Site links ────────────────────────────────────────────
    -- Your Cloudflare Pages site URL. No trailing slash.
    -- Must match PORTFOLIO_ORIGIN in Supabase and Cloudflare env vars.
    ('portfolio_url',    'https://YOUR_SITE_NAME.pages.dev'),

    -- Your WhatsApp contact number with country code, digits only.
    -- e.g. 447700900000
    ('whatsapp_number',  'YOUR_COUNTRY_CODE_AND_NUMBER'),

    -- ── Social links ──────────────────────────────────────────
    ('github_url',       'https://github.com/YOUR_HANDLE'),
    ('facebook_url',     'https://www.facebook.com/YOUR_HANDLE'),
    ('instagram_url',    'https://www.instagram.com/YOUR_HANDLE'),
    ('x_url',            'https://www.x.com/YOUR_HANDLE'),
    ('youtube_url',      'https://www.youtube.com/@YOUR_HANDLE')

ON CONFLICT (key) DO NOTHING;
