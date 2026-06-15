/**
 * _shared/types.ts
 *
 * Centralised TypeScript type definitions for the entire Edge Function layer.
 * Every interface, enum-equivalent type, and domain type lives here.
 * Import from this file — never define types inline outside this file.
 */


// ── Contact types ──────────────────────────────────────────────────────────────

export type ContactStatus   = 'new' | 'read' | 'replied' | 'follow_up';
export type ContactCategory = 'new-website' | 'fix-website' | 'book-call' | 'project-question' | 'other';

export interface NewContactPayload {
    name:        string;
    email:       string;
    message:     string;
    category:    ContactCategory;
    page?:       string | null;
    site_key?:   string | null;
    session_id?: string | null;
    ip_address?: string | null;
    country?:    string | null;
}

export interface ContactFilters {
    status?:   ContactStatus;
    category?: string;
    from?:     string;
    to?:       string;
    page?:     number;
    limit?:    number;
}

export interface ContactRow {
    id:               string;
    name:             string;
    email:            string;
    message:          string;
    category:         ContactCategory;
    page?:            string | null;
    site_key?:        string | null;
    session_id:       string;
    ip_address?:      string | null;
    country?:         string | null;
    status:           ContactStatus;
    notified_at?:     string | null;
    acknowledged_at?: string | null;
    read_at?:         string | null;
    replied_at?:      string | null;
    follow_up_at?:    string | null;
    created_at?:      string;
}


export interface ContactUpdateFields {
    status?:       ContactStatus;
    read_at?:      string | null;
    replied_at?:   string | null;
    follow_up_at?: string | null;
}

export interface StatusCounts {
    new:       number;
    read:      number;
    replied:   number;
    follow_up: number;
    total:     number;
}


// ── Analytics types ────────────────────────────────────────────────────────────

export type DeviceType = 'mobile' | 'desktop';
export type ClickEvent = "brand" | "navigation" | "cta" | "images" | "contact" | "project" | "form" | "footer" | "social";
export type AnalyticsView = 'summary' | 'trend' | 'raw';
export type AnalyticsTable = 'analytics_visitors' | 'analytics_clicks';

export interface VisitorRow {
    session_id:  string;
    device:      DeviceType;
    referrer?:   string | null;
    site_key?:   string | null;
    ip_address?: string | null;
    country?:    string | null;
    frequency?:  number | null;
    last_seen_at: string | null;
    created_at?: string | null;
}

export interface ClickRow {
    id?:         string | null;
    session_id:  string;
    event:       string;
    section:     string;
    target:      string;
    external:    boolean;
    page?:       string | null;
    site_key?:   string | null;
    ip_address?: string | null;
    country?:    string | null;
    created_at?: string | null;
}

export interface AnalyticsFilters {
    view:   AnalyticsView;
    table:  AnalyticsTable;
    from?:  string | undefined;
    to?:    string | undefined;
    page?:  number;
    limit?: number;
}


// ── Email types ────────────────────────────────────────────────────────────────

export type EmailType     = 'notification' | 'acknowledgement' | 'reply' | 'follow_up' | 'standalone';
export type EmailSendType = 'notification' | 'acknowledgement' | 'reply' | 'follow_up' | 'both' | 'standalone';
export type OutboundStatus = 'pending' | 'sent' | 'failed';

export interface EmailTemplate {
    id:        string;
    category:  ContactCategory;
    type:      EmailType;
    subject:   string;
    html_body: string;
    text_body: string | null;
    updated_at?: string;
}

export interface BothTemplates {
    notification:    EmailTemplate;
    acknowledgement: EmailTemplate;
}

export interface OutboundEmailRow {
    id:             string;
    contact_id?:    string | null;
    email_type:     EmailType;
    recipient:      string;
    subject:        string;
    html_body?:     string | null;
    text_body?:     string | null;
    caller:         'trigger' | 'manual';
    status:         OutboundStatus;
    sent_at?:       string | null;
    failed_at?:     string | null;
    error_message?: string | null;
    retry_count:    number;
    provider:       string;
    created_at:     string;
}

export interface OutboundEmailFilters {
    contact_id?:  string;
    status?:      OutboundStatus;
    email_type?:  EmailType;
    recipient?:   string | null;
    from?:        string | null;
    to?:          string | null;
    page?:        number;
    limit?:       number;
}


// ── Email service types ────────────────────────────────────────────────────────

export interface EmailPayload {
    caller:      'trigger' | 'manual';
    email_type:  EmailType;
    recipient:   string;
    subject:     string;
    html_body?:  string;
    text_body?:  string;
    sender_name: string;
    reply_to:    string;
    contact_id?: string | null;
    outbound_id?: string | null;
}

export interface EmailResult {
    success:     boolean;
    type:        string;
    contact_id?: string;
    error?:      string;
}

export interface IEmailTransport {
    readonly name: string;
    send(payload: EmailPayload): Promise<EmailResult>;
}


// ── Config types ───────────────────────────────────────────────────────────────

export interface BrandConfig {
    key:        string;
    value:      string;
    updated_at: string;
}

export interface WebhookTriggerPayload {
    id:                 string;
    name:               string;
    email:              string;
    message:            string;
    category:           ContactCategory;
    page?:              string | null;
    session_id:         string;
    country?:           string | null;
    created_at:         string;
}

export interface ManualEmailPayload {
    is_standalone: boolean;
    is_custom:     boolean;
    email_type:    EmailSendType;
    contact_id?:   string;
    recipient?:    string;
    subject?:      string;
    html_body?:    string;
    text_body?:    string;
}

export interface TemplateFilters {
    category?:  ContactCategory | null;
    type?:      EmailType | null;
}


/**
 * TemplateData — flat key→value map used for {{placeholder}} substitution in
 * email templates. The named fields document the well-known contact and brand
 * keys; the index signature allows additional dynamic keys loaded from
 * brand_config at runtime so new placeholders in templates resolve automatically.
 */
export interface TemplateData {
    // Contact fields
    name:           string;
    first_name:     string;
    category_label: string;
    email:          string;
    message:        string;
    received_at:    string;
    page:           string;

    // Dynamic brand config fields (fetched from brand_config at runtime)
    [key: string]: string;
}

export type UserRole = 'admin' | 'user';
export type AccountStatus = 'active' | 'disabled' | 'banned' | 'suspended';


export interface User {
    id:                 string;
    name:               string;
    email:              string;
    role:               UserRole;
    status:             AccountStatus;
    last_signin_at:     string;
    created_at:         string;
}

export interface Session {
    id:              string;
    user_id:         string;
    token:           string;
    is_active:       boolean;
    ip_address?:     string | null;
    user_agent?:     string | null;
    expires_at:      string;
    last_seen_at:    string;
    created_at:      string;
}

export interface SessionUser {
    session: Session;
    user:    User;
}
