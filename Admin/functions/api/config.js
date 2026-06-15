/**
 *  functions/api/config.js
 *  Cloudflare pages function for config management - admin proxy 
 *  GET - Fetch brand config
 *  POST - Create new brand config 
 *  PATCH - update the brand config record 
 *  DELETE - for delete request 
 * 
 *  All request are gated with session.required(true)
 */
 
 
'use strict';

import validate, { AppError }   from './_shared/validators.js';
import Responder                from './_shared/response.js';
import forwardToBackend         from './_shared/forwarder.js';


/** Preflight request handler */
export async function onRequestOptions({ env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, PATCH, DELETE, OPTIONS');
    return respond.preflight();
}

/**  Retrieve brand config values  */
export async function onRequestGet({ request, env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, PATCH, DELETE, OPTIONS');

    if (!env.SUPABASE_URL) {
        console.error('[config.get] SUPABASE_URL not set');
        return respond.error({ code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }
    try {
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/config`;

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
        console.error('[config.get] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)           
    }
}


/**   Create a new brand config row  */
export async function onRequestPost({ request, env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, PATCH, DELETE, OPTIONS');
    if (!env.SUPABASE_URL) {
        console.error('[config.post] SUPABASE_URL not set');
        return respond.error({code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }
    try {
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/config`;

        const sessionToken = await validate.parseCookies(request, true);
        const body  = await validate.parseReqBody(request);
        if (!body || !body?.key || !body?.value) {
            throw new AppError(
                'validation.missing_input',
                'To create new brand config, you must include a key and value input fields in the request body.',
            400)
        }
        const queryParams = await validate.getAllParams(new URL(request.url));
        const targetUrl = new URL(backendUrl)
        targetUrl.search = new URLSearchParams(queryParams);
    
        const fetchResponse = await forwardToBackend(targetUrl, 'POST', body, sessionToken);
        if (fetchResponse?.success) {
            return respond.success({ ...fetchResponse?.data }, 201, null);
        } else {
            throw new  AppError(fetchResponse.error.code, fetchResponse.error.message, fetchResponse.status);
        }
    } catch (err) {
        if (err instanceof AppError) {
            return respond.error({ code: err.code, message: err.message }, err.status );
        }
        console.error('[config.post] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)           
    }
}


/**  Update an existing brand config row  */
export async function onRequestPatch({ request, env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, PATCH, DELETE, OPTIONS');
    if (!env.SUPABASE_URL) {
        console.error('[config.patch] SUPABASE_URL not set');
        return respond.error({code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }
    try {
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/config`;

        const sessionToken = await validate.parseCookies(request, true);
        const body  = await validate.parseReqBody(request);
        if (!body || !body?.key || !body?.value) {
            throw new AppError(
                'validation.missing_input',
                'To update brand config, you must include a key and value input fields in the request body.',
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
        console.error('[config.patch] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)           
    }
}


/**  Delete a record from brand config  */
export async function onRequestDelete({ request, env }) {
    const respond = new Responder(env.ADMIN_ORIGIN, 'GET, POST, PATCH, DELETE, OPTIONS');
    if (!env.SUPABASE_URL) {
        console.error('[config.delete] SUPABASE_URL not set');
        return respond.error({code: 'server.configuration_error', message: 'Service unavailable. Please try again later.'}, 500);
    }
    try {
        const backendUrl = `${env.SUPABASE_URL}/functions/v1/config`;

        const sessionToken = await validate.parseCookies(request, true);
        const body  = await validate.parseReqBody(request);
        if (!body || !body?.key ) {
            throw new AppError(
                'validation.missing_input',
                'Please specify which key to delete from brand config',
            400)
        }
        const queryParams = await validate.getAllParams(new URL(request.url));
        const targetUrl = new URL(backendUrl)
        targetUrl.search = new URLSearchParams(queryParams);
    
        const fetchResponse = await forwardToBackend(targetUrl, 'DELETE', body, sessionToken);
        if (fetchResponse?.success) {
            return respond.success({ ...fetchResponse?.data }, 204, null);
        } else {
            throw new  AppError(fetchResponse.error.code, fetchResponse.error.message, fetchResponse.status);
        }
    } catch (err) {
        if (err instanceof AppError) {
            return respond.error({ code: err.code, message: err.message }, err.status );
        }
        console.error('[config.delete] Unexpected error:', err.message);
        return respond.error({ code: 'server.unexpected_error', message: 'An unexpected error occurred. Please try again.' }, 500)           
    }
}
