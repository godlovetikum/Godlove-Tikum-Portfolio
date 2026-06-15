/**
 * email/providers/service.ts
 *
 * Flexible email service abstraction with outbound email tracking.
 *
 * IEmailTransport — interface that any transport must implement.
 * GasTransport    — implementation backed by the deployed GAS web app.
 * EmailService    — thin wrapper that delegates to the configured transport
 *                   and writes to outbound_emails before and after each send.
 *
 * To swap email providers in future:
 *   1. Implement IEmailTransport with the new transport class in email/providers/[provider_name].ts
 *   2. Import and pass it to EmailService._createService()
 *   3. Swap the EMAIL_SERVICE_PROVIDER env var with the provider name
 */

import type {
    EmailPayload,
    EmailResult,
    IEmailTransport,
} from '../../_shared/types.ts';
import { Errors, AppError } from '../../_shared/errors.ts';
import { db }               from '../../_shared/db.ts';
import { GasTransport }     from '../providers/google_App_Script.ts';


// ── EmailService ──────────────────────────────────────────────────────────────

export class EmailService {
    private readonly transport: IEmailTransport;

    constructor() {
        this.transport = this._createService();
    }

    /**
     * Internal helper for initializing the transport layer.
     * Reads the EMAIL_SERVICE_PROVIDER environment variable.
     * Returns the transport instance synchronously — not async.
     */
    private _createService(): IEmailTransport {
        const provider = Deno.env.get('EMAIL_SERVICE_PROVIDER') ?? '';
        if (!provider) {
            console.error('[email] EMAIL_SERVICE_PROVIDER env is not set');
            throw Errors.server.unexpected();
        }
        switch (provider) {
            case 'GAS': return new GasTransport();
            default:    throw Errors.server.unexpected();
        }
    }

    /**
     * Sends one email via the configured transport.
     * Writes an outbound_emails tracking record before and after each attempt.
     * Propagates AppError thrown by the transport.
     */
    async send(payload: EmailPayload): Promise<EmailResult> {
        let outbound_id: string | undefined = payload.outbound_id ?? undefined;

        // Retry requests carry outbound_id — skip creating a duplicate row
        if (!outbound_id) {
            try {
                const row = await db.outbound.insert({
                    email_type: payload.email_type,
                    recipient:  payload.recipient,
                    subject:    payload.subject,
                    html_body:  payload.html_body ?? null,
                    text_body:  payload.text_body ?? null,
                    caller:     payload.caller,
                    contact_id: payload.contact_id ?? null,
                    provider:   this.transport.name,
                });
                outbound_id = row.id;
            } catch (trackErr) {
                console.error('[EmailService] Could not create outbound_emails record:', trackErr);
            }
        }

        try {
            const result = await this.transport.send(payload);
            const status = result.success ? 'sent' : 'failed';
            const errorMsg = result.success ? null : (result.error ?? null);

            if (outbound_id) {
                await db.outbound.updateStatus({
                    id:            outbound_id,
                    status,
                    error_message: errorMsg,
                });
            }

            return result;
        } catch (sendErr) {
            if (outbound_id) {
                const message = (sendErr instanceof Error || sendErr instanceof AppError)
                    ? sendErr.message
                    : 'Unknown error.';

                await db.outbound.updateStatus({
                    id:            outbound_id,
                    status:        'failed',
                    error_message: message,
                });
            }
            throw sendErr;
        }
    }
}


// ── Factory helper ────────────────────────────────────────────────────────────

export const createEmailService = (): EmailService => new EmailService();
