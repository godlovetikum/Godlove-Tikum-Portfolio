/**
 * functions/api/analytics.js
 *
 * Cloudflare Pages Function — thin gateway for portfolio analytics events.
 * Handles POST /api/analytics and OPTIONS preflight.
 *
 * Responsibilities (in order):
 *   1. Handle CORS preflight
 *   2. Silently succeed on any method that is not POST
 *   3. Guard required environment variables
 *   4. Parse request body
 *   5. Normalise input and validate against the ALLOWED_ANALYTICS_PAYLOADS list
 *   6. Basic type and presence check per event type
 *   7. Forward to the analytics Supabase Edge Function
 *
 * IMPORTANT: Analytics must NEVER break the visitor experience.
 * Every non-POST path and every validation failure returns a silent 200.
 * Errors are logged server-side only.
 *
 * Environment variables — set in Cloudflare Pages dashboard → Settings → Variables:
 *   SUPABASE_URL         — Supabase project URL (https://ref.supabase.co)
 *   CLIENT_AUTH_SECRET   — Shared secret, must match the value in Supabase Edge Function secrets
 *   PORTFOLIO_ORIGIN     — Canonical site origin, e.g. https://godlovetikum.pages.dev
 */

'use strict';

import { ALLOWED_ANALYTICS_PAYLOADS } from './_analytics_config.js';

const EDGE_ENDPOINT  = '/functions/v1/analytics';
const VALID_DEVICES  = new Set(['mobile', 'desktop']);


// ── Helpers ───────────────────────────────────────────────────────────────────

function clean(value, maxLength) {
    return String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

function silentOk(origin) {
    return new Response(
        JSON.stringify({ success: true, data: { message: 'Event recorded.' }, error: null }),
        {
            status:  200,
            headers: {
                'Access-Control-Allow-Origin':  origin,
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type':                 'application/json',
            },
        }
    );
}

/**
 * Validates that a click payload matches an allowed event/section/target
 * combination AND originates from the expected domain.
 */
function isAllowedAnalyticsPayload(payload, allowedOrigin) {
    if (!payload || typeof payload !== 'object') return false;
    if (!payload.page || !String(payload.page).startsWith(allowedOrigin)) return false;

    return ALLOWED_ANALYTICS_PAYLOADS.some(
        (allowed) =>
            allowed.event    === payload.event    &&
            allowed.section  === payload.section  &&
            allowed.target   === payload.target   &&
            allowed.external === payload.external
    );
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


// ── Request handler ───────────────────────────────────────────────────────────

export async function onRequest({ request, env }) {
    const origin = env.PORTFOLIO_ORIGIN ?? '';

    // ── Non-POST methods — silent success ─────────────────────────
    if (request.method !== 'POST') return silentOk(origin);

    // ── Environment guard ─────────────────────────────────────────
    if (!env.SUPABASE_URL || !env.CLIENT_AUTH_SECRET) {
        console.warn('[analytics] Missing env vars — skipping.');
        return silentOk(origin);
    }

    // ── Parse body ────────────────────────────────────────────────
    let body;
    try {
        body = await request.json();
    } catch {
        return silentOk(origin);
    }
    
    // ── Collect Cloudflare metadata ───────────────────────────────
    const ipAddress = request.headers.get('CF-Connecting-IP') ?? null;
    const country   = request.headers.get('CF-IPCountry')    ?? null;


    const eventType = String(body.type || '').trim();
    let payload;

    // ── Visitor event ─────────────────────────────────────────────
    if (eventType === 'visitor') {
        const sessionId = clean(body.sessionId, 64);
        const device    = clean(body.device, 10).toLowerCase();

        if (!sessionId || !VALID_DEVICES.has(device)) return silentOk(origin);

        payload = {
            type:          'visitor',
            session_id:     sessionId,
            device:        device,
            referrer:      clean(body.referrer || '', 100) || null,
            siteKey:       clean(body.siteKey  || '', 50)  || null,
            ipAddress:      ipAddress ?? null,
            country:        country ?? null,
        };

    // ── Click event ───────────────────────────────────────────────
    } else if (eventType === 'click') {
        const sessionId  = clean(body.sessionId, 64);
        const clickEvent = clean(body.event,     30).toLowerCase();
        const section    = clean(body.section,   30);
        const target     = clean(body.target,    50);
        const page       = clean(body.page,      200);

        if (!sessionId || !clickEvent || !section || !target) return silentOk(origin);

        const analyticsPayload = {
            event:    clickEvent,
            section:  section,
            target:   target,
            external: Boolean(body.external),
            page:     page,
        };

        if (!isAllowedAnalyticsPayload(analyticsPayload, origin)) {
            console.warn('[analytics] Rejected payload:', analyticsPayload);
            return silentOk(origin);
        }

        payload = {
            type:          'click',
            session_id:     sessionId,
            event:         clickEvent,
            section:       section,
            target:        target,
            external:      Boolean(body.external),
            page:          page || null,
            site_key:       clean(body.siteKey || '', 50) || null,
            ip_address:      ipAddress ?? null,
            country:        country ?? null,
            authorization: env.CLIENT_AUTH_SECRET,
        };

    // ── Unknown event type — silent success ───────────────────────
    } else {
        return silentOk(origin);
    }

    // ── Forward to Supabase Edge Function ─────────────────────────
    try {
        await fetch(`${env.SUPABASE_URL}${EDGE_ENDPOINT}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.CLIENT_AUTH_SECRET}`},                    
            body:    JSON.stringify(payload),
        });
    } catch (err) {
        console.error('[analytics] Edge Function request failed:', err.message, payload);
    }

    return silentOk(origin);
}
