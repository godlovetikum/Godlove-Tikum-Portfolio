/**
 * _shared/validators.ts
 *
 * Validators — nested static class owning all validation and sanitisation.
 * Every method either returns the validated/sanitised value or throws an AppError.
 * No validation logic lives anywhere else in the codebase.
 *
 * Structure:
 *   Validators.[field]    — validates a single field and returns its valid value (e.g validate.email(body.email) )
 *   Validators.[domain]   — validate full payload for a single request (e.g validate.newContact(body) )
 */

import { Errors, AppError } from './errors.ts';
import type {
    // Analytics
    VisitorRow, ClickRow, ClickEvent, AnalyticsFilters, AnalyticsTable, AnalyticsView, DeviceType,

    // contacts
    ContactStatus, ContactCategory, ContactFilters, NewContactPayload, ContactUpdateFields,

    // Auth
    User, Session, AccountStatus, UserRole,

    // email
    WebhookTriggerPayload, ManualEmailPayload, TemplateFilters,

} from './types.ts';



// ── Valid sets ────────────────────────────────────────────────────────────────

const CONTACT_CATEGORIES = new Set<ContactCategory>([
    'new-website', 'fix-website', 'book-call', 'project-question', 'other',
]);

const CONTACT_STATUSES = new Set<ContactStatus>(['new', 'read', 'replied', 'follow_up']);

const DEVICE_TYPES = new Set<DeviceType>(['mobile', 'desktop']);

const CLICK_EVENTS = new Set<string>(["brand", "navigation", "cta", "images", "contact", "project", "form", "footer", "social"]);

const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]{1,}\.[^\s@]{2,}$/;
const REPLY_TYPES = new Set(['notification', 'acknowledgement', 'both', 'reply', 'follow_up']);

const INVISIBLE_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F\uFEFF\uFFF9-\uFFFB]/g;


// Blocks known throwaway email services before any execution runs.
// The MX check catches anything not on this list.
const BLOCKED_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net',
    'guerrillamail.org', 'guerrillamailblock.com', 'grr.la',
    'guerrillamail.de', 'guerrillamail.info', 'spam4.me',
    'trashmail.com', 'trashmail.me', 'trashmail.net',
    'throwam.com', 'throwaway.email', 'dispostable.com',
    'maildrop.cc', 'yopmail.com', 'yopmail.fr', 'cool.fr.nf',
    'jetable.fr.nf', 'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj',
    'speed.1s.fr', 'courriel.fr.nf', 'moncourrier.fr.nf',
    'monemail.fr.nf', 'monmail.fr.nf', 'sharklasers.com',
    'guerrillamail.biz', 'spam.la', 'fakeinbox.com', 'mailnull.com',
    'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
    'mailnesia.com', 'tempmail.com', 'temp-mail.org', 'tempr.email',
    'discard.email', 'mailtemp.info', 'tempinbox.com',
    'getairmail.com', 'filzmail.com', '10minutemail.com',
    '10minutemail.net', '10minutemail.org', 'minutemail.com',
    'tempemail.net', 'spamherelots.com', 'binkmail.com',
    'bobmail.info', 'chammy.info', 'devnullmail.com', 'tradermail.info',
]);

// ── Validators ────────────────────────────────────────────────────────────────

class Validators {
    constructor() {}

    getParam(url: URL, key: string, required = false): string | null {
        const raw   = url.searchParams.get(key);
        const value = raw != null ? raw.trim() : null;
        if (required && !value) throw Errors.validation.missingField(key);
        return value || null;
    }

    getAction(url: URL, allowed: string[]): string {
        const action = url.searchParams.get('action');
        if (!action) throw Errors.validation.missingField('action');
        const allowedSet = new Set(allowed);
        if (!allowedSet.has(action)) {
            throw Errors.validation.invalidInput('action', `Use one of these: ${allowed.join(', ')}`);
        }
        return action;
    }

    async parseReqBody(req: Request): Promise<Record<string, unknown>> {
        let body: Record<string, unknown> | undefined;
        try { body = await req.json(); }
        catch { throw Errors.validation.missingField('request body'); }
        return body;
    }

    sanitiseText(value: unknown): string {
        return String(value ?? '')
            .replace(/<[^>]*>/g, '')
            .replace(INVISIBLE_RE, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/ {4,}/g, ' ')
            .trim();
    }

