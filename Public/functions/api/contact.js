/**
 * functions/api/contact.js
 *
 * Cloudflare Pages Function — thin gateway for the portfolio contact form.
 * Handles POST /api/contact and OPTIONS preflight.
 *
 * Responsibilities (in order):
 *   1. Handle CORS preflight
 *   2. Enforce POST method
 *   3. Guard required environment variables
 *   4. Parse request body
 *   5. Silently discard bot submissions via honeypot
 *   6. Validate required field presence and basic email format
 *   7. Verify page origin matches PORTFOLIO_ORIGIN
 *   8. Collect Cloudflare metadata: IP address and country
 *   9. Forward to the contacts Supabase Edge Function
 *  10. Return the Edge Function response to the client
 *
 * No business logic lives here. All deep validation 
 * is performed by the contacts Edge Function.
 *
 * Environment variables — set in Cloudflare Pages dashboard → Settings → Variables:
 *   SUPABASE_URL         — Supabase project URL (https://ref.supabase.co)
 *   CLIENT_AUTH_SECRET   — Shared secret, must match the value in Supabase Edge Function secrets
 *   PORTFOLIO_ORIGIN     — Canonical site origin (set in CF Pages dashboard)
 */

'use strict';

const REQUIRED_FIELDS = ['name', 'email', 'message'];
const EMAIL_REGEX     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EDGE_ENDPOINT   = '/functions/v1/contacts';


// ── Response helpers ──────────────────────────────────────────────────────────

function errorBody(code = 'server.unknown_error', message = 'An unknown error occurred. Please reach out through WhatsApp or email directly.') {
    return JSON.stringify({ success: false, data: null, error: { code, message } });
}

function successBody(message) {
    return JSON.stringify({ success: true, data: { message }, error: null });
}

function clean(value, maxLength) {
    return String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}


// ── CORS preflight ────────────────────────────────────────────────────────────

export async function onRequestOptions({ env }) {
    const origin = env.PORTFOLIO_ORIGIN ?? '';
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin':  origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}


// ── POST handler ──────────────────────────────────────────────────────────────

export async function onRequestPost({ request, env }) {
    const origin = env.PORTFOLIO_ORIGIN ?? '';

    const CORS_HEADERS = {
        'Access-Control-Allow-Origin':  origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type':                 'application/json',
    };

    // ── Environment guard ─────────────────────────────────────────
    if (!env.SUPABASE_URL || !env.CLIENT_AUTH_SECRET) {
        console.error('[contact] Missing SUPABASE_URL or CLIENT_AUTH_SECRET.');
        return new Response(
            errorBody(
                'server.configuration_error',
                'Unable to process your message. Please reach out directly via WhatsApp or email.'
            ),
            { status: 500, headers: CORS_HEADERS }
        );
    }

    // ── Parse body ────────────────────────────────────────────────
    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(
            errorBody('validation.invalid_input', 'Your request could not be understood.'),
            { status: 400, headers: CORS_HEADERS }
        );
    }

    // ── Honeypot — silently succeed without forwarding ────────────
    if (typeof body.company === 'string' && body.company.trim() !== '') {
        return new Response(
            successBody('Your message has been received. You will hear back shortly.'),
            { status: 200, headers: CORS_HEADERS }
        );
    }

    // ── Required field presence check ─────────────────────────────
    for (const field of REQUIRED_FIELDS) {
        if (!body[field] || String(body[field]).trim() === '') {
            return new Response(
                errorBody('validation.missing_field', `The "${field}" field is required and cannot be empty.`),
                { status: 400, headers: CORS_HEADERS }
            );
        }
    }

    // ── Basic email format check ──────────────────────────────────
    if (!EMAIL_REGEX.test(String(body.email).trim())) {
        return new Response(
            errorBody('validation.invalid_email', 'Invalid email address. Check the format and try again.'),
            { status: 400, headers: CORS_HEADERS }
        );
    }

    // ── Page origin check — silently succeed on mismatch ─────────
    if (!body.page || !String(body.page).startsWith(origin)) {
        return new Response(
            successBody('Your message has been received. You will hear back shortly.'),
            { status: 200, headers: CORS_HEADERS }
        );
    }

    // ── Collect Cloudflare metadata ───────────────────────────────
    const ipAddress = request.headers.get('CF-Connecting-IP') ?? null;
    const country   = request.headers.get('CF-IPCountry')    ?? null;

    // ── Normalise and sanitise payload ────────────────────────────
    const payload = {
        name:          clean(body.name,     50),
        email:         clean(body.email,    100).toLowerCase(),
        message:       clean(body.message,  2000),
        category:      clean(body.category  || 'other', 30),
        page:          clean(body.page      || '', 500) || null,
        siteKey:       clean(body.siteKey   || '', 50)  || null,
        sessionId:     clean(body.sessionId || '', 64)  || null,
        ipAddress:    ipAddress,
        country:       country,
    };

    // ── Forward to backend ─────────────────────────
    try {
        const response = await fetch(`${env.SUPABASE_URL}${EDGE_ENDPOINT}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CLIENT_AUTH_SECRET}` },
            body:    JSON.stringify(payload),
        });

        const responseData = await response.json();

        if (!responseData.success) {
            return new Response(
                errorBody(responseData?.error?.code, responseData?.error?.message),
                { status: response.status, headers: CORS_HEADERS }
            );
        }

        return new Response(
            successBody(responseData.data.message),
            { status: response.status, headers: CORS_HEADERS }
        );

    } catch (err) {
        console.error('[contact] Edge Function request failed:', err.message);
        return new Response(
            errorBody(
                'server.unexpected_error',
                'Your message could not be processed right now. Please try WhatsApp or email directly.'
            ),
            { status: 502, headers: CORS_HEADERS }
        );
    }
}
