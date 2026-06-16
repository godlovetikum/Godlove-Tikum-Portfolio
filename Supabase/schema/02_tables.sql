-- ============================================================
-- 02_tables.sql
-- All application tables.
-- Depends on: 01_extensions_enums.sql
-- ============================================================


-- ── analytics_visitors ────────────────────────────────────────
-- One row per unique session (session_id is the primary key).
-- Recurring visits increment frequency and update last_seen_at
-- via the upsert_visitor() RPC — no duplicate rows.
CREATE TABLE IF NOT EXISTS public.analytics_visitors (
    session_id   TEXT        PRIMARY KEY,
    device       device_type NOT NULL,
    referrer     TEXT        CHECK (char_length(referrer) <= 100),
    site_key     TEXT,
    ip_address   TEXT,
    country      TEXT,
    frequency    INTEGER     NOT NULL DEFAULT 1,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── analytics_clicks ──────────────────────────────────────────
-- One row per tracked interaction on the portfolio.
CREATE TABLE IF NOT EXISTS public.analytics_clicks (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT        NOT NULL REFERENCES public.analytics_visitors (session_id) ON DELETE CASCADE,
    event      TEXT        NOT NULL CHECK (char_length(event)   <= 30),
    section    TEXT        NOT NULL CHECK (char_length(section) <= 30),
    target     TEXT        NOT NULL CHECK (char_length(target)  <= 50),
    external   BOOLEAN     NOT NULL DEFAULT FALSE,
    page       TEXT        CHECK (char_length(page) <= 200),
    site_key   TEXT,
    ip_address TEXT,
    country    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);




-- ── contacts ──────────────────────────────────────────────────
-- Every validated form submission from the public portfolio.
-- Inserted via the insert_contact() RPC (contacts Edge Function).
-- DB webhook fires the email Edge Function on INSERT.
CREATE TABLE IF NOT EXISTS public.contacts (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT             NOT NULL CHECK (char_length(name) BETWEEN 2 AND 50),
    email            TEXT             NOT NULL CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
    message          TEXT             NOT NULL CHECK (char_length(message) BETWEEN 20 AND 2000),
    category         contact_category NOT NULL DEFAULT 'other',
    page             TEXT,
    site_key         TEXT,
    session_id       TEXT             NOT NULL REFERENCES public.analytics_visitors (session_id),
    ip_address       TEXT,
    country          TEXT,
    status           contact_status   NOT NULL DEFAULT 'new',
    notified_at      TIMESTAMPTZ,
    notify_failed_at TIMESTAMPTZ,
    acknowledged_at  TIMESTAMPTZ,
    ack_failed_at    TIMESTAMPTZ,
    read_at          TIMESTAMPTZ,
    replied_at       TIMESTAMPTZ,
    follow_up_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);


-- ── email_templates ───────────────────────────────────────────
-- Complete self-contained HTML email per category × type.
-- 10 rows seeded in 10_seed_email_templates.sql.
-- Updated from the admin dashboard — no redeployment needed.
CREATE TABLE IF NOT EXISTS public.email_templates (
    id         UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    category   contact_category NOT NULL,
    "type"     email_type       NOT NULL,
    subject    TEXT             NOT NULL,
    html_body  TEXT             NOT NULL,
    text_body  TEXT             NOT NULL,
    updated_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    
    UNIQUE (category, "type")
);


-- ── brand_config ──────────────────────────────────────────────
-- Runtime configuration for Edge Functions and email templates.
CREATE TABLE IF NOT EXISTS public.brand_config (
    key        TEXT        PRIMARY KEY,
    value      TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── users ─────────────────────────────────────────────────────
-- Admin user accounts. Passwords stored as bcrypt hashes (pgcrypto).
-- Depends on: user_role, user_status (01_extensions_enums.sql)
--
-- Seed: run the INSERT block in 12_functions_auth.sql ONCE with real
-- credentials, then comment it out. Never commit plain passwords.
CREATE TABLE IF NOT EXISTS public.users (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL,
    email          TEXT        NOT NULL UNIQUE,
    password_hash  TEXT        NOT NULL,
    role           user_role   NOT NULL DEFAULT 'user',
    status         user_status NOT NULL DEFAULT 'active',
    last_signin_at TIMESTAMPTZ          DEFAULT NOW(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── sessions ──────────────────────────────────────────────────
-- Opaque session tokens. One active session per user at a time
-- (upsert_session enforces this). Foreign key cascades on user delete.
CREATE TABLE IF NOT EXISTS public.sessions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    token        TEXT        NOT NULL,
    CONSTRAINT sessions_token_len CHECK (length(token) >= 64),
    is_active    BOOLEAN              DEFAULT TRUE,
    ip_address   TEXT,
    user_agent   TEXT,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 DAYS',
    last_seen_at TIMESTAMPTZ          DEFAULT NOW(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── outbound_emails ───────────────────────────────────────────
-- Audit log of every email attempt (trigger-fired or manual).
-- Written by the email Edge Function after each send attempt.
-- Stores the full email content (subject, html_body, text_body) so the
-- admin can inspect, edit, and retry any failed send from the dashboard
-- without re-entering content.
CREATE TABLE IF NOT EXISTS public.outbound_emails (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id    UUID        REFERENCES public.contacts (id) ON DELETE SET NULL,
    email_type    email_type  NOT NULL,
    recipient     TEXT        NOT NULL,
    subject       TEXT        NOT NULL,
    html_body     TEXT,
    text_body     TEXT,
    caller        TEXT        NOT NULL CHECK (caller IN ('trigger', 'manual')),
    status        outbound_status    NOT NULL DEFAULT 'pending',
    sent_at       TIMESTAMPTZ,
    failed_at     TIMESTAMPTZ,
    error_message TEXT,
    retry_count   INTEGER     NOT NULL DEFAULT 0,
    provider      TEXT        NOT NULL DEFAULT 'gas',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