    uuid(value: unknown, field: string): string {
        const str = String(value ?? '').trim();
        if (!str) throw Errors.validation.missingField(field);
        if (!UUID_RE.test(str)) {
            throw Errors.validation.invalidInput(field, 'Must be a valid UUID.');
        }
        return str;
    }

    nonEmptyString(value: unknown, label: string): string {
        const str = String(value ?? '').trim();
        if (!str) throw Errors.validation.missingField(label);
        return str;
    }

    name(value: unknown, minLength: number, maxLength: number): string {
        const raw = this.sanitiseText(String(value ?? ''));
        if (raw.length < minLength || raw.length > maxLength) {
            throw Errors.validation.invalidInput('name', `Name must be between ${minLength} and ${maxLength} characters.`);
        }
        return raw;
    }

    async emailDomain(email: string): Promise<void> {
        const domain = email.split('@')[1];
        if (!domain) throw Errors.validation.invalidEmail();

        try {
            const records = await Deno.resolveDns(domain, 'MX');
            if (!records || records.length === 0) {
                throw Errors.email.invalidEmailDomain();
            }
        } catch (err: unknown) {
            if (err instanceof AppError) throw err;

            const code = (err as { code?: string }).code ?? '';

            if (code === 'ENOTFOUND') {
                throw Errors.email.invalidEmailDomain(
                    'That email domain does not exist. Please check for typos and try again.'
                );
            }
            if (code === 'ENODATA') {
                throw Errors.email.invalidEmailDomain();
            }

            console.warn('[Validators.emailDomain] DNS inconclusive for domain:', domain, '| code:', code, '— allowing.');
        }
    }

    async email(value: unknown): Promise<string> {
        const raw = this.sanitiseText(String(value ?? '')).toLowerCase().slice(0, 100);
        if (!raw) throw Errors.validation.missingField('email');
        if (!EMAIL_RE.test(raw)) throw Errors.validation.invalidEmail();
        if (BLOCKED_DOMAINS.has(raw.split('@')[1])) throw Errors.validation.invalidEmail();
        await this.emailDomain(raw);
        return raw;
    }

    message(value: unknown): string {
        const sanitised = this.sanitiseText(String(value ?? ''));
        if (sanitised.length < 20)   throw Errors.validation.messageTooShort();
        if (sanitised.length > 2000) throw Errors.validation.messageTooLong();
        return sanitised;
    }

    category(value: unknown): ContactCategory {
        if (!value || String(value).trim() === '') return 'other';
        const cat = String(value).trim().toLowerCase() as ContactCategory;
        if (!CONTACT_CATEGORIES.has(cat)) throw Errors.validation.invalidCategory();
        return cat;
    }

    page(value: unknown): string | null {
        if (!value) return null;
        const sanitised = this.sanitiseText(String(value)).slice(0, 500);
        return sanitised || null;
    }

    siteKey(value: unknown): string | null {
        if (!value) return null;
        const sanitised = this.sanitiseText(String(value)).slice(0, 50);
        return sanitised || null;
    }

    sessionId(value: unknown): string | null {
        if (!value) return null;
        const sanitised = this.sanitiseText(String(value)).slice(0, 64);
        return sanitised || null;
    }

    device(value: unknown): DeviceType {
        const str = String(value ?? '').trim().toLowerCase();
        if (!DEVICE_TYPES.has(str as DeviceType)) {
            throw Errors.validation.invalidInput('device', 'Must be "mobile" or "desktop".');
        }
        return str as DeviceType;
    }

    event(value: unknown): string {
        const str = String(value ?? '').trim().toLowerCase();
        if (!str) throw Errors.validation.missingField('event');
        if (!CLICK_EVENTS.has(str)) {
            throw Errors.validation.invalidInput(
                'event',
                `Must be one of: ${[...CLICK_EVENTS].join(', ')}.`
            );
        }
        return str;
    }

    section(value: unknown): string {
        const str = this.sanitiseText(String(value ?? '')).slice(0, 30);
        if (!str) throw Errors.validation.missingField('section');
        return str;
    }

    target(value: unknown): string {
        const str = this.sanitiseText(String(value ?? '')).slice(0, 50);
        if (!str) throw Errors.validation.missingField('target');
        return str;
    }

