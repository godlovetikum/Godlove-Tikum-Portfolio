/**
 * _shared/db.ts
 *
 * Database layer — all Supabase access goes through typed RPC calls defined
 * in the schema files (06_functions_contact.sql, 07_functions_analytics.sql,
 * 08_functions_email.sql, 09_functions_config.sql).
 *
 * No direct .from() table queries exist here. Every operation is a named,
 * typed Postgres function that runs with SECURITY DEFINER.
 *
 * Structure:
 *   db.contacts   — CRUD and flag updates for contact form submissions
 *   db.analytics  — visitor upsert, click insert, summary + trend queries
 *   db.templates  — email template reads and updates
 *   db.outbound   — outbound email tracking (insert, update status, list)
 *   db.config     — brand_config key-value reads
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Errors, AppError, PGErrorMap }  from './errors.ts';
import type {
    ContactRow,
    NewContactPayload,
    ContactFilters,
    ContactUpdateFields,
    StatusCounts,
    VisitorRow,
    ClickRow,
    AnalyticsFilters,
    EmailTemplate,
    BothTemplates,
    TemplateFilters,
    OutboundEmailRow,
    OutboundEmailFilters,
    BrandConfig,
    ContactCategory,
    EmailType,
    User, Session
} from './types.ts';


class Auth {
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    async getUser(id: string): Promise<User> {
        const { data, error } = await this.client.rpc('get_user', { p_user_id: id });
        if (error || !data) {
            if (error) {
                const pgError = PGErrorMap[error.message];
                if (pgError) throw pgError();
            }
            console.error('[db.auth.getUser] failed:', error);
            throw Errors.db.queryFailed();
        }
        return data[0] as User;
    }

    async validatePassword(p: { email: string; password: string }): Promise<User> {
        const { data, error } = await this.client.rpc('validate_password', {
            p_email: p.email, p_password: p.password,
        });

        if (error || !data) {
            if (error) {
                const pgError = PGErrorMap[error.message];
                if (pgError) throw pgError();
            }
            console.error('[db.auth.validatePassword] failed:', error);
            throw Errors.db.queryFailed();
        }
        return data[0] as User;
    }

    async upsertSession(p: {
        user_id: string; token: string; expires_at: string; ip_address: string; user_agent: string;
    }): Promise<Session> {
        const { data, error } = await this.client.rpc('upsert_session', {
            p_user_id:   p.user_id,
            p_token:     p.token,
            p_expires_at: p.expires_at,
            p_ip_address: p.ip_address,
            p_user_agent: p.user_agent,
        });

        if (error || !data) {
            if (error) {
                const pgError = PGErrorMap[error.message];
                if (pgError) throw pgError();
            }
            console.error('[db.auth.upsertSession] failed:', error);
            throw Errors.db.queryFailed();
        }
        return data[0] as Session;
    }

    async validateSession(token: string): Promise<Session> {
        const { data, error } = await this.client.rpc('validate_session', { p_token: token });
        if (error || !data) {
            if (error) {
                const pgError = PGErrorMap[error.message];
                if (pgError) throw pgError();
            }
            console.error('[db.auth.validateSession] failed:', error);
            throw Errors.db.queryFailed();
        }
        return data[0] as Session;
    }

    async invalidateSession(token: string): Promise<void> {
        const { error } = await this.client.rpc('invalidate_session', { p_token: token });
        if (error) {
            console.warn('[db.auth.invalidateSession] failed (ignored):', error);
        }
    }
}



class Contacts {
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    async insert(payload: NewContactPayload): Promise<ContactRow> {
        const { data, error } = await this.client.rpc('insert_contact', {
            p_name:       payload.name,
            p_email:      payload.email,
            p_message:    payload.message,
            p_category:   payload.category,
            p_page:       payload.page       ?? null,
            p_site_key:   payload.site_key   ?? null,
            p_session_id: payload.session_id ?? null,
            p_ip_address: payload.ip_address ?? null,
            p_country:    payload.country    ?? null,
        });

        if (error || !data) {
            console.error('[db.contacts.insert]', error);
            throw Errors.contact.insertFailed();
        }
        return data as ContactRow;
    }

    async getById(id: string): Promise<ContactRow> {
        const { data, error } = await this.client.rpc('get_contact', { p_id: id });

        if (error) {
            console.error('[db.contacts.getById]', error);
            throw Errors.db.queryFailed();
        }
        if (!data) throw Errors.contact.notFound();
        return data as ContactRow;
    }

    async list(filters: ContactFilters = {}): Promise<{ rows: ContactRow[]; total: number }> {
        const page  = Math.max(1,   filters.page  ?? 1);
        const limit = Math.min(100, filters.limit ?? 20);

        const { data, error } = await this.client.rpc('list_contacts', {
            p_status:   filters.status   ?? null,
            p_category: filters.category ?? null,
            p_from:     filters.from     ?? null,
            p_to:       filters.to       ?? null,
            p_page:     page,
            p_limit:    limit,
        });

        if (error) {
            console.error('[db.contacts.list]', error);
            throw Errors.db.queryFailed();
        }

        const result = data as { rows: ContactRow[]; total: number };
        return {
            rows:  result.rows  ?? [],
            total: result.total ?? 0,
        };
    }

    async update(p: { id: string; fields: ContactUpdateFields }): Promise<ContactRow> {
        const { data, error } = await this.client.rpc('update_contact', {
            p_id:           p.id,
            p_status:       p.fields.status       ?? null,
            p_read_at:      p.fields.read_at      ?? null,
            p_replied_at:   p.fields.replied_at   ?? null,
            p_follow_up_at: p.fields.follow_up_at ?? null,
        });

        if (error) {
            console.error('[db.contacts.update]', error);
            throw Errors.contact.updateFailed();
        }
        if (!data) throw Errors.contact.notFound();
        return data as ContactRow;
    }

    async markNotified(id: string): Promise<void> {
        const { error } = await this.client.rpc('mark_contact_notified', { p_id: id });
        if (error) console.error('[db.contacts.markNotified]', error);
    }

    async markNotifyFailed(id: string): Promise<void> {
        const { error } = await this.client.rpc('mark_contact_notify_failed', { p_id: id });
        if (error) console.error('[db.contacts.markNotifyFailed]', error);
    }

    async markAcknowledged(id: string): Promise<void> {
        const { error } = await this.client.rpc('mark_contact_acknowledged', { p_id: id });
        if (error) console.error('[db.contacts.markAcknowledged]', error);
    }

    async markAckFailed(id: string): Promise<void> {
        const { error } = await this.client.rpc('mark_contact_ack_failed', { p_id: id });
        if (error) console.error('[db.contacts.markAckFailed]', error);
    }

    async getStatusCounts(): Promise<StatusCounts> {
        const { data, error } = await this.client.rpc('get_contact_status_counts');

        if (error) {
            console.error('[db.contacts.getStatusCounts]', error);
            throw Errors.db.queryFailed();
        }
        return data as StatusCounts;
    }
}




class Analytics {
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    async upsertVisitor(row: VisitorRow): Promise<void> {
        const { error } = await this.client.rpc('upsert_visitor', {
            p_session_id: row.session_id,
            p_device:     row.device,
            p_referrer:   row.referrer   ?? null,
            p_site_key:   row.site_key   ?? null,
            p_ip_address: row.ip_address ?? null,
            p_country:    row.country    ?? null,
        });

        if (error) {
            console.error('[db.analytics.upsertVisitor]', error);
            throw Errors.analytics.insertFailed();
        }
    }

    async insertClick(row: ClickRow): Promise<void> {
        const { error } = await this.client.rpc('insert_analytics_click', {
            p_session_id: row.session_id,
            p_event:      row.event,
            p_section:    row.section,
            p_target:     row.target,
            p_external:   row.external,
            p_page:       row.page       ?? null,
            p_site_key:   row.site_key   ?? null,
            p_ip_address: row.ip_address ?? null,
            p_country:    row.country    ?? null,
        });

        if (error) {
            console.error('[db.analytics.insertClick]', error);
            throw Errors.analytics.insertFailed();
        }
    }

    async fetchSummary(filters: AnalyticsFilters = {} as AnalyticsFilters): Promise<Record<string, unknown>> {
        const { data, error } = await this.client.rpc('get_analytics_summary', {
            p_from: filters.from ?? null,
            p_to:   filters.to   ?? null,
        });

        if (error) {
            console.error('[db.analytics.fetchSummary]', error);
            throw Errors.analytics.queryFailed();
        }
        return data as Record<string, unknown>;
    }

    async fetchDailyTrend(filters: AnalyticsFilters = {} as AnalyticsFilters): Promise<unknown[]> {
        const { data, error } = await this.client.rpc('get_analytics_daily_trend', {
            p_from: filters.from ?? null,
            p_to:   filters.to   ?? null,
        });

        if (error) {
            console.error('[db.analytics.fetchDailyTrend]', error);
            throw Errors.analytics.queryFailed();
        }
        return (data ?? []) as unknown[];
    }

    async fetchVisitorRaw(filters: AnalyticsFilters = {} as AnalyticsFilters): Promise<{ rows: unknown[]; total: number }> {
        const page  = Math.max(1,   filters.page  ?? 1);
        const limit = Math.min(100, filters.limit ?? 50);

        const { data, error } = await this.client.rpc('list_analytics_visitors', {
            p_from:  filters.from ?? null,
            p_to:    filters.to   ?? null,
            p_page:  page,
            p_limit: limit,
        });

        if (error) {
            console.error('[db.analytics.fetchVisitorRaw]', error);
            throw Errors.analytics.queryFailed();
        }
        const result = data as { rows: unknown[]; total: number };
        return { rows: result.rows ?? [], total: result.total ?? 0 };
    }

    async fetchClickRaw(filters: AnalyticsFilters = {} as AnalyticsFilters): Promise<{ rows: unknown[]; total: number }> {
        const page  = Math.max(1,   filters.page  ?? 1);
        const limit = Math.min(100, filters.limit ?? 50);

        const { data, error } = await this.client.rpc('list_analytics_clicks', {
            p_from:  filters.from ?? null,
            p_to:    filters.to   ?? null,
            p_page:  page,
            p_limit: limit,
        });

        if (error) {
            console.error('[db.analytics.fetchClickRaw]', error);
            throw Errors.analytics.queryFailed();
        }
        const result = data as { rows: unknown[]; total: number };
        return { rows: result.rows ?? [], total: result.total ?? 0 };
    }
}



class Templates {
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    async getBoth(category: ContactCategory): Promise<BothTemplates> {
        const [notif, ack] = await Promise.all([
            this.getOne({ category, type: 'notification' }),
            this.getOne({ category, type: 'acknowledgement' }),
        ]);
        return { notification: notif, acknowledgement: ack };
    }

    async getOne(p: { category: ContactCategory; type: EmailType }): Promise<EmailTemplate> {
        const { data, error } = await this.client.rpc('get_email_template_by_category_type', {
            p_category: p.category,
            p_type:     p.type,
        });

        if (error) {
            console.error('[db.templates.getOne]', { ...p }, error);
            throw Errors.email.templateNotFound(p.category, p.type);
        }
        if (!data) throw Errors.email.templateNotFound(p.category, p.type);
        return data as EmailTemplate;
    }

    async getTemplates(filters: TemplateFilters): Promise<EmailTemplate[]> {
        const { data, error } = await this.client.rpc('list_email_templates', {
            p_category: filters.category ?? null,
            p_type:     filters.type     ?? null,
        });

        if (error) {
            console.error('[db.templates.listAll]', error);
            throw Errors.db.queryFailed();
        }
        return (data ?? []) as EmailTemplate[];
    }

    async getById(id: string): Promise<EmailTemplate> {
        const { data, error } = await this.client.rpc('get_email_template_by_id', { p_id: id });

        if (error) {
            console.error('[db.templates.getById]', error);
            throw Errors.db.queryFailed();
        }
        if (!data) throw Errors.email.templateNotFound('unknown', 'unknown');
        return data as EmailTemplate;
    }

    async update(
        p: { id: string; fields: { subject?: string; html_body?: string } }
    ): Promise<EmailTemplate> {
        const { data, error } = await this.client.rpc('update_email_template', {
            p_id:        p.id,
            p_subject:   p.fields.subject   ?? null,
            p_html_body: p.fields.html_body ?? null,
        });

        if (error) {
            console.error('[db.templates.update]', error);
            throw Errors.db.queryFailed();
        }
        if (!data) throw Errors.email.templateNotFound('unknown', 'unknown');
        return data as EmailTemplate;
    }

    async create(
        fields: { category: string; type: string; subject: string; html_body: string; text_body: string }
    ): Promise<EmailTemplate> {
        const { data, error } = await this.client.rpc('insert_email_template', {
            p_category:  fields.category,
            p_type:      fields.type,
            p_subject:   fields.subject,
            p_html_body: fields.html_body,
            p_text_body: fields.text_body,
        });

        if (error) {
            console.error('[db.templates.create]', error);
            const pgError = PGErrorMap[error.message];
            if (pgError) throw pgError();
            throw Errors.db.queryFailed();
        }
        if (!data) throw Errors.db.queryFailed();
        return data as EmailTemplate;
    }
}



class OutboundEmails {
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    async insert(params: {
        email_type:  string;
        recipient:   string;
        subject:     string;
        caller:      'trigger' | 'manual';
        html_body?:  string | null;
        text_body?:  string | null;
        contact_id?: string | null;
        provider?:   string;
    }): Promise<OutboundEmailRow> {
        const { data, error } = await this.client.rpc('insert_outbound_email', {
            p_email_type: params.email_type,
            p_recipient:  params.recipient,
            p_subject:    params.subject,
            p_caller:     params.caller,
            p_html_body:  params.html_body  ?? null,
            p_text_body:  params.text_body  ?? null,
            p_contact_id: params.contact_id ?? null,
            p_provider:   params.provider,
        });

        if (error || !data) {
            console.error('[db.outbound.insert]', error);
            throw Errors.db.queryFailed();
        }
        return data as OutboundEmailRow;
    }

    async updateStatus(p: { id: string; status: 'sent' | 'failed'; error_message?: string | null }): Promise<void> {
        const { error } = await this.client.rpc('update_outbound_email_status', {
            p_id:     p.id,
            p_status: p.status,
            p_error:  p.error_message ?? null,
        });

        if (error) console.error('[db.outbound.updateStatus]', error);
    }

    async list(filters: OutboundEmailFilters = {}): Promise<{ rows: OutboundEmailRow[]; total: number }> {
        const page  = Math.max(1,   filters.page  ?? 1);
        const limit = Math.min(100, filters.limit ?? 20);

        const { data, error } = await this.client.rpc('list_outbound_emails', {
            p_contact_id: filters.contact_id ?? null,
            p_status:     filters.status     ?? null,
            p_email_type: filters.email_type ?? null,
            p_recipient:  filters.recipient  ?? null,
            p_from:       filters.from       ?? null,
            p_to:         filters.to         ?? null,
            p_page:       page,
            p_limit:      limit,
        });

        if (error) {
            console.error('[db.outbound.list]', error);
            throw Errors.db.queryFailed();
        }

        const result = data as { rows: OutboundEmailRow[]; total: number };
        return {
            rows:  result.rows  ?? [],
            total: result.total ?? 0,
        };
    }
}



class Config {
    private readonly client: SupabaseClient;

    constructor(client: SupabaseClient) {
        this.client = client;
    }

    async insert(p: { key: string; value: string }): Promise<BrandConfig> {
        const { data, error } = await this.client.rpc('insert_config', {
            p_key: p.key, p_value: p.value,
        });

        if (error) {
            const pgError = PGErrorMap[error.message];
            if (pgError) throw pgError();
            console.error('[db.config.insert] Failed. Details:', error.message);
            throw Errors.db.queryFailed();
        }

        return data[0] as BrandConfig;
    }

    async get(keys: string[]): Promise<BrandConfig[]> {
        const { data, error } = await this.client.rpc('get_brand_config', { p_keys: keys });

        if (error) {
            console.error('[db.config.get]', error);
            throw Errors.db.queryFailed();
        }

        const map: BrandConfig[] = (data ?? []) as BrandConfig[];

        keys.forEach(key => {
            const config = map.find(some => some.key === key) ?? null;
            if (!config) throw Errors.config.missing(key);
            if (
                config.value.startsWith('REPLACE_WITH_') ||
                config.value.includes('YOUR_') ||
                config.value === ''
            ) {
                throw Errors.config.invalid(key);
            }
        });

        return map;
    }

    async getOne(key: string): Promise<BrandConfig> {
        const map = await this.get([key]);
        return map[0] as BrandConfig;
    }

    async listAll(filters: { keys: string[]; last_updated: string | null }): Promise<BrandConfig[]> {
        const { data, error } = await this.client.rpc('list_brand_config', {
            p_keys:         filters.keys         ?? null,
            p_last_updated: filters.last_updated ?? null,
        });

        if (error) {
            console.error('[db.config.listAll]', error);
            throw Errors.db.queryFailed();
        }
        return (data ?? []) as BrandConfig[];
    }

    async updateOne(p: { key: string; value: string }): Promise<BrandConfig> {
        const { data, error } = await this.client.rpc('update_brand_config', {
            p_key:   p.key,
            p_value: p.value,
        });

        if (error) {
            const pgError = PGErrorMap[error.message];
            if (pgError) throw pgError();
            console.error('[db.config.updateOne]', error.message);
            throw Errors.db.queryFailed();
        }

        return data[0] as BrandConfig;
    }

    async delete(key: string): Promise<void> {
        const { error } = await this.client.rpc('delete_config', { p_key: key });
        if (error) {
            const pgError = PGErrorMap[error.message];
            if (pgError) throw pgError();
            console.error('[db.config.delete] failed. Details:', error.message);
            throw Errors.db.queryFailed();
        }
    }
}



class Database {
    readonly auth:      Auth;
    readonly contacts:  Contacts;
    readonly analytics: Analytics;
    readonly templates: Templates;
    readonly outbound:  OutboundEmails;
    readonly config:    Config;

    constructor(url: string, key: string) {
        if (!url || !key) {
            console.error('[Database] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.');
        }
        const client      = createClient(url, key);
        this.auth         = new Auth(client);
        this.contacts     = new Contacts(client);
        this.analytics    = new Analytics(client);
        this.templates    = new Templates(client);
        this.outbound     = new OutboundEmails(client);
        this.config       = new Config(client);
    }
}


// ── Singleton export ──────────────────────────────────────────────────────────

export const db = new Database(
    Deno.env.get('SUPABASE_URL')              ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);
