/**
 * contacts/handlers/post.ts
 *
 * Inserts a new contact form submission.
 *
 * Steps:
 *   1. Validates and sanitises all fields via validate.newContactPayload().
 *   2. MX record check on the email domain — rejects non-mail-capable domains.
 *   3. Inserts via insert_contact() RPC.
 *   4. Returns 201 with the created contact row.
 */

import { successResponse } from '../../_shared/response.ts';
import { validate }        from '../../_shared/validators.ts';
import { db }              from '../../_shared/db.ts';


export async function handlePost(req: Request): Promise<Response> {
    const body: Record<string, unknown> = await validate.parseReqBody(req);
    const validated = await validate.newContactPayload(body);
    await db.contacts.insert(validated);

    return successResponse({
        message: 'Your message has been received. You will hear back shortly.',
    }, 201);
}
