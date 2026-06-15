/**
 * auth/index.ts
 *
 * HTTP entry point for the auth Edge Function.
 * Routes by HTTP method or the optional "action" query param:
 *
 *   GET  / action=me      — Verify a token and return the current admin user profile.
 *   POST / action=login   — Sign in with email + password. Returns session tokens.
 *   DELETE / action=logout — Invalidate the current session token.
 *
 * No Supabase project keys are returned to the client. The Cloudflare Pages
 * Function receives session and immediately stores them as HTTP-only cookies.
 * The browser never reads the token values directly.
 */

import { Errors }      from '../_shared/errors.ts';
import { handleError } from '../_shared/response.ts';
import { login }       from './handlers/login.ts';
import { logout }      from './handlers/logout.ts';
import { getUser }     from './handlers/me.ts';
import { validate }    from '../_shared/validators.ts';


Deno.serve(async (req: Request): Promise<Response> => {
    try {
        const url    = new URL(req.url);
        const method = req.method.toUpperCase();

        // action param is optional — routing falls back to HTTP method
        const action = validate.getParam(url, 'action', false) ?? '';

        if (method === 'GET'    && (!action || action === 'me'))     return await getUser(req);
        if (method === 'POST'   && (!action || action === 'login'))  return await login(req);
        if (method === 'DELETE' && (!action || action === 'logout')) return await logout(req);

        throw Errors.server.methodNotAllowed();
    } catch (err) {
        return handleError(err);
    }
});
