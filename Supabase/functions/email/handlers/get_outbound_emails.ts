/**
 * email/handlers/get_outbound_emails.ts
 *
 * Returns a paginated list of outbound_emails tracking records.
 * Used by the admin dashboard to monitor send history and failures.
 *
 * Query params:
 *   action      = "outbound"  (required — routes here from index.ts)
 *   contact_id  — UUID filter to all emails for one contact
 *   status      — filter: pending | sent | failed
 *   email_type  — filter: notification | acknowledgement | reply | follow_up | standalone
 *   page        — page number (default 1)
 *   limit       — rows per page (default 20, max 100)
 */

import { successResponse } from '../../_shared/response.ts';
import { db }              from '../../_shared/db.ts';


export async function handleGetOutboundEmails(req: Request): Promise<Response> {
    const url = new URL(req.url);

    const filters = {
        contact_id: url.searchParams.get('contact_id') ?? undefined,
        status:     url.searchParams.get('status')     ?? undefined,
        email_type: url.searchParams.get('email_type') ?? undefined,
        page:       Number(url.searchParams.get('page')  ?? 1),
        limit:      Number(url.searchParams.get('limit') ?? 20),
    };

    const { rows, total } = await db.outbound.list(filters);

    return successResponse({
        message: `${rows.length} outbound email(s) returned.`,
        emails:  rows,
        total,
        page:    filters.page,
        limit:   filters.limit,
    });
}
