/**
 * email/handlers/trigger.ts
 *
 * Handles the DB webhook POST from Supabase on contacts INSERT.
 *
 * Flow:
 *   1. Validates the webhook payload via validate.triggerPayload().
 *   2. Fetches both email templates (notification + acknowledgement).
 *   3. Dynamically extracts which brand_config keys the templates need.
 *   4. Fetches those config keys from brand_config (throws if any are missing).
 *   5. Sends the notification email to the admin.
 *   6. Marks the contact as notified in the DB.
 *   7. Sends the acknowledgement email to the visitor.
 *   8. Marks the contact as acknowledged in the DB.
 *   9. Both sends are attempted independently — one failure does not block the other.
 *  10. outbound_emails rows are written before and after each send (in emailService).
 */

import { successResponse }    from '../../_shared/response.ts';
import { validate }           from '../../_shared/validators.ts';
import { db }                 from '../../_shared/db.ts';
import { createEmailService } from '../providers/service.ts';
import {
    extractConfigKeys,
    buildTemplateData,
    replacePlaceholders,
} from '../helpers/templates.ts';



export async function sendByAlertTrigger(req: Request): Promise<Response> {
    const body   = await validate.parseReqBody(req);
    const record = await validate.triggerPayload(body);

    // ── Fetch templates first, then determine config keys dynamically ──────────

    const templates = await db.templates.getBoth(record.category);

    // Collect all template strings that may contain {{placeholders}}
    const templateStrings = [
        templates.notification.subject,
        templates.notification.html_body,
        templates.notification.text_body ?? '',
        templates.acknowledgement.subject,
        templates.acknowledgement.html_body,
        templates.acknowledgement.text_body ?? '',
    ];

    // Only fetch the brand_config keys that are actually referenced in the templates.
    // db.config.get() throws Errors.config.missing(key) for any key absent from the DB.
    const configKeys = extractConfigKeys(templateStrings);
    const configRows = await db.config.get(configKeys);

    const templateData = buildTemplateData(record, configRows);
    const emailService = createEmailService();

    // Convenience: look up a single config value from the fetched rows
    const configValue = (key: string): string =>
        configRows.find(r => r.key === key)?.value ?? '';

    const results = {
        notification:    { success: false, error: null as string | null },
        acknowledgement: { success: false, error: null as string | null },
    };

    // ── Notification (to admin) ───────────────────────────────────────────────

    try {
        const notifResult = await emailService.send({
            caller:      'trigger',
            email_type:  'notification',
            recipient:   configValue('sender_email'),
            subject:     replacePlaceholders(templates.notification.subject,   templateData, false),
            html_body:   replacePlaceholders(templates.notification.html_body, templateData),
            text_body:   templates.notification.text_body
                             ? replacePlaceholders(templates.notification.text_body, templateData, false)
                             : undefined,
            sender_name: configValue('sender_name'),
            reply_to:    configValue('sender_email'),
            contact_id:  record.id,
        });

        results.notification = { success: notifResult.success, error: notifResult.error ?? null };

        if (notifResult.success) { await db.contacts.markNotified(record.id); }
        else                     { await db.contacts.markNotifyFailed(record.id); }

    } catch (err: unknown) {
        results.notification.error = err instanceof Error ? err.message : 'Unknown error.';
        await db.contacts.markNotifyFailed(record.id);
    }

    // ── Acknowledgement (to visitor) ──────────────────────────────────────────

    try {
        const ackResult = await emailService.send({
            caller:      'trigger',
            email_type:  'acknowledgement',
            recipient:   record.email,
            subject:     replacePlaceholders(templates.acknowledgement.subject,   templateData, false),
            html_body:   replacePlaceholders(templates.acknowledgement.html_body, templateData),
            text_body:   templates.acknowledgement.text_body
                             ? replacePlaceholders(templates.acknowledgement.text_body, templateData, false)
                             : undefined,
            sender_name: configValue('sender_name'),
            reply_to:    configValue('sender_email'),
            contact_id:  record.id,
        });

        results.acknowledgement = { success: ackResult.success, error: ackResult.error ?? null };

        if (ackResult.success) { await db.contacts.markAcknowledged(record.id); }
        else                   { await db.contacts.markAckFailed(record.id); }

    } catch (err: unknown) {
        results.acknowledgement.error = err instanceof Error ? err.message : 'Unknown error.';
        await db.contacts.markAckFailed(record.id);
    }

    const allOk = results.notification.success && results.acknowledgement.success;

    return successResponse({
        message:         allOk ? 'Both emails sent.' : 'Processing complete — check individual results.',
        contact_id:      record.id,
        notification:    results.notification,
        acknowledgement: results.acknowledgement,
    });
}
