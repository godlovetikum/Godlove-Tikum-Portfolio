-- ============================================================
-- reset.sql
-- Drops everything created by the schema files in reverse
-- dependency order (triggers → functions → policies →
-- tables → enums → extensions).
--
-- ⚠  THIS IS DESTRUCTIVE AND PERMANENT.
--    All contacts, analytics, email tracking, templates,
--    config data, and admin users will be deleted and cannot
--    be recovered. Only run this if you are absolutely certain.
--
-- After running this file the database is back to zero.
-- To rebuild: run 01 → 12 in order.
-- ============================================================


-- ── STEP 1: Triggers ─────────────────────────────────────────
DROP TRIGGER IF EXISTS brand_config_updated_at    ON public.brand_config;
DROP TRIGGER IF EXISTS email_templates_updated_at ON public.email_templates;


-- ── STEP 2: Functions ────────────────────────────────────────

-- Auth (12_functions_auth.sql)
DROP FUNCTION IF EXISTS public.validate_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_user(UUID);
DROP FUNCTION IF EXISTS public.upsert_session(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.validate_session(TEXT);
DROP FUNCTION IF EXISTS public.invalidate_session(TEXT);

-- Analytics (07_functions_analytics.sql)
DROP FUNCTION IF EXISTS public.upsert_visitor(TEXT, device_type, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.insert_analytics_click(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_analytics_daily_trend(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.list_analytics_visitors(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.list_analytics_clicks(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);

-- Contacts (06_functions_contact.sql)
DROP FUNCTION IF EXISTS public.insert_contact(TEXT, TEXT, TEXT, contact_category, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_contact(UUID);
DROP FUNCTION IF EXISTS public.list_contacts(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.update_contact(UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.mark_contact_notified(UUID);
DROP FUNCTION IF EXISTS public.mark_contact_notify_failed(UUID);
DROP FUNCTION IF EXISTS public.mark_contact_acknowledged(UUID);
DROP FUNCTION IF EXISTS public.mark_contact_ack_failed(UUID);
DROP FUNCTION IF EXISTS public.get_contact_status_counts();

-- Email (08_functions_email.sql)
DROP FUNCTION IF EXISTS public.list_email_templates(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_email_template_by_id(UUID);
DROP FUNCTION IF EXISTS public.get_email_template_by_category_type(contact_category, email_type);
DROP FUNCTION IF EXISTS public.update_email_template(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.insert_email_template(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.insert_outbound_email(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.update_outbound_email_status(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.list_outbound_emails(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);

-- Config (09_functions_config.sql)
DROP FUNCTION IF EXISTS public.get_brand_config(TEXT[]);
DROP FUNCTION IF EXISTS public.list_brand_config(TEXT[], TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.update_brand_config(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.insert_config(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_config(TEXT);

-- Trigger helper (05_functions_triggers.sql)
DROP FUNCTION IF EXISTS public.set_updated_at();


-- ── STEP 3: Policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "contacts_admin_select"               ON public.contacts;
DROP POLICY IF EXISTS "contacts_admin_update"               ON public.contacts;
DROP POLICY IF EXISTS "email_templates_admin_select"        ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_admin_update"        ON public.email_templates;
DROP POLICY IF EXISTS "brand_config_admin_select"           ON public.brand_config;
DROP POLICY IF EXISTS "brand_config_admin_update"           ON public.brand_config;
DROP POLICY IF EXISTS "analytics_visitors_admin_select"     ON public.analytics_visitors;
DROP POLICY IF EXISTS "analytics_clicks_admin_select"       ON public.analytics_clicks;
DROP POLICY IF EXISTS "outbound_emails_admin_select"        ON public.outbound_emails;
DROP POLICY IF EXISTS "outbound_emails_admin_update"        ON public.outbound_emails;


-- ── STEP 4: Tables ───────────────────────────────────────────
-- Drop in FK-dependency order (children before parents).
-- sessions.user_id → users.id, so sessions drops before users.
DROP TABLE IF EXISTS public.sessions           CASCADE;
DROP TABLE IF EXISTS public.users              CASCADE;
DROP TABLE IF EXISTS public.outbound_emails    CASCADE;
DROP TABLE IF EXISTS public.analytics_clicks   CASCADE;
DROP TABLE IF EXISTS public.analytics_visitors CASCADE;
DROP TABLE IF EXISTS public.brand_config       CASCADE;
DROP TABLE IF EXISTS public.email_templates    CASCADE;
DROP TABLE IF EXISTS public.contacts           CASCADE;


-- ── STEP 5: Enums ────────────────────────────────────────────
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS user_status;
DROP TYPE IF EXISTS device_type;
DROP TYPE IF EXISTS outbound_status;
DROP TYPE IF EXISTS email_type;
DROP TYPE IF EXISTS contact_category;
DROP TYPE IF EXISTS contact_status;


-- ── STEP 6: Extensions ───────────────────────────────────────
-- Comment out any extension used by other parts of your Supabase project.
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS "uuid-ossp";
