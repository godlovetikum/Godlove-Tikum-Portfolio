/**
 * _shared/auth.ts
 *
 * Four levels of access:
 *
 *   TRIGGER_KEY — for the DB webhook.
 *     The Authorization Bearer token is compared directly against
 *     the TRIGGER_KEY environment variable.
 *     Synchronous — no network call required.
 * 
 *  CLIENT_AUTH_SECRET — Cloudflare Pages Functions.
 *     The Authorization Bearer token is compared directly against
 *     the CLIENT_AUTH_SECRET environment variable.
 *     Synchronous — no network call required.
 * 
 *   KEEP_ALIVE_SECRET  — For the GAS keep-alive ping.
 *     The  Authorization  Bearer token is compared directly against
 *     the KEEP_ALIVE_SECRET environment variable.
 *     Synchronous — no network call required.
 * 
 *   Admin SESSION — admin dashboard (user).
 *     The token is verified by calling public.validate_session() which
 *     validates the Authorization  Bearer token against the custom 
 *     essions table server and returns the full user session record. 
 *   User profile is then retrieved to check account status and user.role must equal "admin".
 *     Asynchronous — makes 2 network call per request.
 *
 * All query go through db.ts which uses one client instance 
 * All failures throw AppError so handleError in response.ts catches them.
 */

import { db } from      './db.ts';
import { AppError, Errors } from './errors.ts';
import type { Session } from './types.ts';



/**
 * Validates the Authorization Bearer token against the CLIENT_AUTH_SECRET environment variable.
 * Throws Errors.auth.unauthorized() if the token is absent or incorrect.
 * @param req The incoming Request.
 */
export async function verifyClientAuth(req: Request): Promise<void> {
    const authKey = Deno.env.get('CLIENT_AUTH_SECRET');

    if (!authKey) {
        console.error('[auth.verifyClientAuth] CLIENT_AUTH_SECRET not set.');
        throw Errors.server.unexpected();
    }
    
    const incoming = extractBearerToken(req);
    if (!incoming || incoming !== authKey) throw Errors.auth.unauthorized();
}



/**
 * Validates that the request carries a valid session token belonging to an
 * admin user (user.role === "admin").
 * @param req The incoming Request.
 */
export async function verifyAdminAuth(req: Request): Promise<Session> {
    const token = extractBearerToken(req);
    if (!token) throw Errors.auth.unauthorized();

    const session: Session = await db.auth.validateSession(token);
    const user = await db.auth.getUser(session.user_id);
    if (user?.role !== 'admin' || user?.status !== 'active') throw Errors.auth.forbidden();
    return session;
}


/**
 * Validates the request Authorization header against TRIGGER_KEY environment variable.
 * @param {Request} req the full http request 
 */
export async function verifyTriggerAuth(req: Request): Promise<void> {
    const token = extractBearerToken(req);
    if (!token) throw Errors.auth.unauthorized();

    const authKey = Deno.env.get('TRIGGER_KEY');
    if (!authKey) {
        console.error('[auth.verifyTriggerCaller] TRIGGER_KEY not set.');
        throw Errors.server.unexpected();
    }
    if(token !== authKey) throw Errors.auth.unauthorized();
}

/**
 * Validate the Authorization header against KEEP_ALIVE_SECRET environment variable.
 * @param {Request} req the incoming request from GAS
 */
export async function verifyPingAuth(req: Request): Promise<void>{
    const keepAliveSecret = Deno.env.get("KEEP_ALIVE_SECRET") as string;
    if (!keepAliveSecret) {
        console.error("[auth.verifyKeepAliveSecret] KEEP_ALIVE_SECRET not set");
        throw Errors.config.missing("KEEP_ALIVE_SECRET");
    }
    
    const incoming =  extractBearerToken(req);
    if (!incoming || incoming !== keepAliveSecret) {
        throw Errors.auth.unauthorized();
    }
}



/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if the header is absent or not a Bearer scheme.
 */
export function extractBearerToken(req: Request): string | null {
    const header = (req.headers.get("Authorization") ?? "").trim();
    if (!header || !header.startsWith("Bearer "))  return null;
    const token = header.split(" ")[1].trim();
    return token || null;
}


