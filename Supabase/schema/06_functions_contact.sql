-- ============================================================
-- 06_functions_contact.sql
-- Typed RPC functions for all contact operations.
-- Depends on: 02_tables.sql, 01_extensions_enums.sql
--
-- All Edge Function DB access goes through these functions.
-- No direct table queries are used anywhere in the TypeScript layer.
-- ============================================================


-- ── insert_contact ────────────────────────────────────────────
-- Inserts a new contact form submission and returns the full row as JSON.
CREATE OR REPLACE FUNCTION public.insert_contact(
    p_name       TEXT,
    p_email      TEXT,
    p_message    TEXT,
    p_category   contact_category,
    p_page       TEXT        DEFAULT NULL,
    p_site_key   TEXT        DEFAULT NULL,
    p_session_id TEXT        DEFAULT NULL,
    p_ip_address TEXT        DEFAULT NULL,
    p_country    TEXT        DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.contacts;
BEGIN
    INSERT INTO public.contacts (
        name, email, message, category,
        page, site_key, session_id, ip_address, country
    ) VALUES (
        p_name, p_email, p_message, p_category,
        p_page, p_site_key, p_session_id, p_ip_address, p_country
    )
    RETURNING * INTO v_row;

    RETURN row_to_json(v_row);
END;
$$;


-- ── get_contact ───────────────────────────────────────────────
-- Returns a single contact row by UUID as JSON.
-- Returns NULL if no row matches (caller must handle).
CREATE OR REPLACE FUNCTION public.get_contact(
    p_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.contacts;
BEGIN
    SELECT * INTO v_row
    FROM public.contacts
    WHERE id = p_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_row);
END;
$$;


-- ── list_contacts ─────────────────────────────────────────────
-- Returns a paginated, filtered list of contacts with a total count.
-- All filter params are optional (NULL = no filter applied).
-- Returns JSON with shape: { rows: [...], total: N }
CREATE OR REPLACE FUNCTION public.list_contacts(
    p_status   TEXT        DEFAULT NULL,
    p_category TEXT        DEFAULT NULL,
    p_from     TIMESTAMPTZ DEFAULT NULL,
    p_to       TIMESTAMPTZ DEFAULT NULL,
    p_page     INTEGER     DEFAULT 1,
    p_limit    INTEGER     DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset  INTEGER;
    v_rows    JSON;
    v_total   BIGINT;
BEGIN
    v_offset := (GREATEST(p_page, 1) - 1) * LEAST(p_limit, 100);

    SELECT COUNT(*)
    INTO v_total
    FROM public.contacts c
    WHERE
        (p_status   IS NULL OR c.status::TEXT   = p_status)
        AND (p_category IS NULL OR c.category::TEXT = p_category)
        AND (p_from     IS NULL OR c.created_at    >= p_from)
        AND (p_to       IS NULL OR c.created_at    <= p_to);

    SELECT json_agg(c ORDER BY c.created_at DESC)
    INTO v_rows
    FROM public.contacts c
    WHERE
        (p_status   IS NULL OR c.status::TEXT   = p_status)
        AND (p_category IS NULL OR c.category::TEXT = p_category)
        AND (p_from     IS NULL OR c.created_at    >= p_from)
        AND (p_to       IS NULL OR c.created_at    <= p_to)
    LIMIT LEAST(p_limit, 100)
    OFFSET v_offset;

    RETURN json_build_object(
        'rows',  COALESCE(v_rows, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$;


-- ── update_contact ────────────────────────────────────────────
-- Updates mutable admin fields on a contact row.
-- Only status, read_at, replied_at, follow_up_at may be changed.
-- Returns the updated row as JSON, or NULL if not found.
CREATE OR REPLACE FUNCTION public.update_contact(
    p_id           UUID,
    p_status       TEXT        DEFAULT NULL,
    p_read_at      TIMESTAMPTZ DEFAULT NULL,
    p_replied_at   TIMESTAMPTZ DEFAULT NULL,
    p_follow_up_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.contacts;
BEGIN
    UPDATE public.contacts
    SET
        status       = COALESCE(p_status::contact_status,     status),
        read_at      = CASE WHEN p_read_at      IS NOT NULL THEN p_read_at      ELSE read_at      END,
        replied_at   = CASE WHEN p_replied_at   IS NOT NULL THEN p_replied_at   ELSE replied_at   END,
        follow_up_at = CASE WHEN p_follow_up_at IS NOT NULL THEN p_follow_up_at ELSE follow_up_at END
    WHERE id = p_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_row);
END;
$$;


-- ── mark_contact_notified ─────────────────────────────────────
-- Sets notified_at with timestamp after successful notification send.
-- Non-throwing — failure is logged, not raised.
CREATE OR REPLACE FUNCTION public.mark_contact_notified(p_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE public.contacts
    SET    notified_at = NOW()
    WHERE  id = p_id;
$$;


-- ── mark_contact_notify_failed ────────────────────────────────
-- Records that the notification send failed for this contact.
-- Increments a counter so the admin can filter contacts awaiting retry.
CREATE OR REPLACE FUNCTION public.mark_contact_notify_failed(p_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE public.contacts
    SET    notify_failed_at = NOW()
    WHERE  id = p_id;
$$;


-- ── mark_contact_acknowledged ─────────────────────────────────
-- Sets acknowledged_at with timestamp after successful ack send.
CREATE OR REPLACE FUNCTION public.mark_contact_acknowledged(p_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE public.contacts
    SET    acknowledged_at = NOW()
    WHERE  id = p_id;
$$;


-- ── mark_contact_ack_failed ───────────────────────────────────
-- Records that the acknowledgement send failed for this contact.
CREATE OR REPLACE FUNCTION public.mark_contact_ack_failed(p_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
    UPDATE public.contacts
    SET    ack_failed_at = NOW()
    WHERE  id = p_id;
$$;


-- ── get_contact_status_counts ─────────────────────────────────
-- Returns a count breakdown by status for the dashboard sidebar.
CREATE OR REPLACE FUNCTION public.get_contact_status_counts()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT json_build_object(
        'new',       COUNT(*) FILTER (WHERE status = 'new'),
        'read',      COUNT(*) FILTER (WHERE status = 'read'),
        'replied',   COUNT(*) FILTER (WHERE status = 'replied'),
        'follow_up', COUNT(*) FILTER (WHERE status = 'follow_up'),
        'total',     COUNT(*)
    )
    FROM public.contacts;
$$;
