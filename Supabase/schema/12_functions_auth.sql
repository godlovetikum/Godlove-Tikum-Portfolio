-- ============================================================
-- 12_functions_auth.sql
-- Auth RPCs: password validation, session management, user lookup.
-- Safe to re-run — only drops and recreates the five functions.
--
-- Depends on:
--   01_extensions_enums.sql — pgcrypto, user_role, user_status
--   02_tables.sql           — users, sessions
--
-- DROP TABLE / DROP TYPE / DROP EXTENSION belong in reset.sql only.
-- ============================================================


-- ── Re-run safety: drop functions only ───────────────────────
DROP FUNCTION IF EXISTS public.validate_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_user(UUID);
DROP FUNCTION IF EXISTS public.upsert_session(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.validate_session(TEXT);
DROP FUNCTION IF EXISTS public.invalidate_session(TEXT);


-- ── Seed admin user ───────────────────────────────────────────
-- Run this INSERT block ONCE with real values, then comment it out.
-- Never commit plain-text credentials to version control.
-- Replace every placeholder before executing:
--   YOUR_ADMIN_NAME      — display name,   e.g. 'Jane Smith'
--   YOUR_ADMIN_EMAIL     — login email,    e.g. 'admin@example.com'
--   YOUR_SECURE_PASSWORD — strong password, at least 16 characters
--
-- INSERT INTO public.users (name, email, password_hash, role)
-- VALUES (
--     'YOUR_ADMIN_NAME', 'YOUR_ADMIN_EMAIL',
--     crypt('YOUR_SECURE_PASSWORD', gen_salt('bf')), 'admin'
-- );


-- ── validate_password ─────────────────────────────────────────
-- Validates the user password and returns the user record.
-- Status checks and role enforcement happen in Edge Functions.
-- Raises 'auth.invalid_credentials' if no account matches p_email
-- or the password is wrong.
CREATE OR REPLACE FUNCTION public.validate_password(p_email TEXT, p_password TEXT)
RETURNS TABLE (
    id             UUID,
    name           TEXT,
    email          TEXT,
    role           user_role,
    status         user_status,
    last_signin_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_password_hash TEXT;
BEGIN
    SELECT u.password_hash INTO v_password_hash
    FROM   public.users u
    WHERE  u.email = p_email;

    IF v_password_hash IS NULL THEN
        RAISE EXCEPTION 'auth.invalid_credentials';
    END IF;

    IF v_password_hash != crypt(p_password, v_password_hash) THEN
        RAISE EXCEPTION 'auth.invalid_credentials';
    END IF;

    UPDATE public.users SET last_signin_at = NOW() WHERE users.email = p_email;

    RETURN QUERY
    SELECT us.id, us.name, us.email, us.role,
           us.status, us.last_signin_at, us.created_at
    FROM   public.users us
    WHERE  us.email = p_email;
END;
$$;


-- ── get_user ──────────────────────────────────────────────────
-- Retrieves the user by user.id lookup.
-- Raises 'auth.invalid_credentials' if no matching row exists.
CREATE OR REPLACE FUNCTION public.get_user(p_user_id UUID)
RETURNS TABLE (
    id             UUID,
    name           TEXT,
    email          TEXT,
    role           user_role,
    status         user_status,
    last_signin_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_user_id) THEN
        RAISE EXCEPTION 'auth.user_not_found';
    END IF;

    RETURN QUERY
    SELECT us.id, us.name, us.email, us.role,
           us.status, us.last_signin_at, us.created_at
    FROM   public.users us
    WHERE  us.id = p_user_id;
END;
$$;


-- ── upsert_session ────────────────────────────────────────────
-- Updates the existing session for this user (one-session-per-user
-- policy) or inserts a new row if none exists.
-- Returns the full session record.
CREATE OR REPLACE FUNCTION public.upsert_session(
    p_user_id    UUID,
    p_token      TEXT,
    p_expires_at TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    id           UUID,
    user_id      UUID,
    token        TEXT,
    is_active    BOOLEAN,
    ip_address   TEXT,
    user_agent   TEXT,
    expires_at   TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    UPDATE public.sessions s
    SET
        token      = p_token,
        expires_at = p_expires_at::TIMESTAMPTZ,
        is_active  = TRUE,
        ip_address = p_ip_address,
        user_agent = p_user_agent
    WHERE s.user_id = p_user_id
    RETURNING s.id INTO v_session_id;

    IF v_session_id IS NULL THEN
        INSERT INTO public.sessions (
            user_id, token, is_active, ip_address, user_agent, expires_at
        )
        VALUES (
            p_user_id, p_token, TRUE, p_ip_address, p_user_agent,
            p_expires_at::TIMESTAMPTZ
        )
        RETURNING sessions.id INTO v_session_id;
    END IF;

    RETURN QUERY
    SELECT s.id, s.user_id, s.token, s.is_active,
           s.ip_address, s.user_agent, s.expires_at,
           s.last_seen_at, s.created_at
    FROM   public.sessions s
    WHERE  s.id = v_session_id;
END;
$$;


-- ── validate_session ──────────────────────────────────────────
-- Validates a session token and returns the full session record.
-- Raises 'auth.invalid_token'   if the token is not found.
-- Raises 'auth.session_expired' if the session has expired or been
-- deactivated. Updates last_seen_at on every successful validation.
CREATE OR REPLACE FUNCTION public.validate_session(p_token TEXT)
RETURNS TABLE (
    id           UUID,
    user_id      UUID,
    token        TEXT,
    is_active    BOOLEAN,
    ip_address   TEXT,
    user_agent   TEXT,
    expires_at   TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_user_id    UUID;
    v_expires_at TIMESTAMPTZ;
    v_is_active  BOOLEAN;
BEGIN
    SELECT s.user_id, s.expires_at, s.is_active
    INTO   v_user_id, v_expires_at, v_is_active
    FROM   public.sessions s
    WHERE  s.token = p_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'auth.invalid_token';
    END IF;

    IF v_expires_at < NOW() OR v_is_active = FALSE THEN
        RAISE EXCEPTION 'auth.session_expired';
    END IF;

    UPDATE public.sessions SET last_seen_at = NOW()
    WHERE  sessions.token = p_token;

    RETURN QUERY
    SELECT s.id, s.user_id, s.token, s.is_active,
           s.ip_address, s.user_agent, s.expires_at,
           s.last_seen_at, s.created_at
    FROM   public.sessions s
    WHERE  s.token = p_token;
END;
$$;


-- ── invalidate_session ────────────────────────────────────────
-- Marks a session as inactive (called by the logout handler).
CREATE OR REPLACE FUNCTION public.invalidate_session(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.sessions SET is_active = FALSE
    WHERE  sessions.token = p_token;
END;
$$;