    referrer(value: unknown): string | null {
        if (!value) return null;
        return this.sanitiseText(String(value)).slice(0, 100) || null;
    }

    ipAddress(value: unknown): string | null {
        if (!value) return null;
        const sanitised = this.sanitiseText(String(value)).slice(0, 45);
        return sanitised || null;
    }

    country(value: unknown): string | null {
        if (!value) return null;
        const sanitised = this.sanitiseText(String(value)).toUpperCase().slice(0, 2);
        return sanitised || null;
    }

    recipient(value: unknown): string {
        const str = this.sanitiseText(String(value ?? '')).toLowerCase().slice(0, 100);
        if (!str) throw Errors.validation.missingField('recipient');
        if (!EMAIL_RE.test(str)) {
            throw Errors.validation.invalidInput('recipient', 'Must be a valid email address.');
        }
        return str;
    }

    subject(value: unknown): string {
        const str = this.sanitiseText(String(value ?? '')).slice(0, 200);
        if (!str) throw Errors.validation.missingField('subject');
        return str;
    }


    // ========== Analytics ===============

    newVisitorPayload(body: Record<string, unknown>): VisitorRow {
        const sessionId = this.sessionId(body.sessionId);
        if (!sessionId) throw Errors.validation.missingField('session_id');
        return {
            session_id:  sessionId,
            device:      this.device(body.device),
            referrer:    this.referrer(body.referrer),
            site_key:    this.siteKey(body.siteKey),
            ip_address:  this.ipAddress(body.ipAddress),
            country:     this.country(body.country),
            last_seen_at: null,
        };
    }

    newClickPayload(body: Record<string, unknown>): ClickRow {
        const sessionId = this.sessionId(body.sessionId);
        if (!sessionId) throw Errors.validation.missingField('session_id');
        return {
            session_id: sessionId,
            event:      this.event(body.event),
            section:    this.section(body.section),
            target:     this.target(body.target),
            external:   Boolean(body.external),
            page:       this.page(body.page),
            site_key:   this.siteKey(body.siteKey),
            ip_address: this.ipAddress(body.ipAddress),
            country:    this.country(body.country),
        };
    }

    analyticsGetParams(url: URL): AnalyticsFilters {
        const rawPage  = Number(url.searchParams.get('page')  ?? 1);
        const rawLimit = Number(url.searchParams.get('limit') ?? 20);

        const page  = Math.max(1,     Math.min(10_000, isNaN(rawPage)  ? 1  : Math.floor(rawPage)));
        const limit = Math.max(1,     Math.min(200,    isNaN(rawLimit) ? 20 : Math.floor(rawLimit)));

        return {
            view:  (url.searchParams.get('view')  ?? 'summary') as AnalyticsView,
            table: (url.searchParams.get('table') ?? '')         as AnalyticsTable,
            from:  url.searchParams.get('from')   ?? undefined,
            to:    url.searchParams.get('to')     ?? undefined,
            page,
            limit,
        };
    }


    // ========== Contacts ===============

    async newContactPayload(body: Record<string, unknown>): Promise<NewContactPayload> {
        return {
            name:       this.name(body.name, 2, 50),
            email:      await this.email(body.email),
            message:    this.message(body.message),
            category:   this.category(body.category),
            page:       this.page(body.page),
            site_key:   this.siteKey(body.siteKey),
            session_id: this.sessionId(body.sessionId),
            ip_address: this.ipAddress(body.ipAddress),
            country:    this.country(body.country),
        };
    }

    contactUpdateFields(body: Record<string, unknown>): ContactUpdateFields {
        const fields: ContactUpdateFields = {};

        if (body.status !== undefined) {
            const status = String(body.status).trim().toLowerCase();
            if (!CONTACT_STATUSES.has(status as ContactStatus)) {
                throw Errors.validation.invalidInput(
                    'status',
                    `Must be one of: ${[...CONTACT_STATUSES].join(', ')}.`
                );
            }
            fields['status'] = status as ContactStatus;
        }

        if (body.read_at !== undefined) {
            fields['read_at'] = body.read_at ? String(body.read_at) : null;
        }

        if (body.replied_at !== undefined) {
            fields['replied_at'] = body.replied_at ? String(body.replied_at) : null;
        }

        if (body.follow_up_at !== undefined) {
            fields['follow_up_at'] = body.follow_up_at ? String(body.follow_up_at) : null;
        }

        return fields;
    }

