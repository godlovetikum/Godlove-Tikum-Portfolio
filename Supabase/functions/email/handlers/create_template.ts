/**
 * email/handlers/create_template.ts
 *
 * Creates a new email_templates row from the admin dashboard.
 *
 * Required body fields:
 *   category  — must be a non-empty string (validated against DB enum at insert)
 *   type      — must be a non-empty string (validated against DB enum at insert)
 *   subject   — validated by validate.subject (non-empty, max 200 chars)
 *   html_body — non-empty string, sanitised, max 200 000 chars
 *   text_body - optional plain text for html fallback, 2000 chars max
 *
 * Validation errors from missing/empty fields throw AppError and propagate
 * to the top-level try/catch in email/index.ts which calls handleError().
 * Duplicate (category × type) and invalid enum values are raised by the SQL
 * function and surface as a db.query_failed 400.
 */

import { successResponse } from '../../_shared/response.ts';
import { Errors }          from '../../_shared/errors.ts';
import { validate }        from '../../_shared/validators.ts';
import { db }              from '../../_shared/db.ts';


export async function createEmailTemplate(req: Request): Promise<Response> {
    const body: Record<string, unknown> = await validate.parseReqBody(req);

    const category  = validate.nonEmptyString(body.category,  'category');
    const type      = validate.nonEmptyString(body.type,      'type');
    const subject   = validate.subject(body.subject);
    const html_body = String(body.html_body ?? '');
    const text_body = validate.sanitiseText(body.text_body ?? '');

    if (!html_body || html_body.length < 50 || html_body.length > 200000) {
        throw Errors.validation.invalidInput('html body', 'Must be 50 - 200,000 characters.');
    }

    if (!text_body || text_body.length < 50 || text_body.length > 2000) {
        throw Errors.validation.invalidInput('text body', 'Must be 50 - 2,000 characters.');
    }

    const created = await db.templates.create({ category, type, subject, html_body, text_body });
    return successResponse({ message: 'Template created.', template: created });
}
