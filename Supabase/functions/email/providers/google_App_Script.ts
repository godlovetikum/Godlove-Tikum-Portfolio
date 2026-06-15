/**
 * email/providers/google_App_Script.ts
 *
 * Google Apps Script (GAS) email transport.
 * Dispatches all sends via the deployed GAS web app endpoint.
 */

import type { EmailPayload, EmailResult, IEmailTransport } from '../../_shared/types.ts';
import { Errors } from '../../_shared/errors.ts';


export class GasTransport implements IEmailTransport {
    readonly name: string;
    private url:    string;
    private apiKey: string;

    constructor() {
        this.name   = 'GAS';
        this.url    = '';
        this.apiKey = '';
        this._init();
    }

    async send(payload: EmailPayload): Promise<EmailResult> {
        let response: Response;

        try {
            response = await fetch(this.url, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ ...payload, api_key: this.apiKey }),
            });
        } catch (networkErr) {
            console.error('[GasTransport] Network error:', networkErr);
            throw this._errorForType(payload.email_type);
        }

        if (!response.ok) {
            const detail = await response.text().catch(() => 'no body');
            console.error('[GasTransport] Non-OK response:', response.status, detail);
            throw this._errorForType(payload.email_type);
        }

        const data = await response.json().catch(() => ({
            success: false,
            data:    null,
            error:   { code: 'unknown', message: 'Unexpected response body' },
        }));

        if (!data.success) {
            console.error('[GasTransport] GAS returned success:false', data);
            return {
                success:    false,
                type:       payload.email_type,
                contact_id: payload.contact_id ?? undefined,
                error:      data?.error?.message ?? 'An unknown error occurred.',
            };
        }

        return {
            success:    true,
            type:       payload.email_type,
            contact_id: payload.contact_id ?? undefined,
        };
    }

    private _errorForType(type: string): never {
        if (type === 'notification')    throw Errors.email.notificationFailed();
        if (type === 'acknowledgement') throw Errors.email.acknowledgementFailed();
        throw Errors.email.sendFailed(type);
    }

    private _getCredentials(): { apiKey: string; url: string } {
        const apiKey = Deno.env.get('GAS_API_KEY')   ?? '';
        const url    = Deno.env.get('GAS_EMAIL_URL') ?? '';
        if (!apiKey) {
            console.error('[GasTransport] GAS_API_KEY not set');
            throw Errors.server.unexpected();
        }
        if (!url) {
            console.error('[GasTransport] GAS_EMAIL_URL not set');
            throw Errors.server.unexpected();
        }
        return { apiKey, url };
    }

    private _init(): void {
        const { apiKey, url } = this._getCredentials();
        if (!url    || url.startsWith('REPLACE_WITH_')    || url.startsWith('YOUR_')) {
            throw Errors.config.invalid('gas_email_url');
        }
        if (!apiKey || apiKey.startsWith('REPLACE_WITH_') || apiKey.startsWith('YOUR_')) {
            throw Errors.config.invalid('gas_api_key');
        }
        this.url    = url;
        this.apiKey = apiKey;
    }
}
