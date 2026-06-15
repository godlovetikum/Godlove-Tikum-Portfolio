-- ============================================================
-- 09_functions_config.sql
-- Typed RPC functions for brand_config key-value reads and writes.
-- Depends on: 02_tables.sql
-- ============================================================


-- ── get_brand_config ──────────────────────────────────────────
-- Fetches multiple brand_config rows by key array.
-- Returns a TABLE of matching rows; keys absent from the table are
-- simply absent from the result — the TypeScript layer (db.ts)
-- detects missing keys and throws Errors.config.missing(key).
CREATE OR REPLACE FUNCTION public.get_brand_config(
    p_keys TEXT[]
)
RETURNS TABLE(key TEXT, value TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT bc.key, bc.value, bc.updated_at
    FROM   public.brand_config bc
    WHERE  bc.key = ANY(p_keys);
END;
$$;


-- ── list_brand_config ─────────────────────────────────────────
-- Returns brand_config rows filtered by key array and/or last-updated threshold.
-- Used by the admin Config panel to list all editable keys.
-- Admin JWT required — enforced at the Edge Function layer.
CREATE OR REPLACE FUNCTION public.list_brand_config(
    p_keys         TEXT[]      DEFAULT NULL,
    p_last_updated TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(key TEXT, value TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT bc.key, bc.value, bc.updated_at
    FROM   public.brand_config bc
    WHERE  (p_keys         IS NULL OR bc.key        = ANY(p_keys))
      AND  (p_last_updated IS NULL OR bc.updated_at >= p_last_updated)
    ORDER BY
        CASE WHEN p_last_updated IS NOT NULL THEN bc.updated_at END DESC NULLS LAST,
        bc.key ASC;
$$;


-- ── update_brand_config ───────────────────────────────────────
-- Updates a single brand_config row by key.
-- Raises an exception if the key does not exist so callers
-- cannot silently create new rows via PATCH.
-- Admin JWT required — enforced at the Edge Function layer.
CREATE OR REPLACE FUNCTION public.update_brand_config(
    p_key   TEXT,
    p_value TEXT
)
RETURNS TABLE(key TEXT, value TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.brand_config
    SET    value = p_value
    WHERE  key = p_key;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'config.key_not_found';
    END IF;

    RETURN QUERY
    SELECT bc.key, bc.value, bc.updated_at
    FROM   public.brand_config bc
    WHERE  bc.key = p_key;
END;
$$;


-- ── insert_config ─────────────────────────────────────────────
-- Insert a new row in brand_config table.
-- Used for creating new values for email template placeholders.
-- Raises if the key already exists — use update_brand_config for updates.
CREATE OR REPLACE FUNCTION public.insert_config(p_key TEXT, p_value TEXT)
RETURNS TABLE(key TEXT, value TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.brand_config bc WHERE bc.key = p_key) THEN
        RAISE EXCEPTION 'config.key_already_exist';
    END IF;

    INSERT INTO public.brand_config(key, value)
    VALUES (p_key, p_value);

    RETURN QUERY
    SELECT bc.key, bc.value, bc.updated_at
    FROM   public.brand_config bc
    WHERE  bc.key = p_key;
END;
$$;


-- ── delete_config ─────────────────────────────────────────────
-- Delete a single row from the brand_config table.
-- Raises config.key_not_found if the key does not exist.
CREATE OR REPLACE FUNCTION public.delete_config(p_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.brand_config bc WHERE bc.key = p_key) THEN
        RAISE EXCEPTION 'config.key_not_found';
    END IF;

    DELETE FROM public.brand_config WHERE key = p_key;
END;
$$;
