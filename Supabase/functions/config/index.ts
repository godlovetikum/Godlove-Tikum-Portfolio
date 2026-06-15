/**
 * config/index.ts
 *
 * Admin-only Edge Function for brand_config management.
 *
 * Route table:
 *
 *   GET   — List all config entries (key, value, updated_at).
 *            Returns { config: [{key, value, updated_at}, ...] }
 *
 *   PATCH — Update a single config key.
 *            Body: { key: string, value: string }
 *            Returns { message: string, config: { key: string, value: string, updated_ar: string } }
 *  
 *  POST — Create a new config key.
 *            Body: { key: string, value: string }
 *            Returns { message: string, config: { key: string, value: string, updated_ar: string }}
 *  DELETE — Delete a single config row.
 *            Body: { key: string }
 *            Returns { message: string }
 *
 * 
 * All routes require a valid admin JWT (verifyAdminAuth).
 */

import {  successResponse, handleError }
    from '../_shared/response.ts';
import { Errors }          from '../_shared/errors.ts';
import { verifyAdminAuth }  from '../_shared/auth.ts';
import { validate }      from '../_shared/validators.ts';
import { db }              from '../_shared/db.ts';


Deno.serve(async (req: Request): Promise<Response> => {
    
    try {
        await verifyAdminAuth(req);

        switch (req.method) {

            case 'GET': {
                const filters = await validate.configGetFilters(new URL(req.url));
                const rows = await db.config.listAll(filters);
                return successResponse({ message: `${rows.length} rows retrieved`, config: rows });     
            }
            
            case 'POST': {
                const body: Record<string, unknown> = await validate.parseReqBody(req)
                const key   = validate.nonEmptyString(body.key,   'key');
                const value = validate.nonEmptyString(body.value, 'value');
                
                const newConfig = await db.config.insert({ key, value });
                return successResponse({ message: `New config with key "${key}" created successfully`, config: newConfig })
            }
            
            case 'PATCH': {
                const body: Record<string, unknown> = await validate.parseReqBody(req)
                const key   = validate.nonEmptyString(body.key,   'key');
                const value = validate.nonEmptyString(body.value, 'value');
                
                const updated = await db.config.updateOne({ key, value});
                return successResponse({ message: `Config key "${key}" updated.`, config: updated });
            }
            
            case 'DELETE': {
                const body: Record<string, unknown> = await validate.parseReqBody(req)
                const key   = validate.nonEmptyString(body.key,   'key');
                
                await db.config.delete(key);
                return successResponse({ message: `Config with key "${key}" has been deleted successfully.` })
            }

            default: throw Errors.server.methodNotAllowed();
        }
    } catch (err) {
        return handleError(err);
    }
});
