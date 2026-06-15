/**
 * auth/handlers/logout.ts
 *
 * 
 */
 
import { db } from '../../_shared/db.ts';
import { extractBearerToken } from '../../_shared/auth.ts'
import { successResponse } from '../../_shared/response.ts';



 /**
 * Invalidates the current Supabase session.
 * Reads the Bearer token from the Authorization header.
 * Non-throwing — always returns success so the client can clear local state.           
 */
export async function logout(req: Request): Promise<Response> {
    const token = extractBearerToken(req);

    if (token) {
        try {
            await db.auth.invalidateSession(token)
        } catch (err) {
            console.warn('[auth.logout] Sign-out error (ignored):', err);
        }
    }

    return successResponse({ message: 'Logged out successfully.'});
}