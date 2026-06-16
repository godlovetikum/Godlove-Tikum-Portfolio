/**
 * functions/api/email.js
 *
 * Cloudflare Pages Function — email admin proxy.
 * Forwards GET, PATCH, POST /api/email to the Supabase email Edge Function.
 *
 * Session is read from the HTTP-only _gt_admin_session cookie (set by auth.js).
 * The cookie value is forwarded as a Bearer token to Supabase.
 * The browser never reads the token directly.
 *
 * Env vars:
 *   SUPABASE_URL   — https://<ref>.supabase.co
 *   ADMIN_ORIGIN   — your admin CF Pages URL (set in CF Pages dashboard)
 */

'use strict';

import validate, { AppError }   from './_shared/validators.js';
import Responder                from './_shared/response.js';
import forwardToBackend         from './_shared/forwarder.js';


/** Preflight request handler */
export async function onRequestOptions({ env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, PATCH, OPTIONS');
    return respond.preflight();
}


async function proxy({ request, env }, method) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, PATCH, OPTIONS');

    if (!env.SUPABASE_URL) {
        console.error('[email.js] SUPABASE_URL not set');
        return respond.error({ code: 'server.configuration_error', message: 'Service unavailable. Please try again later.' }, 500);
    }

    try {
        const sessionToken = await validate.parseCookies(request, true);

        const url       = new URL(request.url);
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/email`;
        const targetUrl  = new URL(backendUrl);
        targetUrl.search = url.search;

        let body = null;
        if (method === 'POST' || method === 'PATCH') {
            body = await validate.parseReqBody(request);
        }

        const fetchResponse = await forwardToBackend(targetUrl, method, body, sessionToken);
        if (fetchResponse?.success) {
            return respond.success({ ...fetchResponse?.data }, 200, null);
        } else {
            throw new AppError(fetchResponse.error.code, fetchResponse.error.message, fetchResponse.status);
        }

    } catch (err) {
        if (err instanceof AppError) {
            return respond.error({ code: err.code, message: err.message }, err.status);
        }
        console.error('[email proxy] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500);
    }
}

export const onRequestGet   = (ctx) => proxy(ctx, 'GET');
export const onRequestPatch = (ctx) => proxy(ctx, 'PATCH');
export const onRequestPost  = (ctx) => proxy(ctx, 'POST');
