/**
 * email/handlers/handle_patch_template.ts
 *
 * Updates subject and/or html_body on a single email_templates row.
 * At least one of subject or html_body must be provided.
 */

import { successResponse, errorResponse } from '../../_shared/response.ts';
import { Errors }                          from '../../_shared/errors.ts';
import { validate }                        from '../../_shared/validators.ts';
import { db }                              from '../../_shared/db.ts';


export async function handlePatchTemplate(
    body: Record<string, unknown>
): Promise<Response> {
    const id     = validate.uuid(body.id, 'id');
    const fields: { subject?: string; html_body?: string } = {};

    if (body.subject !== undefined) {
        fields.subject = validate.sanitiseText(String(body.subject)).slice(0, 200);
        if (!fields.subject) return errorResponse(Errors.validation.missingField('subject'));
    }
    if (body.html_body !== undefined) {
        fields.html_body = String(body.html_body).slice(0, 200_000);
        if (!fields.html_body) return errorResponse(Errors.validation.missingField('html_body'));
    }

    if (!fields.subject && !fields.html_body) {
        return errorResponse(Errors.validation.missingField('subject or html_body'));
    }

    const updated = await db.templates.update({ id, fields });
    return successResponse({ message: 'Template updated.', template: updated });
}
