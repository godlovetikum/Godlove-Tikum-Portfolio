/**
 * functions/api/analytics.js
 *
 * Cloudflare Pages Function — analytics admin proxy.
 * Forwards GET /api/analytics to backend Functions.
 * Supports ?view=summary (default), ?view=trend, and ?view=raw.
 *
 * 
 * Env vars:
 *   SUPABASE_URL   — https://<ref>.supabase.co
 *   ADMIN_ORIGIN   — https://admin.godlovetikum.pages.dev
 */


'use strict';

import validate, { AppError }   from './_shared/validators.js';
import Responder                from './_shared/response.js';
import forwardToBackend         from './_shared/forwarder.js';


/** Preflight request handler */
export async function onRequestOptions({ env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, OPTIONS');
    return respond.preflight();
}



export async function onRequestGet({ request, env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, OPTIONS');

    if (!env.SUPABASE_URL) {
        console.error('[analytics.get] SUPABASE_URL not set');
        return respond.error({code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }
    try {
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/analytics`;

        const sessionToken = await validate.parseCookies(request, true);
        const queryParams = await validate.getAllParams(request.url);
        const targetUrl = new URL(backendUrl)
        targetUrl.search = new URLSearchParams(queryParams);
    
        const fetchResponse = await forwardToBackend(targetUrl, 'GET', null, sessionToken);
        if (fetchResponse?.success) {
            return respond.success({ ...fetchResponse?.data }, 200, null);
        } else {
            throw new  AppError(fetchResponse.error.code, fetchResponse.error.message, fetchResponse.status);
        }
    } catch (err) {
        if (err instanceof AppError) {
            return respond.error({ code: err.code, message: err.message }, error.status );
        }
        console.error('[analytics.get] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)           
    }
}
