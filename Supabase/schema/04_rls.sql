-- ============================================================
-- 04_rls.sql
-- Row Level Security — enable and define all policies.
-- Depends on: 02_tables.sql
--
-- Policy summary:
--   Service role key (used by Edge Functions) bypasses RLS entirely.
-- ============================================================

ALTER TABLE public.contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_clicks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_emails   ENABLE ROW LEVEL SECURITY;
