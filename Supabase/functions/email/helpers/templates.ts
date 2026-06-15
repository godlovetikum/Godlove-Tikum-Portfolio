/**
 * email/helpers/templates.ts
 *
 * Template helpers used only by the email function.
 * Handles fetching templates from DB and resolving all {{placeholders}}.
 *
 * Key design: config keys are determined DYNAMICALLY from the template content.
 * Instead of a fixed array, the template HTML is scanned for {{token}} placeholders,
 * contact-data tokens are excluded, and only the remaining keys are fetched from
 * brand_config. This means adding a new placeholder to a template is sufficient —
 * the matching brand_config row just needs to exist.
 *
 * If a placeholder is found in a template but the corresponding brand_config key
 * is missing from the database, db.config.get() throws Errors.config.missing(key).
 */

import { db }    from '../../_shared/db.ts';
import { Errors } from '../../_shared/errors.ts';
import type {
    TemplateData,
    BothTemplates,
    BrandConfig,
    WebhookTriggerPayload,
} from '../../_shared/types.ts';


// ── Category display labels ───────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
    'new-website':      'New website for my business',
    'fix-website':      "My website isn't getting me customers",
    'book-call':        'Book a call',
    'project-question': 'Question about a project',
    'other':            'General enquiry',
};


// ── Contact data keys ─────────────────────────────────────────────────────────
// These are resolved from the contact record, NOT from brand_config.
// Any placeholder NOT in this set will be fetched from brand_config.

const CONTACT_DATA_KEYS = new Set<string>([
    'name', 'first_name', 'category_label',
    'email', 'message', 'received_at', 'page',
]);


// ── extractPlaceholders ───────────────────────────────────────────────────────

/**
 * Returns all unique {{token}} keys found in a template string.
 */
function extractPlaceholders(template: string): string[] {
    const found = new Set<string>();
    for (const match of template.matchAll(/\{\{(\w+)\}\}/g)) {
        found.add(match[1]);
    }
    return [...found];
}


// ── extractConfigKeys ─────────────────────────────────────────────────────────

/**
 * Given one or more template strings, returns the unique set of placeholder
 * keys that must be fetched from brand_config (i.e. not contact-data keys).
 *
 * @param templates One or more raw template strings (subject, html_body, text_body…)
 */
export function extractConfigKeys(templates: string[]): string[] {
    const configKeys = new Set<string>();
    for (const tmpl of templates) {
        for (const key of extractPlaceholders(tmpl)) {
            if (!CONTACT_DATA_KEYS.has(key)) {
                configKeys.add(key);
            }
        }
    }
    return [...configKeys];
}


// ── buildTemplateData ─────────────────────────────────────────────────────────

/**
 * Builds the TemplateData map from a contact record and fetched brand config rows.
 * Every {{placeholder}} token in the stored HTML resolves from this map.
 *
 * @param record      Validated contact record from the DB webhook.
 * @param brandConfig Brand config rows fetched dynamically from brand_config table.
 */
export function buildTemplateData(
    record:      WebhookTriggerPayload,
    brandConfig: BrandConfig[],
): TemplateData {
    const receivedAt = new Date(record.created_at).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        hour:    '2-digit', minute: '2-digit',
    });

    // Build a flat key→value map from the config rows
    const configMap: Record<string, string> = {};
    for (const row of brandConfig) {
        configMap[row.key] = row.value;
    }

    return {
        // Contact data (always available from the record)
        name:           record.name,
        first_name:     record.name.split(' ')[0],
        category_label: CATEGORY_LABELS[record.category] ?? CATEGORY_LABELS['other'],
        email:          record.email,
        message:        record.message,
        received_at:    receivedAt,
        page:           record.page ?? '',

        // Dynamic brand config keys (fetched from DB based on template placeholders)
        ...configMap,
    };
}


// ── replacePlaceholders ───────────────────────────────────────────────────────

/**
 * Replaces all {{token}} occurrences in a template string.
 * Throws Errors.config.missing(key) if a placeholder cannot be resolved —
 * this ensures missing brand_config entries are surfaced as explicit errors.
 *
 * @param template   The raw html_body, text_body, or subject string.
 * @param data       Resolved TemplateData map.
 * @param htmlEscape When true (default), values are HTML-escaped before insertion.
 *                   Pass false for plain-text fields (text_body, subject) where
 *                   HTML entities would corrupt the output.
 */
export function replacePlaceholders(template: string, data: TemplateData, htmlEscape = true): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
        if (!(key in data)) {
            throw Errors.config.missing(key);
        }
        const value = String(data[key]);
        return htmlEscape ? escapeHtml(value) : value;
    });
}


// ── escapeHtml ────────────────────────────────────────────────────────────────

/**
 * Escapes characters unsafe for HTML content.
 * Applied to every resolved value before insertion into the email body.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}
