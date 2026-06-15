/**
 * functions/api/auth.js
 *
 * Cloudflare Pages Function — admin auth proxy.
 *
 *  Session state is stored in HTTP-only cookies set by this function.
 * The browser never has access to raw JWT values.
 *
 * Routes by request.Method:
 *   Post = login - validate credentials (email, password ) and set cookies+ returns user profile 
 *   Get = getUser - validates users session and returns the user profile 
 *   Delete = logout - Invalidate the user session client side and clear cookies 
 * 
 * Env vars required:
 *   SUPABASE_URL   — https://<ref>.supabase.co
 *   ADMIN_ORIGIN   — https://admin.godlovetikum.pages.dev
 */

'use strict';

import validate, { AppError }   from './_shared/validators.js';
import Responder                from './_shared/response.js';
import forwardToBackend         from './_shared/forwarder.js';

/** Preflight request handler */

export async function onRequestOptions({ env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, OPTIONS, DELETE')
    return respond.preflight();
}

/**  Login request handler (request.Method === 'POST') */

export async function onRequestPost({ request, env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, OPTIONS, DELETE')

    if (!env.SUPABASE_URL) {
        console.error('[auth.js] SUPABASE_URL not set');
        return respond.error({code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }

    try {
        const body = await validate.parseReqBody(request);
        const action = await validate.getAction(new URL(request.url), ['login']);
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/auth?action=${action}`;
        
        const email = validate.email(body.email ?? '');
        const password = validate.password(body.password ?? '');
        
        
        const fetchResponse = await forwardToBackend(backendUrl, 'POST', { email, password });
        if (fetchResponse?.success) {
            const { session: newSession, ...otherFields } = fetchResponse.data;
            const cookieHeader = await validate.setCookies(newSession?.token, false)
            return respond.success({ ...otherFields }, 201, cookieHeader);
        } else {
            throw new  AppError(fetchResponse.error.code, fetchResponse.error.message, fetchResponse.status);
        }
        
    } catch (err) {
        if (err instanceof AppError) {
            return respond.error({ code: err.code, message: err.message }, err.status );
        }
        console.error('[auth.login] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)              
    }
}


/**
 *  Logout request handler (request.Method === 'DELETE')
 *  Invalidate session and clear cookies 
 */

export async function onRequestDelete({ request, env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, OPTIONS, DELETE')

    if (!env.SUPABASE_URL) {
        console.error('[auth.js] SUPABASE_URL not set');
        return respond.error({ code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }

    try {
        
        const action = await validate.getAction(new URL(request.url), ['logout']);
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/auth?action=${action}`;
        const sessionToken = await validate.parseCookies(request, false);
        
        if (sessionToken) forwardToBackend(backendUrl, 'DELETE', null, sessionToken).catch(() => {});
        const cookieHeader = await validate.setCookies(null, true)
        return respond.success({ message: 'Logout successful.' }, 200, cookieHeader);
        
    } catch (err) {
        console.error('[auth.logout] Unexpected error:', err.message);
        const cookieHeader = await validate.setCookies(null, true)
        return respond.success({ message: 'Logout successful.' }, 200, cookieHeader);
    }
}


/**
 *  Me request handler (request.Method === 'GET')
 *  Validate session and returns user profile 
 */

export async function onRequestGet({ request, env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, OPTIONS, DELETE')

    if (!env.SUPABASE_URL) {
        console.error('[auth.js] SUPABASE_URL not set');
        return respond.error({ code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }

    try {
        const action = await validate.getAction(new URL(request.url), ['me']);
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/auth?action=${action}`;
        
        const sessionToken = await validate.parseCookies(request, true);
        
        const fetchResponse = await forwardToBackend(backendUrl, 'GET', null, sessionToken);
        if (fetchResponse?.success) {
            const { session, ...otherFields } = fetchResponse.data;
            return respond.success({ ...otherFields }, 200, null);
        } else {
            throw new  AppError(fetchResponse.error.code, fetchResponse.error.message, fetchResponse.status);
        }
        
    } catch (err) {
        if (err instanceof AppError) {
            return respond.error({ code: err.code, message: err.message }, err.status );
        }
        console.error('[auth.getUser] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)              
    }
}
