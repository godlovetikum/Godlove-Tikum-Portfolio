-- ============================================================
-- 07_functions_analytics.sql
-- Typed RPC functions for all analytics operations.
-- Depends on: 02_tables.sql, 01_extensions_enums.sql
-- ============================================================


-- ── upsert_visitor ────────────────────────────────────────────
-- Atomic insert-or-update for analytics_visitors.
-- First visit  → inserts row with frequency = 1.
-- Return visit → increments frequency, updates last_seen_at.
CREATE OR REPLACE FUNCTION public.upsert_visitor(
    p_session_id TEXT,
    p_device     device_type,
    p_referrer   TEXT        DEFAULT NULL,
    p_site_key   TEXT        DEFAULT NULL,
    p_ip_address TEXT        DEFAULT NULL,
    p_country    TEXT        DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO public.analytics_visitors
        (session_id, device, referrer, site_key, ip_address, country,
         frequency, last_seen_at, created_at)
    VALUES
        (p_session_id, p_device, p_referrer, p_site_key, p_ip_address, p_country,
         1, NOW(), NOW())
    ON CONFLICT (session_id) DO UPDATE
    SET
        frequency    = analytics_visitors.frequency + 1,
        last_seen_at = NOW();
$$;


-- ── insert_analytics_click ────────────────────────────────────
-- Inserts a single click event row.
-- Requires a visitor row to exist for session_id (FK constraint).
CREATE OR REPLACE FUNCTION public.insert_analytics_click(
    p_session_id TEXT,
    p_event      TEXT,
    p_section    TEXT,
    p_target     TEXT,
    p_external   BOOLEAN     DEFAULT FALSE,
    p_page       TEXT        DEFAULT NULL,
    p_site_key   TEXT        DEFAULT NULL,
    p_ip_address TEXT        DEFAULT NULL,
    p_country    TEXT        DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    INSERT INTO public.analytics_clicks
        (session_id, event, section, target, external,
         page, site_key, ip_address, country)
    VALUES
        (p_session_id, p_event, p_section, p_target, p_external,
         p_page, p_site_key, p_ip_address, p_country);
$$;


-- ── get_analytics_summary ─────────────────────────────────────
-- Returns a comprehensive analytics summary as JSON.
-- All aggregation happens server-side — no rows are transferred.
-- Optional date range: NULL params = no date filter applied.
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
    p_from TIMESTAMPTZ DEFAULT NULL,
    p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(

        'unique_visitors',
        (SELECT COUNT(DISTINCT session_id)
         FROM public.analytics_visitors
         WHERE (p_from IS NULL OR created_at >= p_from)
           AND (p_to   IS NULL OR created_at <= p_to)),

        'total_visits',
        (SELECT COALESCE(SUM(frequency), 0)
         FROM public.analytics_visitors
         WHERE (p_from IS NULL OR created_at >= p_from)
           AND (p_to   IS NULL OR created_at <= p_to)),

        'total_clicks',
        (SELECT COUNT(*)
         FROM public.analytics_clicks
         WHERE (p_from IS NULL OR created_at >= p_from)
           AND (p_to   IS NULL OR created_at <= p_to)),

        'by_device',
        (SELECT COALESCE(json_object_agg(device, cnt), '{}'::JSON)
         FROM (
             SELECT device::TEXT, COUNT(*) AS cnt
             FROM public.analytics_visitors
             WHERE (p_from IS NULL OR created_at >= p_from)
               AND (p_to   IS NULL OR created_at <= p_to)
             GROUP BY device
         ) d),

        'by_event',
        (SELECT COALESCE(json_object_agg(event, cnt), '{}'::JSON)
         FROM (
             SELECT event, COUNT(*) AS cnt
             FROM public.analytics_clicks
             WHERE (p_from IS NULL OR created_at >= p_from)
               AND (p_to   IS NULL OR created_at <= p_to)
             GROUP BY event
             ORDER BY cnt DESC
         ) e),

        'by_section',
        (SELECT COALESCE(json_object_agg(section, cnt), '{}'::JSON)
         FROM (
             SELECT section, COUNT(*) AS cnt
             FROM public.analytics_clicks
             WHERE (p_from IS NULL OR created_at >= p_from)
               AND (p_to   IS NULL OR created_at <= p_to)
             GROUP BY section
         ) s),

        'by_target',
        (SELECT COALESCE(json_object_agg(target, cnt), '{}'::JSON)
         FROM (
             SELECT target, COUNT(*) AS cnt
             FROM public.analytics_clicks
             WHERE (p_from IS NULL OR created_at >= p_from)
               AND (p_to   IS NULL OR created_at <= p_to)
             GROUP BY target
         ) tg),

        'top_pages',
        (SELECT COALESCE(json_agg(p ORDER BY p.cnt DESC), '[]'::JSON)
         FROM (
             SELECT page, COUNT(*) AS cnt
             FROM public.analytics_clicks
             WHERE page IS NOT NULL
               AND (p_from IS NULL OR created_at >= p_from)
               AND (p_to   IS NULL OR created_at <= p_to)
             GROUP BY page
             LIMIT 10
         ) p),

        'by_referrer',
        (SELECT COALESCE(json_object_agg(referrer, cnt), '{}'::JSON)
         FROM (
             SELECT referrer, COUNT(*) AS cnt
             FROM public.analytics_visitors
             WHERE referrer IS NOT NULL
               AND (p_from IS NULL OR created_at >= p_from)
               AND (p_to   IS NULL OR created_at <= p_to)
             GROUP BY referrer
         ) r),

        'countries',
        (SELECT COALESCE(json_agg(c ORDER BY c.cnt DESC), '[]'::JSON)
         FROM (
             SELECT country, COUNT(*) AS cnt
             FROM public.analytics_visitors
             WHERE country IS NOT NULL
               AND (p_from IS NULL OR created_at >= p_from)
               AND (p_to   IS NULL OR created_at <= p_to)
             GROUP BY country
             LIMIT 20
         ) c),

        'contact_counts',
        public.get_contact_status_counts()

    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- ── list_analytics_visitors ───────────────────────────────────
-- Returns a paginated list of visitor rows ordered by created_at DESC.
-- The total count is computed over the full filtered set before paging
-- so the caller always receives the true total, not just the page size.
CREATE OR REPLACE FUNCTION public.list_analytics_visitors(
    p_from  TIMESTAMPTZ DEFAULT NULL,
    p_to    TIMESTAMPTZ DEFAULT NULL,
    p_page  INTEGER     DEFAULT 1,
    p_limit INTEGER     DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
    v_rows   JSON;
    v_total  BIGINT;
BEGIN
    v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_limit, 100);

    -- Count the full filtered set (independent of pagination).
    SELECT COUNT(*) INTO v_total
    FROM public.analytics_visitors
    WHERE (p_from IS NULL OR created_at >= p_from)
      AND (p_to   IS NULL OR created_at <= p_to);

    -- Aggregate only the requested page by limiting inside a subquery
    -- so json_agg receives exactly p_limit rows, not the full dataset.
    SELECT json_agg(r ORDER BY r.created_at DESC) INTO v_rows
    FROM (
        SELECT *
        FROM public.analytics_visitors
        WHERE (p_from IS NULL OR created_at >= p_from)
          AND (p_to   IS NULL OR created_at <= p_to)
        ORDER BY created_at DESC
        LIMIT  LEAST(p_limit, 100)
        OFFSET v_offset
    ) r;

    RETURN json_build_object(
        'rows',  COALESCE(v_rows, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$;


-- ── list_analytics_clicks ─────────────────────────────────────
-- Returns a paginated list of click event rows ordered by created_at DESC.
-- Uses the same two-query pattern as list_analytics_visitors so that
-- the total reflects the full filtered set, not just the current page.
CREATE OR REPLACE FUNCTION public.list_analytics_clicks(
    p_from  TIMESTAMPTZ DEFAULT NULL,
    p_to    TIMESTAMPTZ DEFAULT NULL,
    p_page  INTEGER     DEFAULT 1,
    p_limit INTEGER     DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset INTEGER;
    v_rows   JSON;
    v_total  BIGINT;
BEGIN
    v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_limit, 100);

    SELECT COUNT(*) INTO v_total
    FROM public.analytics_clicks
    WHERE (p_from IS NULL OR created_at >= p_from)
      AND (p_to   IS NULL OR created_at <= p_to);

    SELECT json_agg(r ORDER BY r.created_at DESC) INTO v_rows
    FROM (
        SELECT *
        FROM public.analytics_clicks
        WHERE (p_from IS NULL OR created_at >= p_from)
          AND (p_to   IS NULL OR created_at <= p_to)
        ORDER BY created_at DESC
        LIMIT  LEAST(p_limit, 100)
        OFFSET v_offset
    ) r;

    RETURN json_build_object(
        'rows',  COALESCE(v_rows, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$;


-- ── get_analytics_daily_trend ─────────────────────────────────
-- Returns daily visitor + click counts for the given date range.
-- Generates every calendar day in the range (no gaps).
-- Default range: last 30 days.
CREATE OR REPLACE FUNCTION public.get_analytics_daily_trend(
    p_from TIMESTAMPTZ DEFAULT NULL,
    p_to   TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_from   TIMESTAMPTZ := COALESCE(p_from, NOW() - INTERVAL '30 days');
    v_to     TIMESTAMPTZ := COALESCE(p_to,   NOW());
    v_result JSON;
BEGIN
    SELECT json_agg(row_to_json(t) ORDER BY t.date)
    INTO v_result
    FROM (
        SELECT
            date_trunc('day', d)::DATE AS date,
            COALESCE((
                SELECT COUNT(DISTINCT session_id)
                FROM public.analytics_visitors v
                WHERE date_trunc('day', v.created_at) = date_trunc('day', d)
            ), 0) AS visitors,
            COALESCE((
                SELECT COUNT(*)
                FROM public.analytics_clicks c
                WHERE date_trunc('day', c.created_at) = date_trunc('day', d)
            ), 0) AS clicks
        FROM generate_series(v_from, v_to, '1 day'::INTERVAL) AS d
    ) t;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
