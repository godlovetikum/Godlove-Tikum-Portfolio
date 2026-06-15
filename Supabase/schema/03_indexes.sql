-- ============================================================
-- 03_indexes.sql
-- Performance indexes for all tables.
-- Depends on: 02_tables.sql
-- ============================================================


-- ── contacts ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS contacts_created_at_idx ON public.contacts (created_at DESC);
CREATE INDEX IF NOT EXISTS contacts_status_idx     ON public.contacts (status);
CREATE INDEX IF NOT EXISTS contacts_category_idx   ON public.contacts (category);
CREATE INDEX IF NOT EXISTS contacts_email_idx      ON public.contacts (email);


-- ── analytics_visitors ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS analytics_visitors_last_seen_idx
    ON public.analytics_visitors (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS analytics_visitors_created_at_idx
    ON public.analytics_visitors (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_visitors_site_key_idx
    ON public.analytics_visitors (site_key);
CREATE INDEX IF NOT EXISTS analytics_visitors_country_idx
    ON public.analytics_visitors (country);


-- ── analytics_clicks ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS analytics_clicks_session_idx
    ON public.analytics_clicks (session_id);
CREATE INDEX IF NOT EXISTS analytics_clicks_event_idx
    ON public.analytics_clicks (event);
CREATE INDEX IF NOT EXISTS analytics_clicks_created_at_idx
    ON public.analytics_clicks (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_clicks_site_key_idx
    ON public.analytics_clicks (site_key);


-- ── outbound_emails ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS outbound_emails_contact_id_idx
    ON public.outbound_emails (contact_id);
CREATE INDEX IF NOT EXISTS outbound_emails_status_idx
    ON public.outbound_emails (status);
CREATE INDEX IF NOT EXISTS outbound_emails_created_at_idx
    ON public.outbound_emails (created_at DESC);
CREATE INDEX IF NOT EXISTS outbound_emails_email_type_idx
    ON public.outbound_emails (email_type);
    
