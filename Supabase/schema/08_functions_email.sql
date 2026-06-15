-- ============================================================
-- 08_functions_email.sql
-- Typed RPC functions for email templates and outbound email tracking.
-- Depends on: 02_tables.sql, 01_extensions_enums.sql
-- ============================================================


-- ── list_email_templates ──────────────────────────────────────
-- Returns email template rows ordered by category then type.
CREATE OR REPLACE FUNCTION public.list_email_templates(
    p_category TEXT DEFAULT NULL,
    p_type      TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        json_agg(t ORDER BY t.category, t.type),
        '[]'::JSON
    )
    FROM public.email_templates t 
        WHERE (p_category IS NULL OR t.category = p_category)
            AND (p_type IS NULL OR t.type = p_type);
$$;


-- ── get_email_template_by_id ──────────────────────────────────
-- Returns a single template by UUID, or NULL if not found.
CREATE OR REPLACE FUNCTION public.get_email_template_by_id(p_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.email_templates;
BEGIN
    SELECT * INTO v_row
    FROM public.email_templates
    WHERE id = p_id;

    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN row_to_json(v_row);
END;
$$;


-- ── get_email_template_by_category_type ───────────────────────
-- Returns a single template by category + type, or NULL if not found.
CREATE OR REPLACE FUNCTION public.get_email_template_by_category_type(
    p_category contact_category,
    p_type     email_type
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.email_templates;
BEGIN
    SELECT * INTO v_row
    FROM public.email_templates
    WHERE category = p_category
      AND "type"   = p_type;

    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN row_to_json(v_row);
END;
$$;


-- ── update_email_template ─────────────────────────────────────
-- Updates subject and/or html_body on a template row.
-- Passes NULL to leave a field unchanged.
-- Returns the updated row, or NULL if not found.
CREATE OR REPLACE FUNCTION public.update_email_template(
    p_id        UUID,
    p_subject   TEXT DEFAULT NULL,
    p_html_body TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.email_templates;
BEGIN
    UPDATE public.email_templates
    SET
        subject   = COALESCE(p_subject,   subject),
        html_body = COALESCE(p_html_body, html_body)
    WHERE id = p_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN row_to_json(v_row);
END;
$$;


-- ── insert_email_template ─────────────────────────────────────
-- Creates a new email_templates row.
-- The (category, type) pair must be unique — the table has a UNIQUE constraint.
-- Returns the created row as JSON, or raises on duplicate.
CREATE OR REPLACE FUNCTION public.insert_email_template(
    p_category  TEXT,
    p_type      TEXT,
    p_subject   TEXT,
    p_html_body TEXT,
    p_text_body TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.email_templates;
BEGIN
    INSERT INTO public.email_templates (category, type, subject, html_body, text_body)
    VALUES (p_category::contact_category, p_type::email_type, p_subject, p_html_body, p_text_body)
    RETURNING * INTO v_row;

    RETURN row_to_json(v_row);
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'template.aready_exist';
    WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'template.invalid_category_or_type';
END;
$$;


-- ── insert_outbound_email ─────────────────────────────────────
-- Creates a new outbound email tracking record.
-- Called by the email Edge Function before attempting each send.
-- Stores the full email content (subject, html_body, text_body) so the
-- admin can review and retry without re-entering the content.
-- Returns the created row as JSON.
CREATE OR REPLACE FUNCTION public.insert_outbound_email(
    p_email_type  TEXT,
    p_recipient   TEXT,
    p_subject     TEXT,
    p_caller      TEXT,
    p_html_body   TEXT   DEFAULT NULL,
    p_text_body   TEXT   DEFAULT NULL,
    p_contact_id  UUID   DEFAULT NULL,
    p_provider    TEXT   DEFAULT 'gas'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row public.outbound_emails;
BEGIN
    INSERT INTO public.outbound_emails
        (contact_id, email_type, recipient, subject, html_body, text_body,
         caller, status, provider)
    VALUES
        (p_contact_id, p_email_type, p_recipient, p_subject, p_html_body, p_text_body,
         p_caller, 'pending', p_provider)
    RETURNING * INTO v_row;

    RETURN row_to_json(v_row);
END;
$$;


-- ── update_outbound_email_status ──────────────────────────────
-- Updates the status (sent/failed) on an outbound_emails row.
-- Called after the email transport returns a result.
CREATE OR REPLACE FUNCTION public.update_outbound_email_status(
    p_id          UUID,
    p_status      TEXT,
    p_error       TEXT        DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.outbound_emails
    SET
        status        = p_status,
        sent_at       = CASE WHEN p_status = 'sent'   THEN NOW() ELSE sent_at   END,
        failed_at     = CASE WHEN p_status = 'failed' THEN NOW() ELSE failed_at END,
        error_message = p_error,
        retry_count   = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
    WHERE id = p_id;
END;
$$;


-- ── list_outbound_emails ──────────────────────────────────────
-- Returns a paginated list of outbound email records.
-- Optional filters: contact_id, status, email_type, recipient.
-- Returns JSON with shape: { rows: [...], total: N }
CREATE OR REPLACE FUNCTION public.list_outbound_emails(
    p_contact_id  UUID        DEFAULT NULL,
    p_status      TEXT        DEFAULT NULL,
    p_email_type  TEXT        DEFAULT NULL,
    p_recipient   TEXT        DEFAULT NULL,
    p_from        TIMESTAMPTZ DEFAULT NULL,
    p_to          TIMESTAMPTZ DEFAULT NULL,
    p_page        INTEGER     DEFAULT 1,
    p_limit       INTEGER     DEFAULT 20
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

    SELECT COUNT(*)
    INTO v_total
    FROM public.outbound_emails e
    WHERE
        (p_contact_id IS NULL OR e.contact_id = p_contact_id)
        AND (p_status     IS NULL OR e.status     = p_status)
        AND (p_email_type IS NULL OR e.email_type = p_email_type)
        AND (p_recipient  IS NULL OR e.recipient  = p_recipient)
        AND (p_from       IS NULL OR e.created_at >= p_from)
        AND (p_to         IS NULL OR e.created_at <= p_to);

    SELECT json_agg(e ORDER BY e.created_at DESC)
    INTO v_rows
    FROM public.outbound_emails e
    WHERE
        (p_contact_id IS NULL OR e.contact_id = p_contact_id)
        AND (p_status     IS NULL OR e.status     = p_status)
        AND (p_email_type IS NULL OR e.email_type = p_email_type)
        AND (p_recipient  IS NULL OR e.recipient  = p_recipient)
        AND (p_from       IS NULL OR e.created_at >= p_from)
        AND (p_to         IS NULL OR e.created_at <= p_to)
    LIMIT LEAST(p_limit, 100)
    OFFSET v_offset;

    RETURN json_build_object(
        'rows',  COALESCE(v_rows, '[]'::JSON),
        'total', COALESCE(v_total, 0)
    );
END;
$$;
