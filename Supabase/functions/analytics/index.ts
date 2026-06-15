/**
 * analytics/index.ts
 *
 * HTTP entry point for the analytics Edge Function.
 *
 *   POST — Cloudflare Pages analytics.js (service role). Records visitor or click events.
 *          Always returns success — analytics must never break the visitor experience.
 *
 *   GET  — Admin dashboard (admin JWT). Returns aggregated summary, daily trend, or raw rows.
 */

import { handleError } from '../_shared/response.ts';
import { Errors }                           from '../_shared/errors.ts';
import { verifyClientAuth, verifyAdminAuth }    from '../_shared/auth.ts';
import { handlePost } from './handlers/post.ts';
import { handleGet }  from './handlers/get.ts';


Deno.serve(async (req: Request): Promise<Response> => {

    try {
        switch (req.method) {

            case 'POST': {
                await verifyClientAuth(req);
                return await handlePost(req);
            }

            case 'GET': {
                await verifyAdminAuth(req);
                return await handleGet(req);
            }

            default: throw Errors.server.methodNotAllowed();
        }
    } catch (err) {
        // Swallow errors if it's from the public site 
        if (req.method === 'POST') {
            console.error('[analytics] POST error swallowed:', err);
            return new Response(
                JSON.stringify({ success: true, data: { message: 'Event recorded.' }, error: null }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return handleError(err);
    }
});
