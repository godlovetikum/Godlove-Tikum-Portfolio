/**
 * auth/handlers/login.ts
 *
 * Validates email + password against Supabase Auth.
 * Checks admin role before returning tokens.
 * Returns session and user profile.
 */

import { db }                from '../../_shared/db.ts';
import type { User, Session } from '../../_shared/types.ts';
import { successResponse }   from '../../_shared/response.ts';
import { Errors }            from '../../_shared/errors.ts';
import { validate }          from '../../_shared/validators.ts';


/**
 * Validates email + password and checks admin role before returning tokens.
 */
export async function login(req: Request): Promise<Response> {
    const body: Record<string, unknown> = await validate.parseReqBody(req);

    const email      = await validate.email(body.email);
    const password   = String(body.password ?? '');
    const ip_address = validate.ipAddress(body.ipAddress);
    const user_agent = String(body.userAgent ?? '').trim();

    if (!email)    throw Errors.validation.missingField('email');
    if (!password) throw Errors.validation.missingField('password');

    const user: User = await db.auth.validatePassword({ email, password });
    if (user?.role !== 'admin' || user?.status !== 'active') throw Errors.auth.forbidden();

    const newToken   = createSessionToken();
    const expires_at = getSessionExpiry();

    const session: Session = await db.auth.upsertSession({
        user_id: user.id, token: newToken, expires_at, ip_address: ip_address ?? '', user_agent,
    });

    return successResponse({
        message: 'Login successful',
        user,
        session,
    });
}


function createSessionToken(): string {
    const part1 = `eyJ${crypto.randomUUID() + crypto.randomUUID()}`;
    const part2 = `eyJ${crypto.randomUUID() + crypto.randomUUID()}`;
    return `${part1}.${part2}`.replace(/-/g, '');
}

function getSessionExpiry(): string {
    const ms = 60 * 60 * 24 * 7 * 1000;
    return new Date(Date.now() + ms).toISOString();
}
