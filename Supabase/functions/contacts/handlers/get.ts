/**
 * contacts/handlers/get.ts
 *
 * Returns a paginated, filtered list of contacts for the admin dashboard.
 *
 * Query params:
 *   status   — filter by contact_status (new | read | replied | follow_up)
 *   category — filter by contact_category
 *   from, to — ISO date strings for created_at range
 *   page     — page number (default 1)
 *   limit    — rows per page (default 20, max 100)
 */

import { successResponse } from '../../_shared/response.ts';
import { validate }        from '../../_shared/validators.ts';
import { db }              from '../../_shared/db.ts';


export async function handleGet(req: Request): Promise<Response> {
    const url     = new URL(req.url);
    const filters = await validate.contactGetFilters(url);

    const { rows, total } = await db.contacts.list(filters);

    return successResponse({
        message:  `${rows.length} contact(s) returned.`,
        contacts: rows,
        total,
        page:     filters.page,
        limit:    filters.limit,
    });
}
