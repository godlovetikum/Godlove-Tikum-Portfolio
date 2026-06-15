-- ============================================================
-- 01_extensions_enums.sql
-- Extensions and custom enum types.
-- Run first — all other files depend on these types.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── contact_status ────────────────────────────────────────────
-- Tracks where a contact submission is in the admin workflow.
--   new        — just received, not yet actioned
--   read       — admin has opened and read the message
--   replied    — admin has sent a reply
--   follow_up  — marked for follow-up after initial reply
CREATE TYPE contact_status AS ENUM (
    'new',
    'read',
    'replied',
    'follow_up'
);


-- ── contact_category ──────────────────────────────────────────
-- Maps to the form's category selector on the portfolio.
CREATE TYPE contact_category AS ENUM (
    'new-website',
    'fix-website',
    'book-call',
    'project-question',
    'other'
);


-- ── email_type ────────────────────────────────────────────────
-- Controls which email_templates row is selected and which
-- outbound_emails.email_type value is recorded.
--   notification    — email to admin when a contact arrives
--   acknowledgement — auto-reply to the visitor
--   reply           — manual reply from admin to visitor
--   follow_up       — follow-up email sent after initial reply
CREATE TYPE email_type AS ENUM (
    'notification',
    'acknowledgement',
    'reply',
    'standalone',
    'follow_up'
);

CREATE TYPE outbound_status AS ENUM ('pending', 'sent', 'failed');

-- ── device_type ───────────────────────────────────────────────
-- Sent by the analytics script on the portfolio frontend.
CREATE TYPE device_type AS ENUM (
    'mobile',
    'desktop'
);