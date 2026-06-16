/**
 * auth/handle_me.ts
 *
 * Verifies the Bearer token and returns the current admin user's profile.
 * Used by the Cloudflare Pages Function on every protected page load
 * to validate the session cookie before serving the page.
 */

import { verifyAdminAuth } from '../../_shared/auth.ts';
import { db }              from '../../_shared/db.ts';
import { Errors }          from '../../_shared/errors.ts';
import type { Session, User } from '../../_shared/types.ts';
import { successResponse } from '../../_shared/response.ts';


/**
 * Validate user session and returns user profile.
 * @param req the incoming http request
 */
export async function getUser(req: Request): Promise<Response> {
    const session: Session = await verifyAdminAuth(req);
    const user: User = await db.auth.getUser(session.user_id);

    return successResponse({
        message: 'Session validated successfully.',
        session,
        user,
    });
}
