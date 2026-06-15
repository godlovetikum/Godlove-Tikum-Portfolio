-- ============================================================
-- 05_functions_triggers.sql
-- Trigger support function and all table triggers.
-- Depends on: 02_tables.sql
-- ============================================================


-- ── set_updated_at ────────────────────────────────────────────
-- Generic trigger function that sets updated_at = NOW() before
-- every UPDATE. Attached to any table with an updated_at column.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ── Triggers ──────────────────────────────────────────────────

CREATE TRIGGER brand_config_updated_at
    BEFORE UPDATE ON public.brand_config
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- DATABASE WEBHOOK (configure in Supabase dashboard)
-- ──────────────────────────────────────────────────────────────
-- Dashboard → Database → Webhooks → Create a new hook
--
--   Name    : on_contact_inserted
--   Table   : public.contacts
--   Event   : INSERT
--   Method  : POST
--   URL     : https://<ref>.supabase.co/functions/v1/email
--   Headers :
--     Authorization : Bearer <TRIGGER_KEY>       (from Supabase secrets)
--     Content-Type  : application/json
-- ============================================================


-- ============================================================
-- ADMIN USER SETUP
-- ──────────────────────────────────────────────────────────────
-- Admin users are managed in public.users via 12_admins.sql.
-- See 12_admins.sql for the seed INSERT and authentication RPCs.
-- ============================================================
