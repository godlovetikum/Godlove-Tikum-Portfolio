/**
 * contacts/handlers/patch.ts
 *
 * Updates mutable admin fields on a contact row.
 *
 * Accepted fields: status, read_at, replied_at, follow_up_at.
 * status must be one of: new | read | replied | follow_up.
 * All timestamp fields are optional ISO strings or null.
 */

import { successResponse } from '../../_shared/response.ts';
import { Errors  }          from '../../_shared/errors.ts';
import { validate }       from '../../_shared/validators.ts';
import { db }               from '../../_shared/db.ts';


export async function handlePatch(req: Request): Promise<Response> {               
    const body: Record<string, unknown>= await validate.parseReqBody(req);
    if (!body.id) throw Errors.validation.missingField('id');

    const id     = validate.uuid(body.id, 'id');
    const fields = validate.contactUpdateFields(body);
    const updated = await db.contacts.update({id, fields });

    return successResponse({
        message: 'Contact updated successfully.',
        contact: updated,
    });
}
