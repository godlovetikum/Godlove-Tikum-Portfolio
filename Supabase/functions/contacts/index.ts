/**
 * contacts/index.ts
 *
 * HTTP entry point for the contacts Edge Function.
 *
 *   POST  — Cloudflare Pages contact.js (service role). Inserts a new contact row.         
 *           The DB webhook fires the email Edge Function on INSERT.
 *
 *   GET   — Admin dashboard (admin JWT). Paginated, filtered contact list.
 *
 *   PATCH — Admin dashboard (admin JWT). Update status / timestamps.
 */

import { handleError } from '../_shared/response.ts';
import { Errors }       from '../_shared/errors.ts';
import { verifyClientAuth, verifyAdminAuth }    from '../_shared/auth.ts';
import { handlePost }  from './handlers/post.ts';
import { handleGet }   from './handlers/get.ts';
import { handlePatch } from './handlers/patch.ts';


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

            case 'PATCH': {
                await verifyAdminAuth(req);
                return await handlePatch(req);
            }

            default: throw Errors.server.methodNotAllowed();
        }
    } catch (err) {
        return handleError(err);
    }
});
