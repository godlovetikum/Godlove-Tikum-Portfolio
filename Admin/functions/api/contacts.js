/**
 * functions/api/contacts.js
 *
 * Cloudflare Pages Function — contacts admin proxy.
 * Forwards GET and PATCH /api/contacts to the backend contacts Function.
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
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, PATCH, OPTIONS');
    return respond.preflight();
}


export async function onRequestGet({ request, env }){
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, PATCH, OPTIONS');

    if (!env.SUPABASE_URL) {
        console.error('[contacts.get] SUPABASE_URL not set');
        return respond.error({code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }
    try {
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/contacts`;
        
        const sessionToken = await validate.parseCookies(request, true);
        const queryParams = await validate.getAllParams(new URL(request.url));
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
            return respond.error({ code: err.code, message: err.message }, err.status );
        }
        console.error('[contacts.get] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)           
    }
}



export async function onRequestPatch({ request, env }){
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, PATCH, OPTIONS');

    if (!env.SUPABASE_URL) {
        console.error('[contacts.patch] SUPABASE_URL not set');
        return respond.error({code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }
    try {
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/contacts`;
        
        const sessionToken = await validate.parseCookies(request, true);
        const body = await validate.parseReqBody(request); 
        if (!body?.id || (!body?.status && !body?.read_at && !body?.replied_at && !body?.follow_up_at)) {
            throw new AppError(
                'validation.missing_input', 
                'Contact update must have an ID and at least one of the following fields: status, timestamps for read, replied and follow ups.', 
            400)                     
        }
        
        const queryParams = await validate.getAllParams(new URL(request.url));
        const targetUrl = new URL(backendUrl)
        targetUrl.search = new URLSearchParams(queryParams);
    
        const fetchResponse = await forwardToBackend(targetUrl, 'PATCH', body, sessionToken);
        if (fetchResponse?.success) {
            return respond.success({ ...fetchResponse?.data }, 200, null);
        } else {
            throw new  AppError(fetchResponse.error.code, fetchResponse.error.message, fetchResponse.status);
        }
    } catch (err) {
        if (err instanceof AppError) {
            return respond.error({ code: err.code, message: err.message }, err.status );
        }
        console.error('[contacts.patch] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)           
    }
}
