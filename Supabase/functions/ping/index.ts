/**
 * ping/index.ts
 *
 * HTTP methods: GET only
 *
 * Called by the GAS ping script every X days via a time-based trigger.
 * Validates Authorization header, runs a lightweight DB query, returns status.
 */

import { successResponse, handleError }  from '../_shared/response.ts';
import { Errors }                        from '../_shared/errors.ts';
import { verifyPingAuth }                from '../_shared/auth.ts';
import { db }                            from '../_shared/db.ts';

Deno.serve(async (req: Request): Promise<Response> => {

    try {
        if (req.method !== 'GET') throw Errors.server.methodNotAllowed();

        await verifyPingAuth(req);
        const counts = await db.contacts.getStatusCounts();

        return successResponse({
            message:   'Ping successful. Project is active.',
            pinged_at: new Date().toISOString(),
            contacts: counts
        });
    } catch (err) {
        return handleError(err);
    }
});
