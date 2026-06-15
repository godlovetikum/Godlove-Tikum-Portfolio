/**
 * email/handlers/get_templates.ts
 *
 * Returns all email_templates rows ordered by category then type.
 * Used by the admin dashboard templates page.
 */

import { successResponse } from '../../_shared/response.ts';
import { db }              from '../../_shared/db.ts';
import { Errors }          from '../../_shared/errors.ts';
import { validate }        from '../../_shared/validators.ts';


export async function getTemplates(req: Request): Promise<Response> {
    const url     = new URL(req.url);
    const filters = await validate.getTemplateFilters(url);
    const templates = await db.templates.getTemplates(filters);
    return successResponse({
        message:   `${templates.length} template(s) returned.`,
        templates,
        filters,
    });
}


/**
 * Returns a single email_templates row by UUID.
 * Requires id query param: GET /email?action=template&id=<uuid>
 */
export async function getOneTemplate(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const id  = validate.getParam(url, 'id');
    if (!id) throw Errors.validation.missingField('id');
    const template = await db.templates.getById(id);
    return successResponse({ message: 'Template retrieved.', template });
}
