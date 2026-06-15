/**
 * analytics/handle_post.ts
 *
 * Records a visitor or click event.
 * Routes internally by the `type` field in the body.
 *
 * Always returns success — analytics errors must never affect the visitor experience.
 */

import { successResponse } from '../../_shared/response.ts';
import { Errors }           from '../../_shared/errors.ts';
import { validate }       from '../../_shared/validators.ts';
import { db }               from '../../_shared/db.ts';
import type { VisitorRow, ClickRow } from '../../_shared/types.ts';

export async function handlePost(req: Request): Promise<Response> {
    const body =    await validate.parseReqBody(req);
    const event_type = String(body.type ?? '').trim();

    if (event_type === 'visitor') {
        const payload: VisitorRow = await validate.newVisitorPayload(body);
        await db.analytics.upsertVisitor(payload);

        return successResponse({ message: 'Visitor event recorded.' });
    }

    if (event_type === 'click') {
        const payload: ClickRow = await validate.newClickPayload(body);
        await db.analytics.insertClick(payload);

        return successResponse({ message: 'Click event recorded.' });
    }

    throw Errors.validation.invalidInput('type', 'Must be "visitor" or "click".');
}
