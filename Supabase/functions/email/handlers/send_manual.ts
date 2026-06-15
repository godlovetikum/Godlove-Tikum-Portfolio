/**
 * email/handlers/send_manual.ts
 *
 * Handles manual email sends initiated from the admin dashboard.
 *
 * Send types:
 *
 *   standalone   — free-form, no contact_id. Requires: recipient, subject, html_body, text_body.
 *   notification — sends to admin (config.sender_email).
 *   acknowledgement — sends to visitor (contact.email).
 *   both         — sends notification + acknowledgement.
 *   reply        — sends to visitor (contact.email) using reply template or custom content.
 *   follow_up    — sends to visitor (contact.email) using follow_up template or custom content.
 *
 * Content resolution (for contact reply types):
 *   is_custom = true  → uses subject / html_body / text_body from request body directly.
 *   is_custom = false → loads the stored email template for the contact's category + type.
 *
 * Dynamic config key resolution:
 *   When loading stored templates, the template HTML is scanned for {{placeholder}} tokens
 *   to determine which brand_config keys to fetch. No hardcoded CONFIG_KEYS list is used.
 */

import { successResponse }    from '../../_shared/response.ts';
import { validate }           from '../../_shared/validators.ts';
import { db }                 from '../../_shared/db.ts';
import { createEmailService } from '../providers/service.ts';
import { Errors }             from '../../_shared/errors.ts';
import {
    extractConfigKeys,
    buildTemplateData,
    replacePlaceholders,
} from '../helpers/templates.ts';
import type {
    EmailSendType,
    WebhookTriggerPayload,
    BrandConfig,
} from '../../_shared/types.ts';


export async function sendManualEmail(req: Request): Promise<Response> {
    const body: Record<string, unknown> = await validate.parseReqBody(req);
    const validated    = await validate.manualEmailPayload(body);
    const emailService = createEmailService();

    // ── Standalone ────────────────────────────────────────────────────────────

    if (validated.is_standalone) {
        const configRows = await db.config.get(['sender_name', 'sender_email']);
        const configMap  = toConfigMap(configRows);

        const result = await emailService.send({
            caller:      'manual',
            email_type:  'standalone',
            recipient:   validated.recipient!,
            subject:     validated.subject!,
            html_body:   validated.html_body,
            text_body:   validated.text_body,
            sender_name: configMap['sender_name'] ?? '',
            reply_to:    configMap['sender_email'] ?? '',
        });

        return successResponse({
            message:    'Standalone email sent.',
            email_type: 'standalone',
            recipient:  validated.recipient,
            result,
        });
    }

    // ── Contact reply (has contact_id) ────────────────────────────────────────

    const contactId = validated.contact_id!;
    const sendType  = validated.email_type as EmailSendType;
    const contact   = await db.contacts.getById(contactId);

    // Build a WebhookTriggerPayload-compatible record from the contact row
    const record: WebhookTriggerPayload = {
        id:         contact.id,
        name:       contact.name,
        email:      contact.email,
        message:    contact.message,
        category:   contact.category ?? 'other',
        page:       contact.page ?? null,
        session_id: contact.session_id ?? '',
        country:    contact.country ?? null,
        created_at: contact.created_at ?? new Date().toISOString(),
    };

    // ── Helper: resolve email content ─────────────────────────────────────────

    async function resolveContent(
        type: string
    ): Promise<{ subject: string; html: string; text: string; configRows: BrandConfig[] }> {
        if (validated.is_custom) {
            // Custom content: still fetch sender keys for the send call
            const configRows = await db.config.get(['sender_name', 'sender_email']);
            return {
                subject: validated.subject   ?? '',
                html:    validated.html_body ?? '',
                text:    validated.text_body ?? '',
                configRows,
            };
        }

        // Load stored template; derive config keys from the template content
        if (type === 'notification' || type === 'acknowledgement') {
            const both = await db.templates.getBoth(record.category);
            const tmpl = type === 'notification' ? both.notification : both.acknowledgement;

            const configKeys = extractConfigKeys([tmpl.subject, tmpl.html_body, tmpl.text_body ?? '']);
            const configRows = await db.config.get(configKeys);
            const td         = buildTemplateData(record, configRows);

            return {
                subject:    replacePlaceholders(tmpl.subject,   td, false),
                html:       replacePlaceholders(tmpl.html_body, td),
                text:       tmpl.text_body ? replacePlaceholders(tmpl.text_body, td, false) : '',
                configRows,
            };
        }

        // reply / follow_up — load single template by category + type
        const tmpl = await db.templates.getOne({
            category: record.category,
            type:     type as 'reply' | 'follow_up',
        });

        const configKeys = extractConfigKeys([tmpl.subject, tmpl.html_body, tmpl.text_body ?? '']);
        const configRows = await db.config.get(configKeys);
        const td         = buildTemplateData(record, configRows);

        return {
            subject:    replacePlaceholders(tmpl.subject,   td, false),
            html:       replacePlaceholders(tmpl.html_body, td),
            text:       tmpl.text_body ? replacePlaceholders(tmpl.text_body, td, false) : '',
            configRows,
        };
    }

    // ── Route by send type ────────────────────────────────────────────────────

    const results: Record<string, { success: boolean; error: string | null } | null> = {
        notification:    null,
        acknowledgement: null,
        reply:           null,
        follow_up:       null,
    };

    async function sendOne(type: string, to: string): Promise<void> {
        try {
            const { subject, html, text, configRows } = await resolveContent(type);
            const configMap = toConfigMap(configRows);

            await emailService.send({
                caller:      'manual',
                email_type:  type as EmailSendType,
                recipient:   to,
                subject,
                html_body:   html  || undefined,
                text_body:   text  || undefined,
                sender_name: configMap['sender_name'] ?? '',
                reply_to:    configMap['sender_email'] ?? '',
                contact_id:  contactId,
            });
            results[type] = { success: true, error: null };
        } catch (err) {
            results[type] = {
                success: false,
                error:   err instanceof Error ? err.message : 'Unknown error.',
            };
        }
    }

    // Config rows for the sender address (needed for notification recipient)
    const baseConfigRows = await db.config.get(['sender_name', 'sender_email']);
    const baseConfigMap  = toConfigMap(baseConfigRows);

    switch (sendType) {
        case 'both':
            await sendOne('notification', baseConfigMap['sender_email'] ?? '');
            await db.contacts[results.notification?.success ? 'markNotified' : 'markNotifyFailed'](contactId);
            await sendOne('acknowledgement', contact.email);
            await db.contacts[results.acknowledgement?.success ? 'markAcknowledged' : 'markAckFailed'](contactId);
            break;

        case 'notification':
            await sendOne('notification', baseConfigMap['sender_email'] ?? '');
            await db.contacts[results.notification?.success ? 'markNotified' : 'markNotifyFailed'](contactId);
            break;

        case 'acknowledgement':
            await sendOne('acknowledgement', contact.email);
            await db.contacts[results.acknowledgement?.success ? 'markAcknowledged' : 'markAckFailed'](contactId);
            break;

        case 'reply':
        case 'follow_up':
            await sendOne(sendType, contact.email);
            break;

        default:
            throw Errors.validation.invalidEmailType();
    }

    return successResponse({
        message:    'Manual send complete.',
        contact_id: contactId,
        mode:       validated.is_custom ? 'custom' : 'template',
        results:    Object.fromEntries(Object.entries(results).filter(([, v]) => v !== null)),
    });
}


// ── Helpers ───────────────────────────────────────────────────────────────────

function toConfigMap(rows: BrandConfig[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (const row of rows) {
        map[row.key] = row.value;
    }
    return map;
}