    contactGetFilters(url: URL): ContactFilters {
        const status = url.searchParams.get('status') ?? undefined;
        if (status !== undefined && !CONTACT_STATUSES.has(status as ContactStatus)) {
            throw Errors.validation.invalidInput(
                'status',
                `Must be one of: ${[...CONTACT_STATUSES].join(', ')}.`
            );
        }
        const from = url.searchParams.get('from') ?? undefined;
        const to   = url.searchParams.get('to')   ?? undefined;
        if (from !== undefined && isNaN(Date.parse(from))) {
            throw Errors.validation.invalidInput('from', 'Must be a valid ISO date string.');
        }
        if (to !== undefined && isNaN(Date.parse(to))) {
            throw Errors.validation.invalidInput('to', 'Must be a valid ISO date string.');
        }
        return {
            status:   status as ContactStatus | undefined,
            category: url.searchParams.get('category') ?? undefined,
            from,
            to,
            page:     Number(url.searchParams.get('page')  ?? 1),
            limit:    Number(url.searchParams.get('limit') ?? 20),
        };
    }


    // ========== Email ===============

    async triggerPayload(body: Record<string, unknown>): Promise<WebhookTriggerPayload> {
        const record = (body.record ?? body) as Record<string, unknown>;

        if (!record.id)    throw Errors.validation.missingField('record.id');
        if (!record.email) throw Errors.validation.missingField('record.email');
        if (!record.name)  throw Errors.validation.missingField('record.name');

        return {
            id:         this.uuid(record.id, 'id'),
            name:       this.name(record.name, 2, 50),
            email:      await this.email(record.email),
            message:    this.message(record.message),
            category:   this.category(record.category ?? 'other'),
            page:       this.page(record.page),
            session_id: this.sessionId(record.session_id) ?? '',
            country:    this.country(record.country),
            created_at: record.created_at ? String(record.created_at) : new Date().toISOString(),
        };
    }

    manualEmailPayload(body: Record<string, unknown>): ManualEmailPayload {
        const raw_contact_id = body.contact_id;
        const raw_type       = String(body.email_type ?? '').trim();
        const is_standalone  = !raw_contact_id;

        if (is_standalone) {
            if (raw_type !== 'standalone') {
                throw Errors.validation.invalidInput(
                    'email type',
                    'When no contact ID is provided, the email type must be "standalone".'
                );
            }

            const recipient  = this.recipient(body.recipient);
            const subject    = this.subject(body.subject);
            const html_body  = body.html_body ? String(body.html_body).slice(0, 200_000) : undefined;
            const text_body  = body.text_body ? this.sanitiseText(String(body.text_body)).slice(0, 50_000) : undefined;

            if (!html_body && !text_body) throw Errors.validation.missingEmailBody();

            return { is_standalone: true, is_custom: true, email_type: 'standalone', recipient, subject, html_body, text_body };
        }

        const contact_id = this.uuid(raw_contact_id, 'contact ID');
        if (!raw_type) throw Errors.validation.contactReplyRequiresType();
        if (!REPLY_TYPES.has(raw_type)) throw Errors.validation.invalidEmailType();

        const has_body = !!(body.html_body || body.text_body);

        if (has_body) {
            const subject   = this.subject(body.subject);
            const html_body = body.html_body
                ? String(body.html_body).slice(0, 200_000)
                : undefined;
            const text_body = body.text_body
                ? this.sanitiseText(String(body.text_body)).slice(0, 2_000)
                : undefined;
            if (!html_body && !text_body) throw Errors.validation.missingEmailBody();
            return { is_standalone: false, is_custom: true, email_type: raw_type as any, contact_id, subject, html_body, text_body };
        }

        return { is_standalone: false, is_custom: false, email_type: raw_type as any, contact_id };
    }

    getTemplateFilters(url: URL): TemplateFilters {
        return {
            category: this.getParam(url, 'category') as any ?? null,
            type:     this.getParam(url, 'type')     as any ?? null,
        };
    }

    configGetFilters(url: URL): { keys: string[]; last_updated: string | null } {
        return {
            keys:         this.getParam(url, 'keys', false)?.split(',')    ?? [],
            last_updated: this.getParam(url, 'last_updated', false)        ?? null,
        };
    }
}

export const validate = new Validators();
